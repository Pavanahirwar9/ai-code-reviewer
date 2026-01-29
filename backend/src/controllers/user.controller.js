// backend/controllers/user.controller.js
/**
 * User Controller
 * Handles user-related operations
 */

const User = require('../models/User.model');
const Review = require('../models/Review.model');
const { sendSuccess, sendError, asyncHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile
 * @access  Private
 */
exports.getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, user.getPublicProfile(), 'Profile retrieved successfully');
});

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res) => {
    const { name, email } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
    );

    logger.info(`User profile updated: ${user.email}`);

    sendSuccess(res, user.getPublicProfile(), 'Profile updated successfully');
});

/**
 * @route   GET /api/user/dashboard
 * @desc    Get user dashboard data
 * @access  Private
 */
exports.getDashboard = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const reviews = await Review.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('-code');

    const stats = {
        totalReviews: await Review.countDocuments({ userId: req.user._id }),
        completedReviews: await Review.countDocuments({
            userId: req.user._id,
            status: 'completed'
        }),
        failedReviews: await Review.countDocuments({
            userId: req.user._id,
            status: 'failed'
        }),
    };

    const dashboardData = {
        user: user.getPublicProfile(),
        stats,
        recentReviews: reviews.map(r => r.getSummary()),
    };

    sendSuccess(res, dashboardData, 'Dashboard data retrieved successfully');
});

/**
 * @route   POST /api/user/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
exports.uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        return sendError(res, 'User not found', 404);
    }

    // Delete old avatar if exists
    if (user.avatar) {
        const oldAvatarPath = path.join(__dirname, '../../uploads/avatars', path.basename(user.avatar));
        if (fs.existsSync(oldAvatarPath)) {
            fs.unlinkSync(oldAvatarPath);
        }
    }

    // Update user avatar URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    user.avatar = avatarUrl;
    await user.save();

    logger.info(`Avatar uploaded for user: ${user.email}`);

    sendSuccess(res, { avatar: avatarUrl }, 'Avatar uploaded successfully');
});

/**
 * @route   DELETE /api/user/avatar
 * @desc    Delete user avatar
 * @access  Private
 */
exports.deleteAvatar = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return sendError(res, 'User not found', 404);
    }

    // Delete avatar file if exists
    if (user.avatar) {
        const avatarPath = path.join(__dirname, '../../uploads/avatars', path.basename(user.avatar));
        if (fs.existsSync(avatarPath)) {
            fs.unlinkSync(avatarPath);
        }
    }

    // Clear avatar from database
    user.avatar = undefined;
    await user.save();

    logger.info(`Avatar deleted for user: ${user.email}`);

    sendSuccess(res, null, 'Avatar deleted successfully');
});

/**
 * @route   DELETE /api/user/account
 * @desc    Delete user account
 * @access  Private
 */
exports.deleteAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return sendError(res, 'User not found', 404);
    }

    // Delete avatar file if exists
    if (user.avatar) {
        const avatarPath = path.join(__dirname, '../../uploads/avatars', path.basename(user.avatar));
        if (fs.existsSync(avatarPath)) {
            fs.unlinkSync(avatarPath);
        }
    }

    // Delete all user's reviews
    await Review.deleteMany({ userId: req.user._id });

    // Delete user
    await user.deleteOne();

    logger.info(`User account deleted: ${user.email}`);

    sendSuccess(res, null, 'Account deleted successfully');
});
