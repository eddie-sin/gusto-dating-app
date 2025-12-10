const express = require("express");
const router = express.Router();
const crhController = require("../controllers/crhControllers");
const { protect } = require("../controllers/authControllers");
const adminController = require("../controllers/adminControllers");

// Admin endpoints
router.get("/", adminController.protectAdmin, crhController.getAllCrushes);
router.get("/count", adminController.protectAdmin, crhController.getCrushCountAll);

// Add crush (user)
router.post("/:targetId", protect, crhController.addCrush);

// Cancel crush
router.delete("/:targetId", protect, crhController.cancelCrush);

// User endpoints
router.get("/my", protect, crhController.getMyCrushes);
router.get("/me", protect, crhController.getCrushCount);

module.exports = router;
