
// backend/controllers/github.controller.js
/**
 * GitHub Controller
 * Handles GitHub OAuth and repository analysis
 */

const User = require('../models/User.model');
const Review = require('../models/Review.model');
const Repo = require('../models/Repo.model');
const githubService = require('../services/github.service');
const repoAnalysisService = require('../services/repoAnalysis.service');
const { reviewCode } = require('../services/ai.service');
const { runESLint, analyzeSecurityPatterns } = require('../services/lint.service');
const { detectLanguageFromFilename } = require('../utils/languageDetector');
const { sendSuccess, sendError, asyncHandler } = require('../utils/responseHandler');
const { generateReport } = require('../services/report.service');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

/**
 * @route   GET /api/github/auth
 * @desc    Initiate GitHub OAuth flow
 * @access  Public
 */
exports.initiateOAuth = asyncHandler(async (req, res) => {
    const state = Math.random().toString(36).substring(7);
    const authUrl = githubService.getAuthorizationURL(state);

    sendSuccess(res, { authUrl }, 'GitHub authorization URL generated');
});

/**
 * @route   GET /api/github/callback
 * @desc    Handle GitHub OAuth callback
 * @access  Public
 */
exports.handleCallback = asyncHandler(async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return sendError(res, 'Authorization code not provided', 400);
    }

    try {
        // Exchange code for access token
        const accessToken = await githubService.getAccessToken(code);

        // Get GitHub user info
        const githubUser = await githubService.getGitHubUser(accessToken);

        // Find or create user
        let user = await User.findOne({ githubId: githubUser.id.toString() });

        if (!user) {
            // Create new user from GitHub profile
            user = await User.create({
                name: githubUser.name || githubUser.login,
                email: githubUser.email || `${githubUser.login}@github.users.noreply.com`,
                password: Math.random().toString(36).substring(7), // Random password
                githubId: githubUser.id.toString(),
                githubUsername: githubUser.login,
                avatar: githubUser.avatar_url,
            });
        } else {
            // Update existing user
            user.githubUsername = githubUser.login;
            user.avatar = githubUser.avatar_url;
            user.lastLogin = new Date();
            await user.save();
        }

        // Save GitHub token
        await githubService.saveGitHubToken(
            user._id,
            accessToken,
            req.ip,
            req.headers['user-agent']
        );

        logger.info(`GitHub OAuth completed for user: ${user.email}`);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        // Redirect to frontend with success and token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/dashboard/github?connected=true&token=${token}`);

    } catch (error) {
        logger.error(`GitHub OAuth callback error: ${error.message}`);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/dashboard/github?error=${encodeURIComponent(error.message)}`);
    }
});

/**
 * @route   GET /api/github/repos
 * @desc    Fetch user's GitHub repositories
 * @access  Private
 */
exports.getRepos = asyncHandler(async (req, res) => {
    const accessToken = await githubService.getGitHubToken(req.user._id);

    if (!accessToken) {
        return sendError(res, 'GitHub not connected. Please connect your GitHub account first.', 401);
    }

    const repos = await githubService.fetchUserRepos(accessToken);

    sendSuccess(res, repos, 'Repositories fetched successfully');
});

/**
 * @route   GET /api/github/repos/:owner/:repo/branches
 * @desc    Fetch repository branches
 * @access  Private
 */
exports.getBranches = asyncHandler(async (req, res) => {
    const { owner, repo } = req.params;
    const accessToken = await githubService.getGitHubToken(req.user._id);

    if (!accessToken) {
        return sendError(res, 'GitHub not connected', 401);
    }

    const branches = await githubService.fetchRepoBranches(accessToken, owner, repo);

    sendSuccess(res, branches, 'Branches fetched successfully');
});

/**
 * @route   POST /api/github/analyze
 * @desc    Analyze code from GitHub repository
 * @access  Private
 */
/**
 * @route   POST /api/github/analyze
 * @desc    Analyze GitHub repository with complete flow
 * @access  Private
 * 
 * Flow:
 * 1) Validate repo & branch
 * 2) Fetch repo tree
 * 3) Filter source files
 * 4) Fetch file contents
 * 5) Analyze files (lint + AI)
 * 6) Aggregate results
 * 7) Save analysis history
 * 8) Return analysis ID
 */
exports.analyzeRepo = asyncHandler(async (req, res) => {
    try {
        const { owner, repo, branch, options = {} } = req.body;

        // Step 1: Validate repo & branch
        if (!owner || !repo || !branch) {
            return sendError(res, 'Owner, repo, and branch are required', 400);
        }

        logger.info(`Starting analysis for ${owner}/${repo}/${branch} by user: ${req.user.email}`);

        // Get GitHub access token
        const accessToken = await githubService.getGitHubToken(req.user._id);
        if (!accessToken) {
            return sendError(res, 'GitHub not connected. Please connect your GitHub account first.', 401);
        }

        // Step 2: Fetch repo tree
        logger.info('Step 2: Fetching repository tree...');
        const treeData = await githubService.fetchCompleteRepoTree(
            accessToken,
            owner,
            repo,
            branch
        );

        if (!treeData || !treeData.files || treeData.files.length === 0) {
            logger.warn(`No code files found in ${owner}/${repo}/${branch}. Total items in tree: ${treeData?.stats?.totalSize || 0}`);
            return sendError(res, `No source code files found in ${owner}/${repo}/${branch}. The repository may be empty, contain only non-code files, or the branch may not exist.`, 404);
        }

        logger.info(`Found ${treeData.totalFiles} files in repository`);

        // Step 3: Filter source files (already done by fetchCompleteRepoTree)
        let filesToAnalyze = treeData.files;

        // Apply options filters
        const maxFiles = options.maxFiles || 30;
        const maxFileSize = options.maxFileSize || 100000; // 100KB

        filesToAnalyze = filesToAnalyze
            .filter(file => file.size <= maxFileSize)
            .slice(0, maxFiles);

        if (filesToAnalyze.length === 0) {
            return sendError(res, 'No source files found after filtering', 404);
        }

        logger.info(`Step 3: Filtered to ${filesToAnalyze.length} source files for analysis`);

        // Step 4: Fetch file contents
        logger.info('Step 4: Fetching file contents...');
        const filePaths = filesToAnalyze.map(f => f.path);
        const fileContents = await githubService.fetchMultipleFileContents(
            accessToken,
            owner,
            repo,
            filePaths,
            branch
        );

        if (fileContents.successCount === 0) {
            return sendError(res, 'Failed to fetch any file contents', 500);
        }

        logger.info(`Fetched ${fileContents.successCount}/${fileContents.total} file contents`);

        // Step 5: Analyze files (lint + AI)
        logger.info('Step 5: Analyzing files with lint and AI...');

        // Create initial review record with progress tracking
        const review = await Review.create({
            userId: req.user._id,
            source: 'github',
            fileName: `${owner}/${repo}/${branch}`,
            language: 'repository',
            code: `Repository: ${owner}/${repo}\nBranch: ${branch}\nFiles: ${fileContents.successCount}`,
            status: 'in-progress',
            progress: {
                totalFiles: fileContents.successCount,
                filesAnalyzed: 0,
                currentFile: '',
                percentage: 0,
            },
        });

        logger.info(`Created review record ${review._id} for progress tracking`);

        // Progress callback to update review progress
        const updateProgress = async (filesAnalyzed, currentFile) => {
            try {
                await review.updateProgress(filesAnalyzed, currentFile);
                logger.info(`Progress updated: ${filesAnalyzed}/${fileContents.successCount} - ${currentFile}`);
            } catch (error) {
                logger.error(`Failed to update progress: ${error.message}`);
            }
        };

        // Analyze files with progress tracking
        const analysisResults = await repoAnalysisService.analyzeMultipleFiles(
            fileContents.successful,
            options.batchSize || 3,
            updateProgress
        );

        if (analysisResults.results.length === 0) {
            review.status = 'failed';
            review.error = 'Failed to analyze any files';
            await review.save();
            return sendError(res, 'Failed to analyze any files', 500);
        }

        logger.info(`Analyzed ${analysisResults.results.length} files successfully`);

        // Step 6: Aggregate results
        logger.info('Step 6: Aggregating analysis results...');
        const summary = repoAnalysisService.generateSummary(analysisResults.results);

        // Aggregate all issues with file context
        const aggregatedBugs = analysisResults.results.flatMap(r =>
            (r.analysis.bugs || []).map(bug => ({
                ...bug,
                fileName: r.fileName,
                fileLanguage: r.language,
            }))
        );

        const aggregatedSecurity = analysisResults.results.flatMap(r =>
            (r.analysis.security || []).map(issue => ({
                ...issue,
                fileName: r.fileName,
                fileLanguage: r.language,
            }))
        );

        const aggregatedPerformance = analysisResults.results.flatMap(r =>
            (r.analysis.performance || []).map(warning => ({
                ...warning,
                fileName: r.fileName,
                fileLanguage: r.language,
            }))
        );

        const aggregatedSuggestions = analysisResults.results.flatMap(r =>
            (r.analysis.suggestions || []).map(suggestion => ({
                ...suggestion,
                fileName: r.fileName,
                fileLanguage: r.language,
            }))
        );

        logger.info(`Aggregated: ${aggregatedBugs.length} bugs, ${aggregatedSecurity.length} security issues, ${aggregatedPerformance.length} performance warnings`);

        // Step 7: Save analysis history
        logger.info('Step 7: Saving analysis to database...');

        // Update existing review with final results
        review.fileSize = summary.totalLinesOfCode || 0;
        review.linesOfCode = summary.totalLinesOfCode || 0;
        review.overallScore = summary.averageScore;
        review.bugs = aggregatedBugs;
        review.security = aggregatedSecurity;
        review.performance = aggregatedPerformance;
        review.suggestions = aggregatedSuggestions;
        review.status = 'completed';
        review.progress.percentage = 100;
        review.progress.currentFile = 'Analysis complete';
        review.metadata = {
            repository: {
                owner,
                repo,
                branch,
                commit: treeData.commitSha,
            },
            filesScanned: treeData.totalFiles,
            filesAnalyzed: analysisResults.results.length,
            filesFailed: analysisResults.errors.length,
            summary,
            analyzedAt: new Date(),
        };

        await review.save();

        // Update repository tracking
        await Repo.findOneAndUpdate(
            { userId: req.user._id, repoFullName: `${owner}/${repo}` },
            {
                userId: req.user._id,
                repoName: repo,
                repoFullName: `${owner}/${repo}`,
                repoUrl: `https://github.com/${owner}/${repo}`,
                lastAnalyzedBranch: branch,
                lastAnalyzedAt: new Date(),
                $inc: { totalAnalyses: 1 },
            },
            { upsert: true, new: true }
        );

        logger.info(`Analysis saved successfully with ID: ${review._id}`);

        // Step 8: Return analysis ID
        sendSuccess(res, {
            analysisId: review._id,
            summary: {
                filesAnalyzed: analysisResults.results.length,
                totalIssues: summary.totalIssues,
                overallScore: summary.averageScore,
                highLevelSummary: summary.highLevelSummary,
            },
        }, 'Repository analysis completed successfully', 201);

    } catch (error) {
        logger.error(`GitHub analysis failed: ${error.message}`);
        logger.error(error.stack);

        // Update review status to failed if it exists
        try {
            const failedReview = await Review.findOne({
                userId: req.user._id,
                status: 'in-progress'
            }).sort({ createdAt: -1 });

            if (failedReview) {
                failedReview.status = 'failed';
                failedReview.error = error.message;
                await failedReview.save();
                logger.info(`Updated review ${failedReview._id} status to failed`);
            }
        } catch (updateError) {
            logger.error(`Failed to update review status: ${updateError.message}`);
        }

        sendError(res, error.message || 'Failed to analyze repository', 500);
    }
});

