const Match = require("../models/matchModel");
const catchAsync = require("../utils/catchAsync");

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
