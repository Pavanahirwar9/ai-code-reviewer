// backend/src/controllers/editor.controller.js
/**
 * Editor Controller
 * Handles code editor operations (load, save, re-analyze)
 */

const EditorFile = require('../models/EditorFile.model');
const { reviewCode } = require('../services/ai.service');
const { runESLint, analyzeSecurityPatterns } = require('../services/lint.service');
const { detectLanguageFromFilename, detectLanguageFromContent } = require('../utils/languageDetector');
const { sendSuccess, sendError, asyncHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');

/**
 * @route   GET /api/editor/file/:fileId
 * @desc    Get file data for editor
 * @access  Private
 */
exports.getEditorFile = asyncHandler(async (req, res) => {
    const { fileId } = req.params;

    logger.info(`Loading file ${fileId} for user ${req.user._id}`);

    const file = await EditorFile.findById(fileId);

    if (!file) {
        logger.warn(`File ${fileId} not found`);
        return sendError(res, 'File not found', 404);
    }

    // Verify ownership
    if (file.userId.toString() !== req.user._id.toString()) {
        logger.warn(`Unauthorized access attempt to file ${fileId} by user ${req.user._id}`);
        return sendError(res, 'Unauthorized access to this file', 403);
    }

    return sendSuccess(res, {
        _id: file._id,
        code: file.code,
        originalCode: file.originalCode,
        language: file.language,
        filePath: file.filePath,
        issues: file.issues,
        isEdited: file.isEdited,
        editedAt: file.editedAt,
    }, 'File loaded successfully');
});

/**
 * @route   PUT /api/editor/file/:fileId
 * @desc    Save updated code
 * @access  Private
 */
exports.updateEditorFile = asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const { updatedCode } = req.body;

    if (!updatedCode) {
        return sendError(res, 'Updated code is required', 400);
    }

    logger.info(`Updating file ${fileId} for user ${req.user._id}`);

    const file = await EditorFile.findById(fileId);

    if (!file) {
        logger.warn(`File ${fileId} not found`);
        return sendError(res, 'File not found', 404);
    }

    // Verify ownership
    if (file.userId.toString() !== req.user._id.toString()) {
        logger.warn(`Unauthorized update attempt on file ${fileId} by user ${req.user._id}`);
        return sendError(res, 'Unauthorized access to this file', 403);
    }

    // Update file
    file.code = updatedCode;
    file.isEdited = true;
    file.editedAt = new Date();
    
    await file.save();

    logger.info(`File ${fileId} updated successfully`);

    return sendSuccess(res, {
        _id: file._id,
        code: file.code,
        isEdited: file.isEdited,
        editedAt: file.editedAt,
    }, 'File saved successfully');
});

/**
 * @route   POST /api/editor/file/:fileId/reanalyze
 * @desc    Re-run analysis on edited code
 * @access  Private
 */
exports.reanalyzeFile = asyncHandler(async (req, res) => {
    const { fileId } = req.params;

    logger.info(`Re-analyzing file ${fileId} for user ${req.user._id}`);

    const file = await EditorFile.findById(fileId);

    if (!file) {
        logger.warn(`File ${fileId} not found`);
        return sendError(res, 'File not found', 404);
    }

    // Verify ownership
    if (file.userId.toString() !== req.user._id.toString()) {
        logger.warn(`Unauthorized re-analyze attempt on file ${fileId} by user ${req.user._id}`);
        return sendError(res, 'Unauthorized access to this file', 403);
    }

    try {
        const issues = [];
        const startTime = Date.now();

        // Run ESLint analysis
        if (['javascript', 'typescript', 'jsx', 'tsx'].includes(file.language)) {
            logger.info(`Running ESLint on file ${fileId}`);
            const lintResults = await runESLint(file.code, file.language);
            
            lintResults.forEach(issue => {
                issues.push({
                    line: issue.line,
                    column: issue.column,
                    message: issue.message,
                    severity: issue.severity === 2 ? 'error' : 'warning',
                    rule: issue.ruleId,
                    source: 'eslint',
                });
            });
        }

        // Run security pattern analysis
        logger.info(`Running security analysis on file ${fileId}`);
        const securityIssues = await analyzeSecurityPatterns(file.code, file.language);
        
        securityIssues.forEach(issue => {
            issues.push({
                line: issue.line,
                column: issue.column || 0,
                message: issue.message,
                severity: 'security',
                rule: issue.rule,
                source: 'security',
            });
        });

        // Run AI analysis
        logger.info(`Running AI analysis on file ${fileId}`);
        const aiReview = await reviewCode(file.code, file.language);
        
        // Process AI review results (bugs, security, performance, suggestions)
        if (aiReview) {
            // Add bugs
            if (aiReview.bugs && Array.isArray(aiReview.bugs)) {
                aiReview.bugs.forEach(issue => {
                    issues.push({
                        line: issue.line || 1,
                        column: 0,
                        message: issue.description || issue.message,
                        severity: issue.severity === 'critical' ? 'error' : (issue.severity === 'warning' ? 'warning' : 'info'),
                        rule: issue.id || issue.rule,
                        source: 'ai',
                    });
                });
            }

            // Add security issues
            if (aiReview.security && Array.isArray(aiReview.security)) {
                aiReview.security.forEach(issue => {
                    issues.push({
                        line: issue.line || 1,
                        column: 0,
                        message: issue.description || issue.message,
                        severity: 'security',
                        rule: issue.id || issue.rule,
                        source: 'ai',
                    });
                });
            }

            // Add performance issues
            if (aiReview.performance && Array.isArray(aiReview.performance)) {
                aiReview.performance.forEach(issue => {
                    issues.push({
                        line: issue.line || 1,
                        column: 0,
                        message: issue.description || issue.message,
                        severity: 'info',
                        rule: issue.id || issue.rule,
                        source: 'ai',
                    });
                });
            }

            // Add suggestions
            if (aiReview.suggestions && Array.isArray(aiReview.suggestions)) {
                aiReview.suggestions.forEach(issue => {
                    issues.push({
                        line: issue.line || 1,
                        column: 0,
                        message: issue.description || issue.message,
                        severity: 'info',
                        rule: issue.id || issue.rule,
                        source: 'ai',
                    });
                });
            }
        }

        // Update file with new issues
        file.issues = issues;
        await file.save();

        const analysisTime = Date.now() - startTime;

        logger.info(`File ${fileId} re-analyzed successfully in ${analysisTime}ms, found ${issues.length} issues`);

        return sendSuccess(res, {
            _id: file._id,
            issues: file.issues,
            issueCount: issues.length,
            analysisTime,
        }, 'File re-analyzed successfully');

    } catch (error) {
        logger.error(`Error re-analyzing file ${fileId}:`, error);
        return sendError(res, 'Failed to re-analyze file', 500);
    }
});