/**
 * @route   GET /api/github/status
 * @desc    Check if GitHub is connected
 * @access  Private
 */
exports.getStatus = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('github githubUsername');
    const connected = !!(user?.github?.accessToken);

    sendSuccess(res, {
        connected,
        username: user?.github?.username || user?.githubUsername || null,
        avatarUrl: user?.github?.avatarUrl || null,
        profileUrl: user?.github?.profileUrl || null,
    }, 'GitHub status retrieved');
});

/**
 * @route   POST /api/github/disconnect
 * @desc    Disconnect GitHub account
 * @access  Private
 */
exports.disconnect = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $unset: { github: '' },
    });

    // Also clear session token if present
    const Session = require('../models/Session.model');
    await Session.updateOne(
        { userId: req.user._id },
        { $unset: { githubAccessToken: 1 } }
    ).catch(() => {});

    logger.info(`GitHub disconnected for user: ${req.user.email}`);

    sendSuccess(res, null, 'GitHub account disconnected');
});

/**
 * @route   GET /api/github/scans
 * @desc    Get recent repository scans
 * @access  Private
 */
exports.getScans = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    logger.info(`Fetching scans for user: ${req.user.email}`);

    // Find reviews where language is 'repository' (repository scans)
    const reviews = await Review.find({
        userId: req.user._id,
        language: 'repository',
    })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .select('fileName status overallScore bugs security performance createdAt progress metadata');

    const total = await Review.countDocuments({
        userId: req.user._id,
        language: 'repository',
    });

    // Transform reviews into scan format
    const scans = reviews.map(review => {
        const repoInfo = review.metadata?.repository || {};
        const repo = review.fileName || `${repoInfo.owner}/${repoInfo.repo}`;
        const branch = repoInfo.branch || 'main';

        return {
            id: review._id,
            repo: repo.replace(/\/main$/, '').replace(/\/master$/, ''),
            branch: branch,
            status: review.status,
            bugs: review.bugs?.length || 0,
            security: review.security?.length || 0,
            performance: review.performance?.length || 0,
            totalIssues: (review.bugs?.length || 0) + (review.security?.length || 0) + (review.performance?.length || 0),
            overallScore: review.overallScore || 0,
            progress: review.progress || { totalFiles: 0, filesAnalyzed: 0, percentage: 0 },
            date: review.createdAt,
        };
    });

    logger.info(`Found ${scans.length} scans for user: ${req.user.email}`);

    sendSuccess(res, {
        scans,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
        },
    }, 'Scans retrieved successfully');
});

