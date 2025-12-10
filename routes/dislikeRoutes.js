const express = require("express");
const router = express.Router();
const dislikeController = require("../controllers/dislikeControllers");
const authController = require("../controllers/authControllers");

//1. Dislike Someone
router.post(
  "/:targetId",
  authController.protect,
  dislikeController.dislikeUser
);

//2. Remove Dislike
router.delete(
  "/:targetId",
  authController.protect,
  dislikeController.removeDislike
);

//3. View Disklikes
router.get("/my", authController.protect, dislikeController.getMyDislikes);

module.exports = router;
