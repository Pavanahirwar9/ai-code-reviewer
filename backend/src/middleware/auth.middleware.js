// backend/middleware/auth.middleware.js
/**
 * Authentication middleware
 * Verifies JWT tokens and attaches user to request
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Session = require('../models/Session.model');
const { sendError } = require('../utils/responseHandler');

/**
 * Protect routes - verify JWT token
 */
exports.protect = async (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
        return sendError(res, 'Not authorized to access this route', 401);
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token (support both 'id' and 'userId' for backwards compatibility)
        const userId = decoded.userId || decoded.id;
        const user = await User.findById(userId);

        if (!user) {
            return sendError(res, 'User not found', 404);
        }

        // Update session lastActivity
        Session.findOneAndUpdate(
            { userId: user._id, isActive: true },
            { lastActivity: new Date() }
        ).catch(err => {
            // Don't fail request if session update fails
            console.error('Session update error:', err);
        });

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        return sendError(res, 'Not authorized to access this route', 401);
    }
};

/**
 * Optional authentication - attach user if token is valid
 * But don't fail if token is missing or invalid
 */
exports.optionalAuth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId || decoded.id;
        const user = await User.findById(userId);
        if (user) {
            req.user = user;
        }
    } catch (error) {
        // Silently fail - just don't attach user
    }

    next();
};

/**
 * Authorize specific roles
 */
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return sendError(res, 'Not authorized', 401);
        }

        if (!roles.includes(req.user.role)) {
            return sendError(
                res,
                `User role '${req.user.role}' is not authorized to access this route`,
                403
            );
        }

        next();
    };
};