/**
 * @route   GET /api/github/scan/:scanId
 * @desc    Get scan status by ID
 * @access  Private
 */
exports.getScan = asyncHandler(async (req, res) => {
    const { scanId } = req.params;

    logger.info(`Fetching scan ${scanId} for user: ${req.user.email}`);

    const review = await Review.findOne({
        _id: scanId,
        userId: req.user._id,
    }).select('fileName status overallScore bugs security performance createdAt progress metadata error');

    if (!review) {
        return sendError(res, 'Scan not found', 404);
    }

    const repoInfo = review.metadata?.repository || {};
    const repo = review.fileName || `${repoInfo.owner}/${repoInfo.repo}`;
    const branch = repoInfo.branch || 'main';

    const scan = {
        id: review._id,
        repo: repo.replace(/\/main$/, '').replace(/\/master$/, ''),
        branch: branch,
        status: review.status,
        bugs: review.bugs?.length || 0,
        security: review.security?.length || 0,
        performance: review.performance?.length || 0,
        totalIssues: (review.bugs?.length || 0) + (review.security?.length || 0) + (review.performance?.length || 0),
        overallScore: review.overallScore || 0,
        progress: review.progress || { totalFiles: 0, filesAnalyzed: 0, percentage: 0, currentFile: '' },
        error: review.error || null,
        date: review.createdAt,
    };

    logger.info(`Scan ${scanId} status: ${scan.status}`);

    sendSuccess(res, scan, 'Scan retrieved successfully');
});

