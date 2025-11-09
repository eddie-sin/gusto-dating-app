const express = require("express");
const imageController = require("../controllers/imageController");

const router = express.Router();

/* ============================================================
   IMAGE ROUTES (Public)
   ============================================================ */

// Get ImageKit authentication parameters for client-side uploads
router.get("/auth", imageController.getImageKitAuth);

module.exports = router;

