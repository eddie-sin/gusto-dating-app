const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const uploadToImageKit = require("../utils/uploadToImageKit");
const { promisify } = require("util");

/* ==========================================
   HELPER FUNCTIONS
========================================== */

// Generate JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Send JWT via cookie + response
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

  // Remove sensitive fields
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
  const tempFiles = [];
  let photoUrls = [];
  let studentIdPhotoUrl = null;

  try {
    // Handle photo uploads (3-5 photos required)
    if (req.files?.photos?.length > 0) {
      if (req.files.photos.length < 3 || req.files.photos.length > 5) {
        return next(new AppError("Please upload between 3 and 5 photos", 400));
      }

      const rawUsername = (req.body.username || "").toString().trim().toLowerCase();
      const userSegment = rawUsername.replace(/[^a-z0-9._-]/g, "_") || `user_${Date.now()}`;
      const baseFolder = `/gusto/users/${userSegment}`;
      const photosFolder = `${baseFolder}/photos`;

      const uploadPromises = req.files.photos.map(async (file, idx) => {
        tempFiles.push(file.path);
        const fileName = `photo_${Date.now()}_${Math.random()}_${idx}${path.extname(file.originalname)}`;
        return await uploadToImageKit(file.path, fileName, photosFolder);
      });

      photoUrls = await Promise.all(uploadPromises);
    } else if (req.body.photos) {
      // Backward compatibility: if photos provided as array of objects with fileId/url
      const parsedPhotos = typeof req.body.photos === "string" ? JSON.parse(req.body.photos) : req.body.photos;
      if (Array.isArray(parsedPhotos) && parsedPhotos.every(p => p.fileId && p.url)) {
        photoUrls = parsedPhotos;
      } else {
        return next(new AppError("Invalid photos format. Expected array of {fileId, url} objects", 400));
      }
    } else {
      return next(new AppError("Please upload between 3 and 5 photos", 400));
    }

    // Handle student ID photo
    if (req.files?.studentIdPhoto?.length > 0) {
  const rawUsername2 = (req.body.username || "").toString().trim().toLowerCase();
  const userSegment2 = rawUsername2.replace(/[^a-z0-9._-]/g, "_") || `user_${Date.now()}`;
  const baseFolder2 = `/gusto/users/${userSegment2}`;
  const idFolder = `${baseFolder2}/studentID`;
  const file = req.files.studentIdPhoto[0];
  tempFiles.push(file.path);
  const fileName = `studentId_${Date.now()}_${Math.random()}${path.extname(file.originalname)}`;
  studentIdPhotoUrl = await uploadToImageKit(file.path, fileName, idFolder);
    } else if (req.body.studentIdPhoto) {
      // Backward compatibility: if studentIdPhoto provided as object with fileId/url
      const parsed = typeof req.body.studentIdPhoto === "string" ? JSON.parse(req.body.studentIdPhoto) : req.body.studentIdPhoto;
      if (parsed && parsed.fileId && parsed.url) {
        studentIdPhotoUrl = parsed;
      } else {
        return next(new AppError("Invalid studentIdPhoto format. Expected {fileId, url} object", 400));
      }
    } else {
      return next(new AppError("Student ID photo is required", 400));
    }

    // Parse hobbies
    let hobbies = [];
    if (req.body.hobbies) {
      hobbies = typeof req.body.hobbies === "string" ? JSON.parse(req.body.hobbies) : req.body.hobbies;
      if (!Array.isArray(hobbies)) hobbies = [hobbies];
    }

    // Parse height
    const heightFt = req.body.heightFt ? parseInt(req.body.heightFt) : undefined;
    const heightIn = req.body.heightIn ? parseInt(req.body.heightIn) : undefined;

    // Create user
    const newUser = await User.create({
      nickname: req.body.nickname,
      dob: req.body.dob,
      gender: req.body.gender,
      sexuality: req.body.sexuality,
      bio: req.body.bio || "",
      hobbies,
      heightFt,
      heightIn,
      zodiac: req.body.zodiac || "",
      mbti: req.body.mbti || "",
      name: req.body.name,
      batch: req.body.batch,
      contact: req.body.contact,
      photos: photoUrls,
      studentIdPhoto: studentIdPhotoUrl,
      username: req.body.username,
      password: req.body.password,
    });

    // Clean temp files
    await Promise.all(tempFiles.map(f => fs.unlink(f).catch(() => {})));

    createAndSendToken(newUser, 201, res);
  } catch (err) {
    await Promise.all(tempFiles.map(f => fs.unlink(f).catch(() => {})));
    next(err);
  }
});

// LOGIN — Authenticate user
exports.login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) return next(new AppError("Please provide username and password", 400));

  const user = await User.findOne({ username }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect username or password", 401));
  }

  if (user.status === "pending") return next(new AppError("Your account is pending approval by admin.", 403));
  if (user.status === "rejected") return next(new AppError("Your account has been rejected by admin.", 403));

  createAndSendToken(user, 200, res);
});

// PROTECT — middleware
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) token = req.headers.authorization.split(" ")[1];
  else if (req.cookies.jwt) token = req.cookies.jwt;

  if (!token) return next(new AppError("You are not logged in!", 401));

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id).select("+password");
  if (!currentUser) return next(new AppError("User no longer exists", 401));

  if (typeof currentUser.changedPasswordAfter !== "function") {
    return next(new AppError("User model missing changedPasswordAfter method", 500));
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError("Password recently changed. Please log in again.", 401));
  }

  req.user = currentUser;
  next();
});

// UPDATE PASSWORD — logged in users
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select("+password");
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError("Incorrect current password", 401));
  }

  user.password = newPassword;
  await user.save({ validateModifiedOnly: true });

  createAndSendToken(user, 200, res);
});