/**
 * @route   POST /api/github/tree
 * @desc    Fetch complete repository file tree
 * @access  Private
 */
exports.getRepoTree = asyncHandler(async (req, res) => {
    const { repo, branch } = req.body;

    if (!repo) {
        return sendError(res, 'Repository is required', 400);
    }

    if (!branch) {
        return sendError(res, 'Branch is required', 400);
    }

    // Parse repo (owner/name format)
    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
        return sendError(res, 'Repository must be in format: owner/name', 400);
    }

    // Get GitHub access token
    const accessToken = await githubService.getGitHubToken(req.user._id);

    if (!accessToken) {
        return sendError(res, 'GitHub not connected. Please connect your GitHub account first.', 401);
    }

    try {
        const treeData = await githubService.fetchCompleteRepoTree(
            accessToken,
            owner,
            repoName,
            branch
        );

        logger.info(`Repository tree fetched for ${repo}/${branch} by user: ${req.user.email}`);

        sendSuccess(res, treeData, 'Repository tree fetched successfully');
    } catch (error) {
        logger.error(`Repository tree fetch error: ${error.message}`);
        sendError(res, error.message || 'Failed to fetch repository tree', 500);
    }
});

/**
 * @route   POST /api/github/file
 * @desc    Fetch single file content from repository
 * @access  Private
 */
