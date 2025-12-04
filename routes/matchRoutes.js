const express = require("express");
const router = express.Router();
const matchController = require("../controllers/matchControllers");
const adminController = require("../controllers/adminControllers");
const { protect } = require("../controllers/authControllers");

// Admin endpoints for matches
router.get("/", adminController.protectAdmin, matchController.getAllMatches);
router.get("/count", adminController.protectAdmin, matchController.getMatchCount);

// User endpoint: get matches for the logged‑in user
router.get("/me", protect, matchController.getMyMatches);

module.exports = router;
