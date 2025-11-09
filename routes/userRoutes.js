const express = require("express");
const authController = require("../controllers/authControllers");
const feedController = require("../controllers/feedControllers");
const { uploadSignupFiles } = require("../utils/multerConfig");

const router = express.Router();

/* ============================================================
   AUTHENTICATION ROUTES
   ============================================================ */

// Register new user (with file upload middleware)
router.post("/signup", uploadSignupFiles, authController.signup);

// Login existing user
router.post("/login", authController.login);

/* ============================================================
   PROTECTED ROUTES (requires login)
   ============================================================ */
router.use(authController.protect);

// Update password (must be logged in)
router.patch("/updatePassword", authController.updatePassword);

// Get a chunk (5 profiles) for feed
router.get("/feed/chunk", feedController.getFeedChunk);

/* ============================================================
   PROFILE / USER ACCOUNT ROUTES (examples)
   ============================================================ */

// TODO: implement routes like getMe, updateMe, deleteMe
// router.get("/me", authController.getMe);
// router.patch("/me", authController.updateMe);
// router.delete("/me", authController.deleteMe);

/* ============================================================
   EXPORT ROUTER
   ============================================================ */
module.exports = router;