exports.getFileContent = asyncHandler(async (req, res) => {
    const { repo, path, branch } = req.body;

    if (!repo) {
        return sendError(res, 'Repository is required', 400);
    }

    if (!path) {
        return sendError(res, 'File path is required', 400);
    }

    if (!branch) {
        return sendError(res, 'Branch is required', 400);
    }

    // Parse repo (owner/name format)
    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
        return sendError(res, 'Repository must be in format: owner/name', 400);
    }

    // Get GitHub access token
    const accessToken = await githubService.getGitHubToken(req.user._id);

    if (!accessToken) {
        return sendError(res, 'GitHub not connected. Please connect your GitHub account first.', 401);
    }

    try {
        const fileData = await githubService.fetchFileContent(
            accessToken,
            owner,
            repoName,
            path,
            branch
        );

        logger.info(`File fetched: ${path} from ${repo}/${branch} by user: ${req.user.email}`);

        sendSuccess(res, fileData, 'File content fetched successfully');
    } catch (error) {
        logger.error(`File fetch error: ${error.message}`);
        sendError(res, error.message || 'Failed to fetch file content', 500);
    }
});

/**
 * @route   POST /api/github/files
 * @desc    Fetch multiple file contents from repository
 * @access  Private
 */
exports.getMultipleFileContents = asyncHandler(async (req, res) => {
    const { repo, paths, branch } = req.body;

    if (!repo) {
        return sendError(res, 'Repository is required', 400);
    }

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
        return sendError(res, 'File paths array is required', 400);
    }

    if (!branch) {
        return sendError(res, 'Branch is required', 400);
    }

    // Parse repo (owner/name format)
    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
        return sendError(res, 'Repository must be in format: owner/name', 400);
    }

    // Get GitHub access token
    const accessToken = await githubService.getGitHubToken(req.user._id);

    if (!accessToken) {
        return sendError(res, 'GitHub not connected. Please connect your GitHub account first.', 401);
    }

    try {
        const results = await githubService.fetchMultipleFileContents(
            accessToken,
            owner,
            repoName,
            paths,
            branch
        );

        logger.info(`Batch fetch: ${results.successCount}/${results.total} files from ${repo}/${branch} by user: ${req.user.email}`);

        sendSuccess(res, results, 'Files fetched successfully');
    } catch (error) {
        logger.error(`Batch file fetch error: ${error.message}`);
        sendError(res, error.message || 'Failed to fetch files', 500);
    }
});

