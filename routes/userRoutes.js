const express = require("express");
const authController = require("../controllers/authControllers");
const feedController = require("../controllers/feedControllers");
const imageController = require("../controllers/imageController");
const userController = require("../controllers/userControllers"); // Add this line
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
/* router.use(authController.protect); */

// Update password (must be logged in)
router.patch("/updatePassword", authController.updatePassword);

// Get a chunk (5 profiles) for feed
router.get("/feed/chunk", authController.protect, feedController.getFeedChunk);

// Upload user media (photos + studentIdPhoto) -> stores into ImageKit under gusto/users/{username}/...
router.post(
  "/media/upload",
  uploadSignupFiles,
  imageController.uploadUserMedia
);

/* ============================================================
   PROFILE / USER ACCOUNT ROUTES
   ============================================================ */

// Get all users (with optional status filter - for admin)
router.get("/", authController.protect, userController.getAllUsers);

// Current user profile routes (must come BEFORE generic "/:id")
router.get("/me", authController.protect, userController.getMe);
router.patch("/me", authController.protect, userController.updateMe);
router.delete("/me", authController.protect, userController.deleteMe);

// Get user by ID (generic route, placed last)
router.get("/:id", authController.protect, userController.getUser);

/* ============================================================
   EXPORT ROUTER
   ============================================================ */
module.exports = router;