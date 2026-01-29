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

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/update', protect, updateProfile);
router.put('/password', protect, updatePassword);

module.exports = router;
