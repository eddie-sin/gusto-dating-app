const express = require("express");
const authController = require("../controllers/authControllers");
const feedController = require("../controllers/feedControllers");

const router = express.Router();

/* ============================================================
   AUTHENTICATION ROUTES
   ============================================================ */

// Register new user
router.post("/signup", authController.signup);

// Login existing user
router.post("/login", authController.login);

// Update password (must be logged in)
router.patch(
  "/updatePassword",
  authController.protect,
  authController.updatePassword
);

// Get a chunk (5 profiles)
router.get("/feed/chunk", authController.protect, feedController.getFeedChunk);

/* ============================================================
   PROFILE / USER ACCOUNT ROUTES
   ============================================================ */

//getMe
//updateMe
//deleteMe,..

/* ============================================================
   EXPORT ROUTER
   ============================================================ */
module.exports = router;
