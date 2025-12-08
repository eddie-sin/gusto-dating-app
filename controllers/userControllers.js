const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// Get all users with optional filtering
exports.getAllUsers = catchAsync(async (req, res, next) => {
    // Build filter object
    const filter = {};
    
    // Filter by status if provided
    if (req.query.status) {
        filter.status = req.query.status;
    }
    
    // Filter by batch if provided
    if (req.query.batch) {
        filter.batch = req.query.batch;
    }
    
    // Filter by program if provided
    if (req.query.program) {
        filter.program = req.query.program;
    }
    
    // Select fields to return (exclude sensitive data)
    const fields = '-password -passwordResetToken -passwordResetExpires -studentIdPhoto';
    
    // Query database
    const users = await User.find(filter).select(fields);
    
    res.status(200).json({
        status: "success",
        results: users.length,
        data: { users }
    });
});

// Get single user by ID
exports.getUser = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id).select('-password -passwordResetToken -passwordResetExpires');
    
    if (!user) {
        return next(new AppError("User not found", 404));
    }
    
    res.status(200).json({
        status: "success",
        data: { user }
    });
});

// Get current user profile
exports.getMe = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('-password -passwordResetToken -passwordResetExpires');
    
    res.status(200).json({
        status: "success",
        data: { user }
    });
});

// Update current user profile
exports.updateMe = catchAsync(async (req, res, next) => {
    // Create error if user tries to update password via this route
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError("This route is not for password updates. Please use /updatePassword.", 400));
    }
    
    // Filter out fields that shouldn't be updated
    const filteredBody = {};
    const allowedFields = ['nickname', 'bio', 'hobbies', 'heightFt', 'heightIn', 'zodiac', 'mbti', 'photos', 'contact'];
    
    Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
            filteredBody[key] = req.body[key];
        }
    });
    
    // Update user document
    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        filteredBody,
        {
            new: true,
            runValidators: true
        }
    ).select('-password -passwordResetToken -passwordResetExpires');
    
    res.status(200).json({
        status: "success",
        data: { user: updatedUser }
    });
});

// Delete current user account (soft delete)
exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { 
        active: false,
        status: 'deleted' 
    });
    
    res.status(204).json({
        status: "success",
        data: null
    });
});

// Admin only: Get user stats (alternative to admin controller)
exports.getUserStats = catchAsync(async (req, res, next) => {
    // Check if user is admin (you need to add an admin field to user model or use separate admin model)
    if (!req.user.isAdmin) {
        return next(new AppError("You do not have permission to perform this action", 403));
    }
    
    const stats = await User.aggregate([
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 }
            }
        }
    ]);
    
    const formattedStats = {
        pending: 0,
        approved: 0,
        rejected: 0
    };
    
    stats.forEach((s) => {
        formattedStats[s._id] = s.count;
    });
    
    res.status(200).json({
        status: "success",
        data: formattedStats
    });
});