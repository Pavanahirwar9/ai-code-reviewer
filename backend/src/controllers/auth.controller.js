// backend/controllers/auth.controller.js
/**
 * Authentication Controller
 * Handles user registration, login, and profile management
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Session = require('../models/Session.model');
const { sendSuccess, sendError, asyncHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d',
    });
};

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
    // Log the incoming request for debugging
    logger.info('Registration request received:', {
        body: req.body,
        headers: req.headers['content-type']
    });

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return sendError(res, 'Email already registered', 400);
    }

    // Create user
    const user = await User.create({
        name,
        email,
        password,
    });

    // Store user info in session
    req.session.userId = user._id.toString();
    req.session.email = user.email;
    req.session.isAuthenticated = true;

    // Create session in database
    const sessionToken = generateToken(user._id);
    await Session.create({
        userId: user._id,
        sessionToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        isActive: true,
    });

    // Generate token
    const token = generateToken(user._id);

    logger.info(`New user registered: ${user.email}`);

    sendSuccess(
        res,
        {
            token,
            user: user.getPublicProfile(),
        },
        'User registered successfully',
        201
    );
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return sendError(res, 'Invalid credentials', 401);
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        return sendError(res, 'Invalid credentials', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Store user info in session
    req.session.userId = user._id.toString();
    req.session.email = user.email;
    req.session.isAuthenticated = true;

    // Update or create session in database
    const sessionToken = generateToken(user._id);
    await Session.findOneAndUpdate(
        { userId: user._id, isActive: true },
        {
            sessionToken,
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        },
        {
            upsert: true,
            new: true,
        }
    );

    // Generate token
    const token = generateToken(user._id);

    logger.info(`User logged in: ${user.email}`);

    sendSuccess(res, {
        token,
        user: user.getPublicProfile(),
    }, 'Login successful');
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and destroy session
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    // Mark all active sessions as inactive in database
    await Session.updateMany(
        { userId, isActive: true },
        { isActive: false, lastActivity: new Date() }
    );

    // Destroy express session
    req.session.destroy((err) => {
        if (err) {
            logger.error('Error destroying session:', err);
        }
    });

    // Clear session cookie
    res.clearCookie('connect.sid');

    logger.info(`User logged out: ${userId}`);

    sendSuccess(res, null, 'Logout successful');
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    sendSuccess(res, user.getPublicProfile(), 'User retrieved successfully');
});

/**
 * @route   PUT /api/auth/update
 * @desc    Update user profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res) => {
    const { name, email } = req.body;

    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (email) fieldsToUpdate.email = email;

    const user = await User.findByIdAndUpdate(
        req.user.id,
        fieldsToUpdate,
        { new: true, runValidators: true }
    );

    logger.info(`User profile updated: ${user.email}`);

    sendSuccess(res, user.getPublicProfile(), 'Profile updated successfully');
});

/**
 * @route   PUT /api/auth/password
 * @desc    Update password
 * @access  Private
 */
exports.updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        return sendError(res, 'Current password is incorrect', 401);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password updated for user: ${user.email}`);

    sendSuccess(res, null, 'Password updated successfully');
});
