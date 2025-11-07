const jwt = require("jsonwebtoken");
const Admin = require("../models/adminModel");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// ---------------- Helper Functions ----------------
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

const createSendToken = (admin, statusCode, res) => {
  const token = signToken(admin._id);

  res.status(statusCode).json({
    status: "success",
    token,
    data: { admin: { id: admin._id, username: admin.username } },
  });
};

// ---------------- Admin Login ----------------
exports.login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password)
    return next(new AppError("Please provide username and password", 400));

  // Fetch admin and include password
  const admin = await Admin.findOne({ username }).select("+password");

  if (!admin) return next(new AppError("Incorrect username or password", 401));

  const isCorrect = await admin.correctPassword(password, admin.password);
  if (!isCorrect) return next(new AppError("Incorrect username or password", 401));

  createSendToken(admin, 200, res);
});

// ---------------- Protect Admin Routes ----------------
exports.protectAdmin = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) return next(new AppError("Not logged in as admin", 401));

  const decoded = await jwt.verify(token, process.env.JWT_SECRET);
  const currentAdmin = await Admin.findById(decoded.id);
  if (!currentAdmin) return next(new AppError("Admin no longer exists", 401));

  req.admin = currentAdmin;
  next();
});

// ---------------- Get Pending Users ----------------
exports.getPendingUsers = catchAsync(async (req, res, next) => {
  const users = await User.find({ status: "pending" }).select("name studentIdPhoto contact");
  res.status(200).json({ status: "success", results: users.length, data: { users } });
});

// ---------------- Approve User ----------------
exports.approveUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: "approved", approvedBy: req.admin._id },
    { new: true }
  );
  if (!user) return next(new AppError("User not found", 404));
  res.status(200).json({ status: "success", message: "User approved" });
});

// ---------------- Reject User ----------------
exports.rejectUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: "rejected", approvedBy: req.admin._id },
    { new: true }
  );
  if (!user) return next(new AppError("User not found", 404));
  res.status(200).json({ status: "success", message: "User rejected" });
});
