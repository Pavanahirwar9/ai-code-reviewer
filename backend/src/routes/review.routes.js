// backend/routes/review.routes.js
/**
 * Code Review Routes
 */

const express = require('express');
const router = express.Router();
const {
    analyzeText,
    analyzeFile,
    getHistory,
    getReview,
    downloadReport,
    deleteReview,
    getStats,
    getStatus,
    getFileWithIssues,
    getFileForEdit,
    updateFileContent,
    reanalyzeFile,
    commitToGitHub,
} = require('../controllers/review.controller');
const { protect } = require('../middleware/auth.middleware');
const { analysisLimiter } = require('../middleware/rateLimit.middleware');
const { upload, handleUploadError } = require('../middleware/upload.middleware');
const {
    reviewTextValidation,
    reviewIdValidation,
    paginationValidation,
    validate,
} = require('../utils/validators');

// All routes require authentication
router.use(protect);

// Analysis routes
router.post(
    '/text',
    analysisLimiter,
    reviewTextValidation,
    validate,
    analyzeText
);

router.post(
    '/upload',
    analysisLimiter,
    upload.single('file'),
    handleUploadError,
    analyzeFile
);

// History and stats
router.get('/history', paginationValidation, validate, getHistory);
router.get('/stats', getStats);

// Individual review operations
router.get('/:id', reviewIdValidation, validate, getReview);
router.get('/:id/status', reviewIdValidation, validate, getStatus);
router.get('/:id/download', reviewIdValidation, validate, downloadReport);
router.delete('/:id', reviewIdValidation, validate, deleteReview);

// File content with issues (for annotated view)
router.get('/:scanId/file', reviewIdValidation, validate, getFileWithIssues);

// Code editor routes
router.get('/:scanId/file/edit', reviewIdValidation, validate, getFileForEdit);
router.put('/file/update', updateFileContent);
router.post('/file/reanalyze', reanalyzeFile);
router.post('/file/commit', commitToGitHub);

module.exports = router;
