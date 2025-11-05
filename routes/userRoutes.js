const express = require("express");
const authController = require("../controllers/authControllers");

const router = express.Router();

/* ============================================================
   AUTHENTICATION ROUTES
   ============================================================ */

// Register new user
router.post("/signup", authController.signup);

// Login existing user
router.post("/login", authController.login);

// Protect all routes that come after this middleware
router.use(authController.protect);

// Update password (must be logged in)
router.patch("/updatePassword", authController.updatePassword);

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