/**
 * @route   POST /api/editor/upload
 * @desc    Upload local file for editing
 * @access  Private
 */
exports.uploadLocalFile = asyncHandler(async (req, res) => {
    // Check if file was uploaded
    if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
    }

    const { originalname, buffer } = req.file;
    const code = buffer.toString('utf8');

    // Detect language
    let language = detectLanguageFromFilename(originalname) ||
        detectLanguageFromContent(code) ||
        'text';

    logger.info(`Uploading local file ${originalname} for user ${req.user._id}, language: ${language}`);

    try {
        // Create EditorFile record
        const editorFile = await EditorFile.create({
            userId: req.user._id,
            filePath: originalname,
            code,
            originalCode: code,
            language,
            issues: [],
            isEdited: false,
        });

        // Run initial analysis
        const issues = [];

        // Run ESLint analysis
        if (['javascript', 'typescript', 'jsx', 'tsx'].includes(language)) {
            const lintResults = await runESLint(code, language);
            
            lintResults.forEach(issue => {
                issues.push({
                    line: issue.line,
                    column: issue.column,
                    message: issue.message,
                    severity: issue.severity === 2 ? 'error' : 'warning',
                    rule: issue.ruleId,
                    source: 'eslint',
                });
            });
        }

        // Run security analysis
        const securityIssues = await analyzeSecurityPatterns(code, language);
        
        securityIssues.forEach(issue => {
            issues.push({
                line: issue.line,
                column: issue.column || 0,
                message: issue.message,
                severity: 'security',
                rule: issue.rule,
                source: 'security',
            });
        });

        // Update with issues
        editorFile.issues = issues;
        await editorFile.save();

        logger.info(`Local file uploaded successfully: ${editorFile._id}`);

        return sendSuccess(res, {
            fileId: editorFile._id,
            redirectUrl: `/dashboard/editor/${editorFile._id}`,
        }, 'File uploaded successfully');

    } catch (error) {
        logger.error('Error uploading local file:', error);
        return sendError(res, 'Failed to upload file', 500);
    }
});

/**
 * @route   POST /api/editor/from-scan
 * @desc    Create EditorFile from scan result file
 * @access  Private
 */
exports.createFromScan = asyncHandler(async (req, res) => {
    const { scanId, filePath, code, language, issues } = req.body;

    if (!code || !language) {
        return sendError(res, 'Code and language are required', 400);
    }

    logger.info(`Creating EditorFile from scan for user ${req.user._id}`);

    try {
        // Check if EditorFile already exists for this scan+file
        let editorFile = await EditorFile.findOne({
            userId: req.user._id,
            scanId: scanId || null,
            filePath: filePath || 'untitled',
        });

        if (editorFile) {
            // Return existing file
            return sendSuccess(res, {
                fileId: editorFile._id,
                exists: true,
            }, 'EditorFile already exists');
        }

        // Transform issues to match EditorFile schema
        const transformedIssues = (issues || []).map(issue => ({
            line: issue.line || 1,
            column: issue.column || 0,
            message: issue.message || issue.description,
            severity: mapSeverity(issue.severity),
            rule: issue.id || issue.rule,
            source: 'ai', // Valid enum: 'eslint', 'ai', 'security'
        }));

        // Create new EditorFile
        editorFile = await EditorFile.create({
            userId: req.user._id,
            scanId: scanId || null,
            filePath: filePath || 'untitled',
            code,
            originalCode: code,
            language,
            issues: transformedIssues,
            isEdited: false,
        });

        logger.info(`EditorFile created from scan: ${editorFile._id}`);

        return sendSuccess(res, {
            fileId: editorFile._id,
        }, 'EditorFile created successfully');

    } catch (error) {
        logger.error('Error creating EditorFile from scan:', error);
        return sendError(res, 'Failed to create EditorFile', 500);
    }
});

/**
 * Helper: Map various severity formats to EditorFile schema
 */
function mapSeverity(severity) {
    if (!severity) return 'info';
    
    const sev = severity.toLowerCase();
    if (sev === 'critical' || sev === 'error') return 'error';
    if (sev === 'warning') return 'warning';
    if (sev === 'security') return 'security';
    return 'info';
}

/**
 * Configure Multer for file uploads (memory storage)
 */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept common code file extensions
        const allowedExtensions = [
            '.js', '.jsx', '.ts', '.tsx',
            '.py', '.java', '.cpp', '.c', '.h',
            '.cs', '.rb', '.php', '.go',
            '.rs', '.swift', '.kt', '.scala',
            '.html', '.css', '.json', '.xml',
            '.txt', '.md',
        ];

        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only code files are allowed.'));
        }
    },
});

exports.uploadMiddleware = upload.single('file');
