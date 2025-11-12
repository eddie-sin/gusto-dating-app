const express = require("express");
const router = express.Router();
const matchController = require("../controllers/matchControllers");
const { protect } = require("../controllers/authControllers"); // your auth middleware

// Lists
router.get("/", protect, proposeController.getMatches);
router.get("/received", protect, proposeController.getReceivedProposes);

module.exports = router;
