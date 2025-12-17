const Crush = require("../models/crhModel");
const User = require("../models/userModel");
const Match = require("../models/matchModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// Myanmar 12AM reset helper
const resetMyanmarMidnight = () => {
  const mmNow = new Date().toLocaleString("en-US", { timeZone: "Asia/Yangon" });
  const d = new Date(mmNow);
  d.setHours(0, 0, 0, 0);
  return d;
};

/* ============================
   ADD CRUSH
   POST /api/v1/crushes/:targetId
============================ */
exports.addCrush = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const targetId = req.params.targetId;

  if (userId === targetId) {
    return next(new AppError("You cannot crush yourself", 400));
  }

  const [fromUser, toUser] = await Promise.all([
    User.findById(userId),
    User.findById(targetId),
  ]);

  if (!fromUser || !toUser) {
    return next(new AppError("User not found", 404));
  }

  // ---- DAILY LIMIT: MAX 3 CRUSHES PER DAY (Myanmar time) ----
  const todayStartMM = resetMyanmarMidnight();
  const tomorrowStartMM = new Date(todayStartMM.getTime() + 24 * 60 * 60 * 1000);

  const todayCrushCount = await Crush.countDocuments({
    user: userId,
    createdAt: { $gte: todayStartMM, $lt: tomorrowStartMM },
  });

  if (todayCrushCount >= 3) {
    return next(new AppError("Daily crush limit reached (3 per day)", 403));
  }

  // ---- PREVENT DUPLICATE CRUSH ----
  const existing = await Crush.findOne({ user: userId, target: targetId });
  if (existing) return next(new AppError("You already crushed this user", 400));

  // ---- CREATE CRUSH ----
  const crush = await Crush.create({ user: userId, target: targetId });

  await User.findByIdAndUpdate(targetId, { $inc: { crushCount: 1 } });

  // ---- CHECK RECIPROCAL CRUSH & CREATE MATCH ----
  const reciprocal = await Crush.findOne({ user: targetId, target: userId });
  let match = null;
  let isMatched = false;

  if (reciprocal) {
    match = await Match.findOne({ users: { $all: [userId, targetId] } });
    if (!match) {
      match = await Match.create({ users: [userId, targetId] });
      isMatched = true;
    }
  }

  res.status(201).json({
    status: "success",
    message: "Crush added successfully",
    data: { crush, matchCreated: isMatched, match },
  });
});

/* ============================
   CANCEL CRUSH
   DELETE /api/v1/crushes/:targetId
   Only after 24 hours
============================ */
exports.cancelCrush = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const targetId = req.params.targetId;

  const crush = await Crush.findOne({ user: userId, target: targetId });
  if (!crush) return next(new AppError("Crush not found", 404));

  const hours = (Date.now() - new Date(crush.createdAt).getTime()) / (1000 * 60 * 60);
  if (hours < 24)
    return next(new AppError("You can cancel a crush only after 24 hours", 403));

  await crush.deleteOne();

  await User.findByIdAndUpdate(userId, { $inc: { dailyCrushCount: -1 }, $pull: { myCrushes: targetId } });
  await User.findByIdAndUpdate(targetId, { $inc: { crushCount: -1 } });

  res.status(200).json({ status: "success", message: "Crush canceled" });
});

/* ============================
   GET MY CRUSHES
   GET /api/v1/crushes/my
============================ */
exports.getMyCrushes = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const myCrushes = await Crush.find({ user: userId }).populate("target", "nickname photos");

  res.status(200).json({
    status: "success",
    results: myCrushes.length,
    data: myCrushes.map((c) => c.target),
  });
});

/* ============================
   GET NUMBER OF PEOPLE WHO CRUSHED ME
   GET /api/v1/crushes/me
============================ */
exports.getCrushCount = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const count = await Crush.countDocuments({ target: userId });

  res.status(200).json({
    status: "success",
    crushCount: count,
  });
});

// GET /api/v1/crushes  -> list all (admin)
exports.getAllCrushes = catchAsync(async (req, res, next) => {
  const crushes = await Crush.find().sort({ createdAt: -1 });
  res.status(200).json({ status: "success", results: crushes.length, data: crushes });
});

// GET /api/v1/crushes/count -> { count: N } (admin)
exports.getCrushCountAll = catchAsync(async (req, res, next) => {
  const count = await Crush.countDocuments();
  res.status(200).json({ status: "success", data: { count } });
});

