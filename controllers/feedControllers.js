const User = require("../models/userModel");
const Dislike = require("../models/dislikeModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// Decide which genders a user should see based on their sexuality
const getAllowedGenders = (sexuality) => {
  if (sexuality === "male") return ["male"];
  if (sexuality === "female") return ["female"];
  if (sexuality === "both") return ["male", "female", "lgbt"];
  return [];
};

exports.getFeedChunk = catchAsync(async (req, res, next) => {
  /* const userId = req.user.id; */
  const userId = "69272da9896f3340881009ec";
  const currentUser = await User.findById(userId);

  if (!currentUser) {
    return next(new AppError("User not found", 404));
  }

  const allowedGenders = getAllowedGenders(currentUser.sexuality);
  console.log(allowedGenders);

  const dislikedUsers = await Dislike.find({ user: currentUser._id }).select(
    "target"
  );

  const dislikedIds = dislikedUsers.map((d) => d.target.toString());

  // 1. Query list of All Possible Users (sexuality | approved)
  const allCandidates = await User.find({
    _id: { $nin: [...dislikedIds, currentUser._id] },
    gender: { $in: allowedGenders },
    status: "approved",
  }).select("_id");

  const totalPossible = allCandidates.length;
  console.log(`totalPossible: ${totalPossible}`);

  //2. Extract all unseen profiles (first case: unseen = totalPossible)
  let unseen = allCandidates.filter(
    (u) => !currentUser.shownProfiles.includes(u._id.toString())
  );

  console.log(`shownProfiles: ${currentUser.shownProfiles.length}`);
  console.log(`allUnseens: ${unseen.length}`);

  // Check if it is time to remove the FIRST HALF of shwonProfiles, so it continues
  if (unseen.length < 5 && currentUser.shownProfiles.length > 0) {
    const half = Math.floor(currentUser.shownProfiles.length / 2);
    currentUser.shownProfiles.splice(0, half);
    await currentUser.save();

    // recalc unseen after shrinking history
    unseen = allCandidates.filter(
      (u) => !currentUser.shownProfiles.includes(u._id.toString())
    );
  }

  // RARE CASE : if the database is too small, only under 5 users to display [shownProfiles.length = 0"]
  if (unseen.length < 5) {
    unseen = allCandidates;
  }

  // 3. Pick 5 random profiles
  const chunk = unseen.sort(() => 0.5 - Math.random()).slice(0, 5);

  // 6️⃣ Save these 5 into shownProfiles history
  currentUser.shownProfiles.push(...chunk.map((u) => u._id.toString()));
  await currentUser.save();

  // 7️⃣ Fetch full user docs to return (exclude sensitive fields)
  const profiles = await User.find({
    _id: { $in: chunk.map((u) => u._id) },
  }).select(
    "nickname age gender bio hobbies heightFt heightIn zodiac mbti photos"
  );

  res.status(200).json({
    status: "success",
    results: profiles.length,
    data: profiles,
  });
});
