// backend/controllers/review.controller.js
/**
 * Review Controller
 * Handles code analysis requests (text, file upload, GitHub)
 */

const Review = require('../models/Review.model');
const { reviewCode } = require('../services/ai.service');
const { runESLint, analyzeSecurityPatterns } = require('../services/lint.service');
const { readUploadedFile, deleteFile, extractCodeMetadata } = require('../services/file.service');
const { detectLanguageFromFilename, detectLanguageFromContent } = require('../utils/languageDetector');
const { sendSuccess, sendError, sendPaginated, asyncHandler } = require('../utils/responseHandler');
const { generateReport, generateSummary, generateTextReport } = require('../services/report.service');
const logger = require('../utils/logger');

/**
 * @route   POST /api/review/text
 * @desc    Analyze code from text input
 * @access  Private
 */
exports.analyzeText = asyncHandler(async (req, res) => {
    const { code, language, fileName = 'untitled.txt' } = req.body;

    logger.info(`Starting text analysis for user ${req.user._id}, language: ${language}, file: ${fileName}`);

    // Detect language if not provided
    let detectedLanguage = language;
    if (!detectedLanguage) {
        detectedLanguage = detectLanguageFromFilename(fileName) ||
            detectLanguageFromContent(code) ||
            'text';
    }

    // Create review record
    const review = await Review.create({
        userId: req.user._id,
        source: 'text',
        code,
        language: detectedLanguage,
        fileName,
        linesAnalyzed: code.split('\n').length,
        status: 'in-progress',
    });

    logger.info(`Review record created: ${review._id}, status: ${review.status}`);

    try {
        // Start analysis time tracking
        const startTime = Date.now();

        // Run ESLint for JavaScript/TypeScript
        const lintResults = await runESLint(code, detectedLanguage);

        // Run security pattern analysis
        const securityPatterns = analyzeSecurityPatterns(code);

        // Get AI review
        const aiResults = await reviewCode(code, detectedLanguage, fileName);

        // Calculate analysis time
        const analysisTime = ((Date.now() - startTime) / 1000).toFixed(1);

        // Merge results
        review.bugs = [...(aiResults.bugs || []), ...lintResults];
        review.security = [...(aiResults.security || []), ...securityPatterns];
        review.performance = aiResults.performance || [];
        review.suggestions = aiResults.suggestions || [];
        review.analysisTime = `${analysisTime}s`;
        review.status = 'completed';

        // Calculate score
        review.calculateScore();

        await review.save();

        logger.info(`Text analysis completed: ${review._id}, score: ${review.overallScore}, status: ${review.status}`);
        logger.info(`Review saved to MongoDB - bugs: ${review.bugs.length}, security: ${review.security.length}, performance: ${review.performance.length}`);

        sendSuccess(res, generateReport(review), 'Code analysis completed', 201);

    } catch (error) {
        review.status = 'failed';
        review.error = error.message;
        await review.save();

        logger.error(`Text analysis failed: ${error.message}`);
        throw error;
    }
});

/**
 * @route   POST /api/review/upload
 * @desc    Analyze code from uploaded file
 * @access  Private
 */
exports.analyzeFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        return sendError(res, 'Please upload a file', 400);
    }

    try {
        // Read file content
        const { code, fileName, language } = await readUploadedFile(req.file.path);

        // Create review record
        const review = await Review.create({
            userId: req.user._id,
            source: 'file',
            code,
            language,
            fileName,
            linesAnalyzed: code.split('\n').length,
            status: 'in-progress',
        });

        // Start analysis
        const startTime = Date.now();

        // Run analyses
        const lintResults = await runESLint(code, language);
        const securityPatterns = analyzeSecurityPatterns(code);
        const aiResults = await reviewCode(code, language, fileName);

        const analysisTime = ((Date.now() - startTime) / 1000).toFixed(1);

        // Update review with results
        review.bugs = [...(aiResults.bugs || []), ...lintResults];
        review.security = [...(aiResults.security || []), ...securityPatterns];
        review.performance = aiResults.performance || [];
        review.suggestions = aiResults.suggestions || [];
        review.analysisTime = `${analysisTime}s`;
        review.status = 'completed';
        review.calculateScore();

        await review.save();

        // Clean up uploaded file
        await deleteFile(req.file.path);

        logger.info(`File analysis completed: ${review._id}`);

        sendSuccess(res, generateReport(review), 'File analysis completed', 201);

    } catch (error) {
        // Clean up uploaded file on error
        if (req.file) {
            await deleteFile(req.file.path);
        }

        logger.error(`File analysis failed: ${error.message}`);
        throw error;
    }
});

