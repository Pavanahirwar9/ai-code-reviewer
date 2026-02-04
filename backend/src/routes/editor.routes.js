// backend/src/routes/editor.routes.js
/**
 * Editor routes for code editing functionality
 */

const express = require('express');
const router = express.Router();
const editorController = require('../controllers/editor.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes are protected
router.use(protect);

/**
 * @route   GET /api/editor/file/:fileId
 * @desc    Get file data for editor
 * @access  Private
 */
router.get('/file/:fileId', editorController.getEditorFile);

/**
 * @route   PUT /api/editor/file/:fileId
 * @desc    Save updated code
 * @access  Private
 */
router.put('/file/:fileId', editorController.updateEditorFile);

/**
 * @route   POST /api/editor/file/:fileId/reanalyze
 * @desc    Re-run analysis on edited code
 * @access  Private
 */
router.post('/file/:fileId/reanalyze', editorController.reanalyzeFile);

/**
 * @route   POST /api/editor/upload
 * @desc    Upload local file for editing
 * @access  Private
 */
router.post('/upload', editorController.uploadMiddleware, editorController.uploadLocalFile);

/**
 * @route   POST /api/editor/from-scan
 * @desc    Create EditorFile from scan result
 * @access  Private
 */
router.post('/from-scan', editorController.createFromScan);

module.exports = router;
