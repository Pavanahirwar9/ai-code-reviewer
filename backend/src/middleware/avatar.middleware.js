// backend/middleware/avatar.middleware.js
/**
 * Avatar upload middleware using Multer
 * Handles profile picture uploads with validation
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure avatars directory exists
const avatarDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarDir)) {
    fs.mkdirSync(avatarDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, avatarDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: userId-timestamp.ext
        const ext = path.extname(file.originalname);
        const filename = `${req.user._id}-${Date.now()}${ext}`;
        cb(null, filename);
    },
});

// File filter - only accept images
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, and GIF are allowed'), false);
    }
};

// Multer configuration
const avatarUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
    },
});

// Middleware to handle upload errors
const handleAvatarUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 2MB',
            });
        }
        return res.status(400).json({
            success: false,
            error: err.message,
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            error: err.message,
        });
    }
    next();
};

module.exports = {
    avatarUpload,
    handleAvatarUploadError,
};