/**
 * @route   GET /api/review/history
 * @desc    Get user's review history
 * @access  Private
 */
exports.getHistory = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Review.countDocuments({ userId: req.user._id });

    const reviews = await Review.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-code'); // Don't return full code in history

    const summaries = reviews.map(review => generateSummary(review));

    sendPaginated(
        res,
        summaries,
        { page, limit, total },
        'Review history retrieved successfully'
    );
});

/**
 * @route   GET /api/review/:id
 * @desc    Get specific review by ID
 * @access  Private
 */
exports.getReview = asyncHandler(async (req, res) => {
    const review = await Review.findOne({
        _id: req.params.id,
        userId: req.user._id,
    });

    if (!review) {
        return sendError(res, 'Review not found', 404);
    }

    sendSuccess(res, generateReport(review), 'Review retrieved successfully');
});

/**
 * @route   GET /api/review/:id/download
 * @desc    Download review report as text file
 * @access  Private
 */
exports.downloadReport = asyncHandler(async (req, res) => {
    const review = await Review.findOne({
        _id: req.params.id,
        userId: req.user._id,
    });

    if (!review) {
        return sendError(res, 'Review not found', 404);
    }

    const textReport = generateTextReport(review);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="review-${review._id}.txt"`);
    res.send(textReport);
});

/**
 * @route   DELETE /api/review/:id
 * @desc    Delete a review
 * @access  Private
 */
exports.deleteReview = asyncHandler(async (req, res) => {
    const review = await Review.findOne({
        _id: req.params.id,
        userId: req.user._id,
    });

    if (!review) {
        return sendError(res, 'Review not found', 404);
    }

    await review.deleteOne();

    logger.info(`Review deleted: ${review._id}`);

    sendSuccess(res, null, 'Review deleted successfully');
});

/**
 * @route   GET /api/review/stats
 * @desc    Get user's analysis statistics
 * @access  Private
 */
exports.getStats = asyncHandler(async (req, res) => {
    const reviews = await Review.find({ userId: req.user._id });

    const stats = {
        totalReviews: reviews.length,
        totalIssuesFound: 0,
        averageScore: 0,
        languagesAnalyzed: {},
        recentActivity: [],
    };

    let totalBugs = 0;
    let totalSecurity = 0;
    let totalPerformance = 0;

    reviews.forEach(review => {
        const bugsCount = review.bugs.length;
        const securityCount = review.security.length;
        const performanceCount = review.performance.length;

        totalBugs += bugsCount;
        totalSecurity += securityCount;
        totalPerformance += performanceCount;

        stats.totalIssuesFound += bugsCount + securityCount + performanceCount;
        stats.averageScore += review.overallScore;

        // Count languages
        if (!stats.languagesAnalyzed[review.language]) {
            stats.languagesAnalyzed[review.language] = 0;
        }
        stats.languagesAnalyzed[review.language]++;
    });

    if (reviews.length > 0) {
        stats.averageScore = Math.round(stats.averageScore / reviews.length);
    }

    // Get recent activity (last 5) with issue counts
    stats.recentActivity = reviews
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
        .map(review => {
            const summary = generateSummary(review);
            return {
                ...summary,
                bugsCount: review.bugs.length,
                securityCount: review.security.length,
                performanceCount: review.performance.length,
            };
        });

    // Add aggregated counts to stats
    stats.bugsFound = totalBugs;
    stats.securityIssues = totalSecurity;
    stats.performanceWarnings = totalPerformance;

    sendSuccess(res, stats, 'Statistics retrieved successfully');
});

/**
 * @route   GET /api/review/status/:id
 * @desc    Get analysis progress status by review ID
 * @access  Private
 */
exports.getStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    logger.info(`Fetching status for review ${id} by user ${req.user._id}`);

    const review = await Review.findOne({
        _id: id,
        userId: req.user._id,
    }).select('status progress fileName language overallScore createdAt error');

    if (!review) {
        return sendError(res, 'Review not found', 404);
    }

    const statusData = {
        id: review._id,
        fileName: review.fileName,
        language: review.language,
        status: review.status,
        progress: {
            totalFiles: review.progress?.totalFiles || 0,
            filesAnalyzed: review.progress?.filesAnalyzed || 0,
            currentFile: review.progress?.currentFile || '',
            percentage: review.progress?.percentage || 0,
        },
        overallScore: review.overallScore,
        createdAt: review.createdAt,
    };

    // Add error if status is failed
    if (review.status === 'failed' && review.error) {
        statusData.error = review.error;
    }

    logger.info(`Status retrieved for review ${id}: ${review.status} (${statusData.progress.percentage}%)`);

    sendSuccess(res, statusData, 'Review status retrieved successfully');
});

/**
 * @route   GET /api/review/:scanId/file
 * @desc    Get file content with issues for annotated view
 * @access  Private
 */
exports.getFileWithIssues = asyncHandler(async (req, res) => {
    const { scanId } = req.params;
    const { path } = req.query;

    if (!path) {
        return sendError(res, 'File path is required', 400);
    }

    logger.info(`Fetching file content for scan ${scanId}, path: ${path}, user: ${req.user.email}`);

    // Find the review/scan
    const review = await Review.findOne({
        _id: scanId,
        userId: req.user._id,
    });

    if (!review) {
        return sendError(res, 'Scan not found', 404);
    }

    // For GitHub scans, fetch the file content
    if (review.source === 'github' && review.metadata?.repository) {
        try {
            const { owner, repo, branch } = review.metadata.repository;
            const githubService = require('../services/github.service');
            const accessToken = await githubService.getGitHubToken(req.user._id);

            if (!accessToken) {
                return sendError(res, 'GitHub token not found', 401);
            }

            // Fetch file content from GitHub
            const fileData = await githubService.fetchFileContent(
                accessToken,
                owner,
                repo,
                path,
                branch
            );

            // Extract issues for this specific file
            const fileIssues = [];

            // Collect bugs for this file
            if (review.bugs) {
                review.bugs
                    .filter(bug => bug.fileName === path)
                    .forEach(bug => {
                        fileIssues.push({
                            line: bug.line || 1,
                            column: 0,
                            message: bug.description,
                            title: bug.title,
                            code: bug.code,
                            suggestion: bug.suggestion,
                            severity: bug.severity || 'warning',
                            type: 'bug',
                        });
                    });
            }

            // Collect security issues for this file
            if (review.security) {
                review.security
                    .filter(issue => issue.fileName === path)
                    .forEach(issue => {
                        fileIssues.push({
                            line: issue.line || 1,
                            column: 0,
                            message: issue.description,
                            title: issue.title,
                            code: issue.code,
                            suggestion: issue.suggestion,
                            severity: issue.severity || 'critical',
                            type: 'security',
                        });
                    });
            }

            // Collect performance issues for this file
            if (review.performance) {
                review.performance
                    .filter(issue => issue.fileName === path)
                    .forEach(issue => {
                        fileIssues.push({
                            line: issue.line || 1,
                            column: 0,
                            message: issue.description,
                            title: issue.title,
                            code: issue.code,
                            suggestion: issue.suggestion,
                            severity: issue.severity || 'info',
                            type: 'performance',
                        });
                    });
            }

            // Sort issues by line number
            fileIssues.sort((a, b) => a.line - b.line);

            const response = {
                code: fileData.content,
                filePath: path,
                language: detectLanguageFromFilename(path),
                issues: fileIssues,
                metadata: {
                    scanId: review._id,
                    repository: `${owner}/${repo}`,
                    branch,
                    totalIssues: fileIssues.length,
                },
            };

            logger.info(`File content fetched successfully: ${path}, ${fileIssues.length} issues found`);

            sendSuccess(res, response, 'File content retrieved successfully');
        } catch (error) {
            logger.error(`Failed to fetch file content: ${error.message}`);
            return sendError(res, `Failed to fetch file: ${error.message}`, 500);
        }
    } else if (review.source === 'text' || review.source === 'file') {
        // For single file reviews, return the stored code
        const fileIssues = [];

        // Collect all issues
        if (review.bugs) {
            review.bugs.forEach(bug => {
                fileIssues.push({
                    line: bug.line || 1,
                    column: 0,
                    message: bug.description,
                    title: bug.title,
                    code: bug.code,
                    suggestion: bug.suggestion,
                    severity: bug.severity || 'warning',
                    type: 'bug',
                });
            });
        }

        if (review.security) {
            review.security.forEach(issue => {
                fileIssues.push({
                    line: issue.line || 1,
                    column: 0,
                    message: issue.description,
                    title: issue.title,
                    code: issue.code,
                    suggestion: issue.suggestion,
                    severity: issue.severity || 'critical',
                    type: 'security',
                });
            });
        }

        if (review.performance) {
            review.performance.forEach(issue => {
                fileIssues.push({
                    line: issue.line || 1,
                    column: 0,
                    message: issue.description,
                    title: issue.title,
                    code: issue.code,
                    suggestion: issue.suggestion,
                    severity: issue.severity || 'info',
                    type: 'performance',
                });
            });
        }

        fileIssues.sort((a, b) => a.line - b.line);

        const response = {
            code: review.code,
            filePath: review.fileName,
            language: review.language,
            issues: fileIssues,
            metadata: {
                scanId: review._id,
                fileName: review.fileName,
                totalIssues: fileIssues.length,
            },
        };

        sendSuccess(res, response, 'File content retrieved successfully');
    } else {
        return sendError(res, 'Unsupported review source', 400);
    }
});

/**
 * @route   GET /api/review/:scanId/file
 * @desc    Get single file content for editing
 * @access  Private
 */
exports.getFileForEdit = asyncHandler(async (req, res) => {
    const { scanId } = req.params;
    const { path } = req.query;

    if (!path) {
        return sendError(res, 'File path is required', 400);
    }

    logger.info(`Fetching file for edit: ${scanId}, path: ${path}`);

    const review = await Review.findOne({
        _id: scanId,
        userId: req.user._id,
    });

    if (!review) {
        return sendError(res, 'Review not found or access denied', 404);
    }

    // Find file content and issues
    let fileContent = null;
    let fileIssues = [];

    if (review.source === 'repository') {
        // For repository scans, find the file in filesAnalyzed
        const fileData = review.metadata?.filesAnalyzed?.find(f => f.path === path);
        
        if (!fileData) {
            return sendError(res, 'File not found in analysis', 404);
        }

        fileContent = fileData.content || fileData.code || '';
        
        // Get issues for this file
        fileIssues = [
            ...(review.bugs || []).filter(bug => bug.file === path),
            ...(review.security || []).filter(sec => sec.file === path),
            ...(review.performance || []).filter(perf => perf.file === path),
        ];
    } else {
        // For single file reviews
        fileContent = review.code || '';
        fileIssues = [
            ...(review.bugs || []),
            ...(review.security || []),
            ...(review.performance || []),
        ];
    }

    sendSuccess(res, {
        scanId: review._id,
        filePath: path,
        fileName: path.split('/').pop(),
        language: review.language,
        code: fileContent,
        issues: fileIssues.map(issue => ({
            line: issue.line,
            column: issue.column || 0,
            message: issue.message,
            severity: issue.severity || 'error',
            type: issue.type || 'bug',
        })),
        isEdited: review.metadata?.editedFiles?.includes(path) || false,
        canCommit: review.source === 'repository' && review.metadata?.repository,
    }, 'File retrieved successfully');
});

/**
 * @route   PUT /api/review/file/update
 * @desc    Update file content after editing
 * @access  Private
 */
exports.updateFileContent = asyncHandler(async (req, res) => {
    const { scanId, filePath, updatedCode } = req.body;

    if (!scanId || !filePath || updatedCode === undefined) {
        return sendError(res, 'scanId, filePath, and updatedCode are required', 400);
    }

    logger.info(`Updating file content: ${scanId}, path: ${filePath}`);

    const review = await Review.findOne({
        _id: scanId,
        userId: req.user._id,
    });

    if (!review) {
        return sendError(res, 'Review not found or access denied', 404);
    }

    // Update the file content
    if (review.source === 'repository') {
        // Update in filesAnalyzed array
        if (!review.metadata) review.metadata = {};
        if (!review.metadata.filesAnalyzed) review.metadata.filesAnalyzed = [];
        if (!review.metadata.editedFiles) review.metadata.editedFiles = [];

        const fileIndex = review.metadata.filesAnalyzed.findIndex(f => f.path === filePath);
        
        if (fileIndex >= 0) {
            review.metadata.filesAnalyzed[fileIndex].content = updatedCode;
            review.metadata.filesAnalyzed[fileIndex].code = updatedCode;
        } else {
            review.metadata.filesAnalyzed.push({
                path: filePath,
                content: updatedCode,
                code: updatedCode,
            });
        }

        // Mark as edited
        if (!review.metadata.editedFiles.includes(filePath)) {
            review.metadata.editedFiles.push(filePath);
        }

        review.markModified('metadata');
    } else {
        // Update single file review
        review.code = updatedCode;
        if (!review.metadata) review.metadata = {};
        review.metadata.isEdited = true;
        review.markModified('metadata');
    }

    await review.save();

    logger.info(`File content updated successfully: ${scanId}, path: ${filePath}`);

    sendSuccess(res, {
        scanId: review._id,
        filePath,
        updated: true,
    }, 'File content updated successfully');
});

/**
 * @route   POST /api/review/file/reanalyze
 * @desc    Re-analyze single file after editing
 * @access  Private
 */
exports.reanalyzeFile = asyncHandler(async (req, res) => {
    const { scanId, filePath } = req.body;

    if (!scanId || !filePath) {
        return sendError(res, 'scanId and filePath are required', 400);
    }

    logger.info(`Re-analyzing file: ${scanId}, path: ${filePath}`);

    const review = await Review.findOne({
        _id: scanId,
        userId: req.user._id,
    });

    if (!review) {
        return sendError(res, 'Review not found or access denied', 404);
    }

    // Get file content
    let fileContent;
    if (review.source === 'repository') {
        const fileData = review.metadata?.filesAnalyzed?.find(f => f.path === filePath);
        if (!fileData) {
            return sendError(res, 'File not found', 404);
        }
        fileContent = fileData.content || fileData.code || '';
    } else {
        fileContent = review.code;
    }

    const startTime = Date.now();

    try {
        // Run static analysis (ESLint)
        let staticIssues = [];
        try {
            const eslintResults = await runESLint(fileContent, review.language);
            staticIssues = eslintResults.map(issue => ({
                line: issue.line,
                column: issue.column,
                message: issue.message,
                severity: issue.severity === 2 ? 'error' : 'warning',
                type: 'bug',
                file: filePath,
            }));
        } catch (eslintError) {
            logger.warn(`ESLint analysis failed for ${filePath}: ${eslintError.message}`);
        }

        // Run security pattern analysis
        let securityIssues = [];
        try {
            const securityResults = await analyzeSecurityPatterns(fileContent, review.language);
            securityIssues = securityResults.map(issue => ({
                line: issue.line || 0,
                column: issue.column || 0,
                message: issue.message,
                severity: issue.severity || 'warning',
                type: 'security',
                file: filePath,
            }));
        } catch (secError) {
            logger.warn(`Security analysis failed for ${filePath}: ${secError.message}`);
        }

        // Run AI-powered review
        let aiIssues = [];
        try {
            const aiReview = await reviewCode(fileContent, review.language);
            aiIssues = [
                ...(aiReview.bugs || []).map(bug => ({
                    ...bug,
                    type: 'bug',
                    file: filePath,
                })),
                ...(aiReview.security || []).map(sec => ({
                    ...sec,
                    type: 'security',
                    file: filePath,
                })),
                ...(aiReview.performance || []).map(perf => ({
                    ...perf,
                    type: 'performance',
                    file: filePath,
                })),
            ];
        } catch (aiError) {
            logger.warn(`AI review failed for ${filePath}: ${aiError.message}`);
        }

        // Combine all issues
        const allIssues = [...staticIssues, ...securityIssues, ...aiIssues];

        // Update review with new issues for this file
        // Remove old issues for this file
        review.bugs = (review.bugs || []).filter(bug => bug.file !== filePath);
        review.security = (review.security || []).filter(sec => sec.file !== filePath);
        review.performance = (review.performance || []).filter(perf => perf.file !== filePath);

        // Add new issues
        allIssues.forEach(issue => {
            if (issue.type === 'bug') {
                review.bugs.push(issue);
            } else if (issue.type === 'security') {
                review.security.push(issue);
            } else if (issue.type === 'performance') {
                review.performance.push(issue);
            }
        });

        // Recalculate score
        const totalIssues = review.bugs.length + review.security.length + review.performance.length;
        const maxScore = 100;
        const bugPenalty = review.bugs.length * 5;
        const securityPenalty = review.security.length * 10;
        const performancePenalty = review.performance.length * 3;
        review.overallScore = Math.max(0, maxScore - bugPenalty - securityPenalty - performancePenalty);

        const analysisTime = Date.now() - startTime;
        review.analysisTime = analysisTime;

        await review.save();

        logger.info(`File re-analyzed successfully: ${filePath}, issues: ${allIssues.length}, time: ${analysisTime}ms`);

        sendSuccess(res, {
            scanId: review._id,
            filePath,
            issues: allIssues.map(issue => ({
                line: issue.line,
                column: issue.column || 0,
                message: issue.message,
                severity: issue.severity || 'error',
                type: issue.type,
            })),
            totalIssues: allIssues.length,
            analysisTime,
        }, 'File re-analyzed successfully');

    } catch (error) {
        logger.error(`Re-analysis failed for ${filePath}: ${error.message}`);
        return sendError(res, `Re-analysis failed: ${error.message}`, 500);
    }
});

/**
 * @route   POST /api/review/file/commit
 * @desc    Commit edited file back to GitHub
 * @access  Private
 */
exports.commitToGitHub = asyncHandler(async (req, res) => {
    const { scanId, filePath, commitMessage } = req.body;

    if (!scanId || !filePath) {
        return sendError(res, 'scanId and filePath are required', 400);
    }

    logger.info(`Committing file to GitHub: ${scanId}, path: ${filePath}`);

    const review = await Review.findOne({
        _id: scanId,
        userId: req.user._id,
    });

    if (!review) {
        return sendError(res, 'Review not found or access denied', 404);
    }

    if (review.source !== 'repository' || !review.metadata?.repository) {
        return sendError(res, 'This review is not from a GitHub repository', 400);
    }

    // Get file content
    const fileData = review.metadata.filesAnalyzed?.find(f => f.path === filePath);
    if (!fileData) {
        return sendError(res, 'File not found', 404);
    }

    const updatedContent = fileData.content || fileData.code;

    // Get GitHub token
    const githubService = require('../services/github.service');
    const accessToken = await githubService.getGitHubToken(req.user._id);

    if (!accessToken) {
        return sendError(res, 'GitHub not connected', 401);
    }

    try {
        const axios = require('axios');
        const githubClient = axios.create({
            baseURL: 'https://api.github.com',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'AI-Code-Reviewer',
            },
        });

        const { owner, repo, branch } = review.metadata.repository;

        // Get current file SHA (required for update)
        const currentFileResponse = await githubClient.get(
            `/repos/${owner}/${repo}/contents/${filePath}`,
            { params: { ref: branch } }
        );

        const currentSHA = currentFileResponse.data.sha;

        // Commit the updated file
        const message = commitMessage || `Fix issues via AI Code Review - ${filePath}`;
        const content = Buffer.from(updatedContent).toString('base64');

        const commitResponse = await githubClient.put(
            `/repos/${owner}/${repo}/contents/${filePath}`,
            {
                message,
                content,
                sha: currentSHA,
                branch,
            }
        );

        logger.info(`File committed to GitHub: ${owner}/${repo}/${filePath}`);

        sendSuccess(res, {
            scanId: review._id,
            filePath,
            committed: true,
            commitUrl: commitResponse.data.commit.html_url,
        }, 'File committed to GitHub successfully');

    } catch (error) {
        logger.error(`GitHub commit failed: ${error.message}`);
        
        if (error.response?.status === 404) {
            return sendError(res, 'File not found in repository', 404);
        }
        if (error.response?.status === 409) {
            return sendError(res, 'Conflict: File has been modified on GitHub', 409);
        }
        
        return sendError(res, `Failed to commit to GitHub: ${error.message}`, 500);
    }
});

