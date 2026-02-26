// backend/routes/auth.routes.js
/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const {
    register,
    login,
    logout,
    getMe,
    updateProfile,
    updatePassword,
    githubLogin,
    githubCallback,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    googleLogin,
    googleCallback,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const {
    registerValidation,
    loginValidation,
    validate,
} = require('../utils/validators');

// Public routes
router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);

// Password reset (public)
router.post('/forgot-password', authLimiter, forgotPassword);
router.put('/reset-password/:token', resetPassword);

// Email verification (public)
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);

// GitHub OAuth
router.get('/github', githubLogin);
router.get('/github/callback', githubCallback);

// Google OAuth
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/update', protect, updateProfile);
router.put('/password', protect, updatePassword);

module.exports = router;
