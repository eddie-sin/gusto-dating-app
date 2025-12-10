const Match = require("../models/matchModel");
const catchAsync = require("../utils/catchAsync");
const User = require("../models/userModel");

// GET /api/v1/matches -> list all matches
exports.getAllMatches = catchAsync(async (req, res, next) => {
  const matches = await Match.find().sort({ createdAt: -1 });
  res.status(200).json({ status: "success", results: matches.length, data: matches });
});

// GET /api/v1/matches/count -> count only
exports.getMatchCount = catchAsync(async (req, res, next) => {
  const count = await Match.countDocuments();
  res.status(200).json({ status: "success", data: { count } });
});

// GET /api/v1/matches/me -> matches for the logged‑in user
exports.getMyMatches = catchAsync(async (req, res, next) => {
  const myId = req.user.id;
  // Find match docs where the current user is in the users array
  const matches = await Match.find({ users: myId })
    .populate({
      path: 'users',
      select: 'nickname age gender bio hobbies heightFt heightIn zodiac mbti photos contact program batch',
      match: { _id: { $ne: myId } }, // exclude self
    });

  // Flatten to the other user in each match
  const partners = matches
    .map(m => m.users.find(u => u._id.toString() !== myId))
    .filter(Boolean);

  res.status(200).json({ status: 'success', data: partners });
});
