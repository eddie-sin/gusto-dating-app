const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { promisify } = require("util");

/* ==========================================
   HELPER FUNCTIONS
========================================== */

// 1. Generate JWT Token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// 2. Create & Send JWT via cookie + response
const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  // Remove sensitive fields before sending
  user.password = undefined;
  user.studentIdPhoto = undefined;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

/* ==========================================
   ROUTE HANDLERS
========================================== */

// SIGNUP — Register new user
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    nickname: req.body.nickname,
    dob: req.body.dob,
    gender: req.body.gender,
    sexuality: req.body.sexuality,
    bio: req.body.bio,
    hobbies: req.body.hobbies,
    heightFt: req.body.heightFt,
    heightIn: req.body.heightIn,
    zodiac: req.body.zodiac,
    mbti: req.body.mbti,

    name: req.body.name,
    batch: req.body.batch,
    contact: req.body.contact,
    photos: req.body.photos,
    studentIdPhoto: req.body.studentIdPhoto,

    username: req.body.username,
    password: req.body.password,

    // status defaults to "pending" automatically
  });

  createAndSendToken(newUser, 201, res);
});

// LOGIN — Authenticate user and send JWT
exports.login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  // 1. Check presence
  if (!username || !password) {
    return next(new AppError("Please provide username and password", 400));
  }

  // 2. Find user + include password
  const user = await User.findOne({ username }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect username or password", 401));
  }

  // 3. Check user status
  if (user.status === "pending") {
    return next(new AppError("Your account is pending approval by admin.", 403));
  }

  if (user.status === "rejected") {
    return next(new AppError("Your account has been rejected by admin.", 403));
  }

  // 4. Login success
  createAndSendToken(user, 200, res);
});

// PROTECT — middleware for protected routes
exports.protect = catchAsync(async (req, res, next) => {
  // 1. Get token from header or cookie
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError("You are not logged in!", 401));
  }

  // 2. Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError("User no longer exists", 401));
  }

  // 4. Check if password changed after token issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("Password recently changed. Please log in again.", 401)
    );
  }

  // ✅ Grant access
  req.user = currentUser;
  next();
});

// UPDATE PASSWORD — While logged in
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // 1. Get current user (already logged in from protect)
  const user = await User.findById(req.user.id).select("+password");

  // 2. Check current password validity
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError("Incorrect current password", 401));
  }

  // 3. Set new password
  user.password = newPassword;
  await user.save({ validateModifiedOnly: true });

  // 4. Send new token
  createAndSendToken(user, 200, res);
});
