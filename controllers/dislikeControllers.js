const Dislike = require("../models/dislikeModel");
const User = require("../models/userModel");
const { isNewDay } = require("../utils/dateUtil");

// Like: POST /api/dislike/:targetId
exports.dislikeUser = async (req, res, next) => {
  //Current Login User (who dislikes)
  const user = await User.findById(req.user.id);
  //User (who is disliked)
  const targetId = req.params.targetId;

  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.id === targetId)
    //it is just ha-tha :3 [edge case ha tha]
    return res.status(400).json({ message: "Cannot dislike yourself" });

  // Reset dislike count if new day
  if (isNewDay(user.lastDislikeReset)) {
    user.dislikesUsedToday = 0;
    user.lastDislikeReset = new Date();
  }

  // Check daily limit
  if (user.dislikesUsedToday >= 10) {
    return res.status(403).json({ message: "Daily dislike limit reached" });
  }

  // Prevent duplicate dislike
  const already = await Dislike.findOne({ user: user._id, target: targetId });
  if (already) {
    return res.status(400).json({ message: "You already disliked this user" });
  }

  // Create dislike
  await Dislike.create({ user: user._id, target: targetId });
  user.dislikesUsedToday += 1;
  await user.save();

  res.status(200).json({ message: "User disliked" });
};

exports.removeDislike = async (req, res) => {
  const userId = req.user.id;
  const targetId = req.params.targetId;

  const dislike = await Dislike.findOne({ user: userId, target: targetId });

  if (!dislike) {
    return res.status(404).json({ message: "Dislike not found" });
  }

  // Check if within 24 hours
  const diffHours =
    (Date.now() - dislike.createdAt.getTime()) / (1000 * 60 * 60);
  if (diffHours > 24) {
    return res
      .status(403)
      .json({ message: "Cannot remove dislike after 24 hours" });
  }

  await dislike.deleteOne();

  // Reduce daily count
  const user = await User.findById(userId);
  if (user.dislikesUsedToday > 0) {
    user.dislikesUsedToday -= 1;
    await user.save();
  }

  res.status(200).json({ message: "Dislike removed" });
};

exports.getMyDislikes = async (req, res) => {
  const userId = req.user.id;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  const dislikes = await Dislike.find({
    user: userId,
    createdAt: { $gte: since },
  }).populate("target", "nickname age gender photos");

  res.status(200).json({
    count: dislikes.length,
    data: dislikes,
  });
};