/**
 * @route   POST /api/github/analyze-repo
 * @desc    Analyze entire repository file-by-file
 * @access  Private
 */
exports.analyzeRepoFileByFile = asyncHandler(async (req, res) => {
    const { repo, branch, options } = req.body;

    if (!repo) {
        return sendError(res, 'Repository is required', 400);
    }

    if (!branch) {
        return sendError(res, 'Branch is required', 400);
    }

    // Parse repo (owner/name format)
    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
        return sendError(res, 'Repository must be in format: owner/name', 400);
    }

    // Get GitHub access token
    const accessToken = await githubService.getGitHubToken(req.user._id);

    if (!accessToken) {
        return sendError(res, 'GitHub not connected. Please connect your GitHub account first.', 401);
    }

    try {
        // Set default options
        const analysisOptions = {
            maxFiles: options?.maxFiles || 50,
            maxFileSize: options?.maxFileSize || 100000,
            batchSize: options?.batchSize || 3,
        };

        logger.info(`Starting file-by-file analysis for ${repo}/${branch} with options:`, analysisOptions);

        // Analyze repository
        const analysisResult = await repoAnalysisService.analyzeRepository(
            accessToken,
            owner,
            repoName,
            branch,
            analysisOptions
        );

        // Aggregate all bugs, security issues, and performance warnings
        const aggregatedBugs = analysisResult.results.flatMap(r =>
            (r.analysis.bugs || []).map(bug => ({
                ...bug,
                fileName: r.fileName,
                fileLanguage: r.language,
            }))
        );

        const aggregatedSecurity = analysisResult.results.flatMap(r =>
            (r.analysis.security || []).map(issue => ({
                ...issue,
                fileName: r.fileName,
                fileLanguage: r.language,
            }))
        );

        const aggregatedPerformance = analysisResult.results.flatMap(r =>
            (r.analysis.performance || []).map(warning => ({
                ...warning,
                fileName: r.fileName,
                fileLanguage: r.language,
            }))
        );

        const aggregatedSuggestions = analysisResult.results.flatMap(r =>
            (r.analysis.suggestions || []).map(suggestion => ({
                ...suggestion,
                fileName: r.fileName,
                fileLanguage: r.language,
            }))
        );

        // Save to database with comprehensive metadata
        const review = await Review.create({
            userId: req.user._id,
            fileName: `${repo}/${branch}`,
            language: 'repository',
            fileSize: analysisResult.summary.totalLinesOfCode || 0,
            linesOfCode: analysisResult.summary.totalLinesOfCode || 0,
            code: '', // Don't store entire repo code
            overallScore: analysisResult.summary.averageScore,
            bugs: aggregatedBugs,
            security: aggregatedSecurity,
            performance: aggregatedPerformance,
            suggestions: aggregatedSuggestions,
            status: 'completed',
            analysisTime: analysisResult.totalTime,
            metadata: {
                repository: analysisResult.repository,
                filesScanned: analysisResult.filesScanned,
                filesAnalyzed: analysisResult.filesAnalyzed,
                filesFailed: analysisResult.filesFailed,
                summary: analysisResult.summary,
                totalTime: analysisResult.totalTime,
                analyzedAt: analysisResult.analyzedAt,
            },
        });

        // Update repository tracking
        await Repo.findOneAndUpdate(
            { userId: req.user._id, repoFullName: `${owner}/${repoName}` },
            {
                userId: req.user._id,
                repoName: repoName,
                repoFullName: `${owner}/${repoName}`,
                repoUrl: `https://github.com/${owner}/${repoName}`,
                lastAnalyzedBranch: branch,
                lastAnalyzedAt: new Date(),
                $inc: { totalAnalyses: 1 },
            },
            { upsert: true, new: true }
        );

        logger.info(`Repository analysis saved: ${review._id} for ${repo}/${branch}`);

        // Construct final structured response
        const response = {
            success: true,
            reviewId: review._id,
            repository: analysisResult.repository,
            analysis: {
                filesScanned: analysisResult.filesScanned,
                filesAnalyzed: analysisResult.filesAnalyzed,
                filesFailed: analysisResult.filesFailed,
                totalTime: analysisResult.totalTime,
                analyzedAt: analysisResult.analyzedAt,
            },
            aggregatedResults: {
                totalBugs: analysisResult.summary.totalBugs,
                totalSecurity: analysisResult.summary.totalSecurity,
                totalPerformance: analysisResult.summary.totalPerformance,
                totalIssues: analysisResult.summary.totalIssues,
                totalSuggestions: analysisResult.summary.totalSuggestions,
                criticalIssues: analysisResult.summary.criticalIssues,
                warningIssues: analysisResult.summary.warningIssues,
                infoIssues: analysisResult.summary.infoIssues,
            },
            summary: {
                overallScore: analysisResult.summary.averageScore,
                totalLinesOfCode: analysisResult.summary.totalLinesOfCode,
                highLevelSummary: analysisResult.summary.highLevelSummary,
                fileCategories: analysisResult.summary.fileCategories,
                bySeverity: analysisResult.summary.bySeverity,
                byLanguage: analysisResult.summary.byLanguage,
            },
            detailedResults: analysisResult.results.map(r => ({
                fileName: r.fileName,
                language: r.language,
                linesOfCode: r.linesOfCode,
                overallScore: r.overallScore,
                issueCount: {
                    bugs: r.analysis.bugs.length,
                    security: r.analysis.security.length,
                    performance: r.analysis.performance.length,
                },
            })),
        };

        sendSuccess(res, response, 'Repository analysis completed successfully');

    } catch (error) {
        logger.error(`Repository analysis error: ${error.message}`);
        sendError(res, error.message || 'Failed to analyze repository', 500);
    }
});

