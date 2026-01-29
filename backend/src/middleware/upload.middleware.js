// backend/middleware/upload.middleware.js
/**
 * File upload middleware using Multer
 * Handles code file uploads with validation
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-randomstring-originalname
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
});

// File filter - only accept code files
const fileFilter = (req, file, cb) => {
    const allowedExtensions = [
        '.js', '.jsx', '.ts', '.tsx',
        '.py', '.java', '.cpp', '.c', '.cs',
        '.rb', '.php', '.go', '.rs', '.swift',
        '.kt', '.scala', '.r', '.m', '.sh',
        '.html', '.css', '.scss', '.sass',
        '.json', '.xml', '.yaml', '.yml',
        '.md', '.txt', '.sql',
    ];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`), false);
    }
};

// Multer configuration
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    },
});

// Middleware to handle upload errors
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB',
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
    upload,
    handleUploadError,
};
