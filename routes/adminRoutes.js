const express = require("express");
const adminController = require("../controllers/adminControllers");
const User = require("../models/userModel"); // Add this
const catchAsync = require("../utils/catchAsync"); // Add this

const router = express.Router();

/* ---------------- Admin Login ---------------- */
router.post("/login", adminController.login);

/* ---------------- Protected Admin Routes ---------------- */
router.use(adminController.protectAdmin);

// Get all pending users
router.get("/pending-users", adminController.getPendingUsers);

// Get approved users
router.get("/users/approved", catchAsync(async (req, res, next) => {
    const users = await User.find({ status: "approved" })
        .select("-password -passwordResetToken -passwordResetExpires -studentIdPhoto");
    
    res.status(200).json({
        status: "success",
        results: users.length,
        data: { users }
    });
}));

// Get rejected users
router.get("/users/rejected", catchAsync(async (req, res, next) => {
    const users = await User.find({ status: "rejected" })
        .select("-password -passwordResetToken -passwordResetExpires -studentIdPhoto");
    
    res.status(200).json({
        status: "success",
        results: users.length,
        data: { users }
    });
}));

// Get all users
router.get("/users/all", catchAsync(async (req, res, next) => {
    const users = await User.find()
        .select("-password -passwordResetToken -passwordResetExpires -studentIdPhoto");
    
    res.status(200).json({
        status: "success",
        results: users.length,
        data: { users }
    });
}));

// Get user by ID
router.get("/users/:id", catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id)
        .select("-password -passwordResetToken -passwordResetExpires -studentIdPhoto");
    
    if (!user) {
        return res.status(404).json({
            status: "error",
            message: "User not found"
        });
    }
    
    res.status(200).json({
        status: "success",
        data: { user }
    });
}));

// Approve a user
router.patch("/approve/:id", adminController.approveUser);

// Reject a user
router.patch("/reject/:id", adminController.rejectUser);

// User statistics
router.get("/stats", adminController.getUserStats);

module.exports = router;