/**
 * @route   POST /api/github/add-repo-url
 * @desc    Add a public GitHub repository by URL
 * @access  Private
 */
exports.addRepoByUrl = asyncHandler(async (req, res) => {
    const { repoUrl, branch } = req.body;

    if (!repoUrl) {
        return sendError(res, 'Repository URL is required', 400);
    }

    logger.info(`Adding repository by URL: ${repoUrl} for user ${req.user.email}`);

    // Parse GitHub URL
    // Supports formats: 
    // - https://github.com/owner/repo
    // - https://github.com/owner/repo.git
    // - github.com/owner/repo
    const githubUrlRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/\.]+)(?:\.git)?/i;
    const match = repoUrl.match(githubUrlRegex);

    if (!match) {
        return sendError(res, 'Invalid GitHub repository URL. Expected format: https://github.com/owner/repo', 400);
    }

    const owner = match[1];
    const repo = match[2];
    const repoFullName = `${owner}/${repo}`;

    logger.info(`Parsed repository: ${repoFullName}`);

    try {
        // Fetch repository information from GitHub API (public access)
        const axios = require('axios');
        const githubClient = axios.create({
            baseURL: 'https://api.github.com',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'AI-Code-Reviewer',
            },
        });

        logger.info(`Fetching public repository info from GitHub: ${owner}/${repo}`);

        const repoResponse = await githubClient.get(`/repos/${owner}/${repo}`);
        const repoData = repoResponse.data;

        // Check if repository is public
        if (repoData.private) {
            return sendError(res, 'This repository is private. Please use GitHub OAuth to add private repositories.', 403);
        }

        // Check for duplicate - prevent adding same repo twice
        const existingRepo = await Repo.findOne({
            userId: req.user._id,
            repoFullName: repoData.full_name,
        });

        if (existingRepo) {
            logger.info(`Repository ${repoFullName} already exists for user ${req.user.email}`);
            return sendSuccess(
                res,
                {
                    repo: existingRepo,
                    alreadyExists: true,
                },
                'Repository already exists in your list'
            );
        }

        // Extract repository metadata
        const repoMetadata = {
            userId: req.user._id,
            repoName: repo,
            repoFullName: repoData.full_name,
            repoUrl: repoData.html_url,
            defaultBranch: branch || repoData.default_branch,
            isPrivate: false,
            language: repoData.language,
            description: repoData.description,
        };

        // Save repository to database
        const savedRepo = await Repo.create(repoMetadata);

        logger.info(`Public repository ${repoFullName} successfully added for user ${req.user.email}`);

        sendSuccess(
            res,
            {
                repo: savedRepo,
                alreadyExists: false,
            },
            'Repository added successfully'
        );

    } catch (error) {
        logger.error(`Failed to add repository ${repoFullName}: ${error.message}`);

        // Handle specific GitHub API errors
        if (error.response?.status === 404) {
            return sendError(res, 'Repository not found. Please check the URL and try again.', 404);
        }

        if (error.response?.status === 403) {
            return sendError(res, 'Access denied. This may be a private repository or rate limit exceeded.', 403);
        }

        return sendError(res, `Failed to add repository: ${error.message}`, 500);
    }
});

