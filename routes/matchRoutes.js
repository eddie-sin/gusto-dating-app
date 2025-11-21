const express = require("express");
const router = express.Router();
const matchController = require("../controllers/matchControllers");
const adminController = require("../controllers/adminControllers");

// Admin endpoints for matches
router.get("/", adminController.protectAdmin, matchController.getAllMatches);
router.get("/count", adminController.protectAdmin, matchController.getMatchCount);

module.exports = router;
