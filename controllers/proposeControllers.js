const Propose = require("../models/proposeModel");
const Match = require("../models/matchModel");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// Myanmar 12AM reset helper
const resetMyanmarMidnight = () => {
  const mmNow = new Date().toLocaleString("en-US", { timeZone: "Asia/Yangon" });
  const d = new Date(mmNow);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Create a new propose (POST /api/v1/proposes/:targetId)
exports.createPropose = catchAsync(async (req, res, next) => {
  const fromId = req.user.id;
  const targetId = req.params.targetId;

  //1. Prevent Proposing Yourself
  if (fromId === targetId) {
    return next(new AppError("You cannot propose yourself", 400));
  }

  //2. Prevent Proposing Not-Existed Users
  const [fromUser, toUser] = await Promise.all([
    User.findById(fromId),
    User.findById(targetId),
  ]);

  if (!fromUser || !toUser) {
    return next(new AppError("User not found", 404));
  }

  //3. Prevent Proposing Not-Approved User
  if (toUser.status !== "approved" || fromUser.status !== "approved") {
    return next(new AppError("Both users must be approved", 400));
  }

  //4. Prevent Duplicate Propose
  const existing = await Propose.findOne({ from: fromId, to: targetId });
  if (existing) {
    return next(new AppError("You already have a proposal for this user", 400));
  }

  //5. Prevent Proposing Denies
  //   a. prevent proposing denied user again
  //   b. prevent proposing the user who denied you
  const eitherDenied = await Propose.findOne({
    $or: [
      { from: fromId, to: targetId, status: "denied" },
      { from: targetId, to: fromId, status: "denied" },
    ],
  });
  if (eitherDenied) {
    return next(
      new AppError(
        "Proposals between you and this user are permanently blocked",
        403
      )
    );
  }

  // ---- ✅ RESET DAILY COUNT IF NEW DAY (Myanmar 12AM) ----
  const nowMM = new Date().toLocaleString("en-US", { timeZone: "Asia/Yangon" }); //output: "11/10/2025, 1:00 AM"
  const lastResetMM = new Date(fromUser.lastProposeReset).toLocaleString(
    "en-US",
    { timeZone: "Asia/Yangon" }
  );

  const todayDay = new Date(nowMM).toDateString(); //"Sun Nov 09 2025"
  const lastResetDay = new Date(lastResetMM).toDateString();

  //if a day or more has passed, --> RESET
  if (todayDay !== lastResetDay) {
    fromUser.dailyProposeCount = 0;
    fromUser.lastProposeReset = resetMyanmarMidnight();
  }

  //6. Prevent Proposing More Than 2 Users A Day
  if (fromUser.dailyProposeCount >= 2) {
    return next(new AppError("Daily propose limit reached (2 per day)", 403));
  }

  // ----  CREATE PROPOSE ----
  const propose = await Propose.create({
    from: fromId,
    to: targetId,
    status: "pending",
  });

  // ---- INCREMENT COUNT & SAVE ----
  fromUser.dailyProposeCount += 1;
  await fromUser.save();

  res.status(201).json({ status: "success", data: propose });
});

// Cancel propose (only after 24h) - DELETE /api/v1/proposes/:proposeId
exports.cancelPropose = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const proposeId = req.params.proposeId;

  //1. Prevent Canceling Non-Existing Propose
  const propose = await Propose.findById(proposeId);
  if (!propose) return next(new AppError("Proposal not found", 404));

  //2. Prevent Other People from Canceling Your Propose
  if (propose.from.toString() !== userId) {
    return next(
      new AppError("Only the proposer can cancel this proposal", 403)
    );
  }

  //*3. Prevent Canceling Accepted Propose (Match)
  if (propose.status == "accepted") {
    return next(new AppError("You cannot cancel a match", 403));
  }

  //*4. Prevent Canceling Within First 24 Hours
  const hours =
    (Date.now() - new Date(propose.createdAt).getTime()) / (1000 * 60 * 60);
  if (hours < 24) {
    return next(new AppError("You can cancel only after 24 hours", 403));
  }

  await propose.deleteOne();

  res.status(200).json({ status: "success", message: "Proposal cancelled" });
});

// Respond to propose (accept/deny)
exports.respondPropose = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const proposeId = req.params.proposeId;
  const { action } = req.body;

  //1. Check If There Is Any Response
  if (!["accept", "deny"].includes(action)) {
    return next(new AppError("Invalid action. Use 'accept' or 'deny'", 400));
  }

  //2. Check If The Proposal Exits
  const propose = await Propose.findById(proposeId);
  if (!propose) return next(new AppError("Proposal not found", 404));

  //3. Make Sure that Only the Target User Can Respond
  if (propose.to.toString() !== userId) {
    return next(new AppError("Only the target user can respond", 403));
  }

  //4. Only the Proposal In Pending Stage can Be Responsed
  if (propose.status !== "pending") {
    return next(
      new AppError("This proposal has already been responded to", 400)
    );
  }

  //DENY CASE
  if (action === "deny") {
    propose.status = "denied";
    await propose.save();
    return res.status(200).json({ status: "success", data: propose });
  }

  //ACCEPT CASE
  propose.status = "accepted";
  await propose.save();

  const pair = [propose.from.toString(), propose.to.toString()].sort();
  const match = await Match.create({ users: pair });

  return res.status(200).json({ status: "success", data: { propose, match } });
});

exports.getSentProposes = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const proposals = await Propose.find({
    from: userId,
    status: { $in: ["pending", "denied"] },
  })
    .populate("to", "nickname age gender bio photos")
    .sort({ createdAt: -1 });

  res
    .status(200)
    .json({ status: "success", results: proposals.length, data: proposals });
});

exports.getReceivedProposes = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const proposals = await Propose.find({
    to: userId,
    status: "pending",
  })
    .populate("from", "nickname age gender bio photos")
    .sort({ createdAt: -1 });

  res
    .status(200)
    .json({ status: "success", results: proposals.length, data: proposals });
});

// GET /api/v1/proposes  -> list all (admin)
exports.getAllProposes = catchAsync(async (req, res, next) => {
  // Optionally support basic pagination later (skip/limit)
  const proposes = await Propose.find().sort({ createdAt: -1 });
  res.status(200).json({ status: "success", results: proposes.length, data: proposes });
});

// GET /api/v1/proposes/count -> { count: N } (admin)
exports.getProposeCount = catchAsync(async (req, res, next) => {
  const count = await Propose.countDocuments();
  res.status(200).json({ status: "success", data: { count } });
});
