const express = require("express");
const adminController = require("../controllers/adminControllers");

const router = express.Router();

/* ---------------- Admin Login ---------------- */
router.post("/login", adminController.login);

/* ---------------- Protected Admin Routes ---------------- */
router.use(adminController.protectAdmin);

// Get all pending users
router.get("/pending-users", adminController.getPendingUsers);

// Approve a user
router.patch("/approve/:id", adminController.approveUser);

// Reject a user
router.patch("/reject/:id", adminController.rejectUser);

module.exports = router;
