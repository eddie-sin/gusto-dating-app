const express = require("express");
const router = express.Router();
const proposeController = require("../controllers/proposeControllers");
const { protect } = require("../controllers/authControllers"); // your auth middleware

// Create propose to :targetId
router.post("/:targetId", protect, proposeController.createPropose);

// Cancel propose (only proposer, only after 24h)
router.delete("/:proposeId", protect, proposeController.cancelPropose);

// Respond (accept / deny) — only target can call
router.patch("/:proposeId/respond", protect, proposeController.respondPropose);

// Lists
router.get("/sent", protect, proposeController.getSentProposes);
router.get("/received", protect, proposeController.getReceivedProposes);

module.exports = router;