/**
 * @route   POST /api/github/analyze-file
 * @desc    Analyze a single selected file from GitHub
 * @access  Private
 */
exports.analyzeSelectedFile = asyncHandler(async (req, res) => {
    const { repo, branch, path: filePath } = req.body;

    if (!repo || !branch || !filePath) {
        return sendError(res, 'Repository, branch, and file path are required', 400);
    }

    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
        return sendError(res, 'Repository must be in format: owner/repo', 400);
    }

    const accessToken = await githubService.getGitHubToken(req.user._id);
    if (!accessToken) {
        return sendError(res, 'GitHub not connected. Please connect your GitHub account first.', 401);
    }

    const fileData = await githubService.fetchFileContent(
        accessToken,
        owner,
        repoName,
        filePath,
        branch
    );

    const code = fileData?.content || '';
    if (!code.trim()) {
        return sendError(res, 'Selected file is empty or unreadable', 400);
    }

    const language = detectLanguageFromFilename(filePath);

    const review = await Review.create({
        userId: req.user._id,
        source: 'github',
        fileName: filePath,
        language,
        code,
        linesAnalyzed: code.split('\n').length,
        status: 'in-progress',
        metadata: {
            repository: { owner, repo: repoName, branch },
            selectedFile: filePath,
        },
    });

    try {
        const lintResults = await runESLint(code, language);
        const securityPatterns = analyzeSecurityPatterns(code);
        const aiResults = await reviewCode(code, language, filePath);

        review.bugs = [...(aiResults?.bugs || []), ...(lintResults || [])];
        review.security = [...(aiResults?.security || []), ...(securityPatterns || [])];
        review.performance = aiResults?.performance || [];
        review.suggestions = aiResults?.suggestions || [];
        review.status = 'completed';
        review.calculateScore();
        await review.save();

        logger.info(`Selected file analyzed: ${filePath} from ${repo}/${branch} by user: ${req.user.email}`);

        return sendSuccess(
            res,
            { analysisId: review._id, report: generateReport(review) },
            'Selected file analyzed successfully'
        );
    } catch (err) {
        review.status = 'failed';
        review.error = err.message;
        await review.save();
        return sendError(res, err.message || 'Failed to analyze selected file', 500);
    }
});

/**
 * Delete a repository from user's list
 * DELETE /github/repos/:repoId
 */
exports.deleteRepo = asyncHandler(async (req, res) => {
    try {
        const { repoId } = req.params;
        const userId = req.user.id;

        // Find the repository
        const repo = await Repo.findOne({
            _id: repoId,
            userId: userId
        });

        if (!repo) {
            return sendError(res, 'Repository not found', 404);
        }

        // Delete the repository
        await Repo.deleteOne({ _id: repoId, userId: userId });

        return sendSuccess(res, null, 'Repository removed successfully');
    } catch (error) {
        logger.error('Delete repository error:', error);
        return sendError(res, `Failed to remove repository: ${error.message}`, 500);
    }
});

