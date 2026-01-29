// backend/middleware/rateLimit.middleware.js
/**
 * Rate limiting middleware
 * Prevents abuse and DDoS attacks
 */

const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 requests per window
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later',
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    skipSuccessfulRequests: true, // Don't count successful requests
    message: {
        success: false,
        error: 'Too many login attempts, please try again later',
    },
});

// Rate limiter for code analysis (expensive operations)
const analysisLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 analyses per minute
    message: {
        success: false,
        error: 'Too many analysis requests, please slow down',
    },
    skipFailedRequests: true,
});

module.exports = {
    apiLimiter,
    authLimiter,
    analysisLimiter,
};
