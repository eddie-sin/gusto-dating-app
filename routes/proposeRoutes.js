const express = require("express");
const router = express.Router();
const proposeController = require("../controllers/proposeControllers");
const { protect } = require("../controllers/authControllers"); // existing user auth
const adminController = require("../controllers/adminControllers"); // for protectAdmin

// Admin endpoints (protected with admin token)
router.get("/", adminController.protectAdmin, proposeController.getAllProposes);
router.get("/count", adminController.protectAdmin, proposeController.getProposeCount);

// Create propose to :targetId (user)
router.post("/:targetId", protect, proposeController.createPropose);

// Cancel propose (only proposer, only after 24h)
router.delete("/:proposeId", protect, proposeController.cancelPropose);

// Respond (accept / deny) — only target can call
router.patch("/:proposeId/respond", protect, proposeController.respondPropose);

// Lists for user (sent/received)
router.get("/sent", protect, proposeController.getSentProposes);
router.get("/received", protect, proposeController.getReceivedProposes);

module.exports = router;
