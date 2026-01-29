// backend/routes/user.routes.js
/**
 * User Routes
 */

const express = require('express');
const router = express.Router();
const {
    getProfile,
    updateProfile,
    getDashboard,
    deleteAccount,
    uploadAvatar,
    deleteAvatar,
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { avatarUpload, handleAvatarUploadError } = require('../middleware/avatar.middleware');

// All routes require authentication
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/dashboard', getDashboard);
router.delete('/account', deleteAccount);

// Avatar routes
router.post('/avatar', avatarUpload.single('avatar'), handleAvatarUploadError, uploadAvatar);
router.delete('/avatar', deleteAvatar);

module.exports = router;
