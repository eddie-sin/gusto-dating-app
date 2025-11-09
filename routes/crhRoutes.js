const express = require("express");
const router = express.Router();
const crhController = require("../controllers/crhControllers");
const { protect } = require("../controllers/authControllers"); // your auth middleware

/* ============================
   ADD CRUSH
   POST /api/v1/crushes/:targetId
============================ */
router.post("/:targetId", protect, crhController.addCrush);

/* ============================
   CANCEL CRUSH
   DELETE /api/v1/crushes/:targetId
============================ */
router.delete("/:targetId", protect, crhController.cancelCrush);

/* ============================
   GET MY CRUSHES
   GET /api/v1/crushes/my
============================ */
router.get("/my", protect, crhController.getMyCrushes);

/* ============================
   GET NUMBER OF PEOPLE WHO CRUSHED ME
   GET /api/v1/crushes/me
============================ */
router.get("/me", protect, crhController.getCrushCount);

module.exports = router;
