// backend/services/repoAnalysis.service.js
/**
 * Repository Analysis Service
 * Handles file-by-file code analysis for GitHub repositories
 */

const { reviewCode } = require('./ai.service');
const { runESLint, analyzeSecurityPatterns } = require('./lint.service');
const { fetchCompleteRepoTree, fetchMultipleFileContents } = require('./github.service');
const { detectLanguageFromFilename } = require('../utils/languageDetector');
const logger = require('../utils/logger');

/**
 * Analyze a single file
 * Combines ESLint and AI analysis
 */
const analyzeSingleFile = async (fileContent, fileName) => {
    try {
        const language = detectLanguageFromFilename(fileName);
        const code = fileContent;

        logger.info(`Analyzing file: ${fileName} (${language})`);

        // Run ESLint for JS/TS files
        const lintIssues = await runESLint(code, language);

        // Run security pattern analysis
        const securityPatterns = analyzeSecurityPatterns(code);

        // Run AI analysis
        const aiAnalysis = await reviewCode(code, language, fileName);

        // Combine results
        const result = {
            fileName,
            language,
            fileSize: code.length,
            linesOfCode: code.split('\n').length,
            analysis: {
                bugs: [
                    ...lintIssues.filter(issue => issue.severity === 'critical'),
                    ...(aiAnalysis.bugs || [])
                ],
                security: [
                    ...securityPatterns,
                    ...(aiAnalysis.security || [])
                ],
                performance: aiAnalysis.performance || [],
                suggestions: aiAnalysis.suggestions || [],
                lintIssues: lintIssues,
            },
            overallScore: calculateScore(aiAnalysis, lintIssues, securityPatterns),
            analyzedAt: new Date(),
        };

        logger.info(`File analysis complete: ${fileName} - Score: ${result.overallScore}`);

        return result;
    } catch (error) {
        logger.error(`File analysis error for ${fileName}: ${error.message}`);
        throw error;
    }
};

/**
 * Analyze multiple files in batches
 * Processes files one by one to avoid overwhelming the AI API
 * @param {Array} files - Files to analyze
 * @param {Number} batchSize - Number of files to process concurrently
 * @param {Function} progressCallback - Callback for progress updates (filesAnalyzed, currentFile)
 */
const analyzeMultipleFiles = async (files, batchSize = 5, progressCallback = null) => {
    const results = [];
    const errors = [];
    let processed = 0;

    logger.info(`Starting analysis of ${files.length} files in batches of ${batchSize}`);

    // Process files in batches
    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        const batchPromises = batch.map(async (file) => {
            try {
                const result = await analyzeSingleFile(file.content, file.path);
                processed++;
                logger.info(`Progress: ${processed}/${files.length} files analyzed`);

                // Call progress callback if provided
                if (progressCallback) {
                    await progressCallback(processed, file.path);
                }

                return { success: true, data: result };
            } catch (error) {
                logger.error(`Failed to analyze ${file.path}: ${error.message}`);
                processed++;

                // Call progress callback even on error
                if (progressCallback) {
                    await progressCallback(processed, file.path);
                }

                return {
                    success: false,
                    fileName: file.path,
                    error: error.message
                };
            }
        });

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach(result => {
            if (result.status === 'fulfilled') {
                if (result.value.success) {
                    results.push(result.value.data);
                } else {
                    errors.push(result.value);
                }
            } else {
                errors.push({
                    fileName: 'unknown',
                    error: result.reason.message
                });
            }
        });

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < files.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return {
        results,
        errors,
        summary: generateSummary(results),
    };
};

/**
 * Analyze entire GitHub repository
 * Orchestrates the complete workflow
 */
const analyzeRepository = async (accessToken, owner, repo, branch, options = {}) => {
    try {
        const startTime = Date.now();

        logger.info(`Starting repository analysis: ${owner}/${repo}/${branch}`);

        // Step 1: Fetch repository tree (code files only)
        const treeData = await fetchCompleteRepoTree(accessToken, owner, repo, branch);

        logger.info(`Found ${treeData.totalFiles} code files`);

        // Step 2: Filter files based on options
        let filesToAnalyze = treeData.files;

        // Limit number of files if specified
        if (options.maxFiles && filesToAnalyze.length > options.maxFiles) {
            logger.info(`Limiting analysis to ${options.maxFiles} files`);
            filesToAnalyze = filesToAnalyze.slice(0, options.maxFiles);
        }

        // Filter by file size (skip very large files)
        const maxFileSize = options.maxFileSize || 100000; // 100KB default
        filesToAnalyze = filesToAnalyze.filter(file => file.size <= maxFileSize);

        logger.info(`Analyzing ${filesToAnalyze.length} files (after filters)`);

        // Step 3: Fetch file contents
        const filePaths = filesToAnalyze.map(f => f.path);
        const fileContents = await fetchMultipleFileContents(
            accessToken,
            owner,
            repo,
            filePaths,
            branch
        );

        if (fileContents.failCount > 0) {
            logger.warn(`Failed to fetch ${fileContents.failCount} files`);
        }

        // Step 4: Analyze files one by one
        const analysisResults = await analyzeMultipleFiles(
            fileContents.successful,
            options.batchSize || 3
        );

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

        logger.info(`Repository analysis complete in ${totalTime}s`);

        return {
            repository: {
                owner,
                repo,
                branch,
                commit: treeData.commitSha,
            },
            filesScanned: filesToAnalyze.length,
            filesAnalyzed: analysisResults.results.length,
            filesFailed: analysisResults.errors.length,
            results: analysisResults.results,
            errors: analysisResults.errors,
            summary: analysisResults.summary,
            totalTime: `${totalTime}s`,
            analyzedAt: new Date(),
        };

    } catch (error) {
        logger.error(`Repository analysis error: ${error.message}`);
        throw error;
    }
};

/**
 * Calculate overall score based on issues found
 */
const calculateScore = (aiAnalysis, lintIssues, securityPatterns) => {
    let score = 100;

    // Deduct points for different types of issues
    const criticalBugs = (aiAnalysis.bugs || []).filter(b => b.severity === 'critical').length;
    const warningBugs = (aiAnalysis.bugs || []).filter(b => b.severity === 'warning').length;

    score -= criticalBugs * 10;
    score -= warningBugs * 5;
    score -= (aiAnalysis.security || []).length * 8;
    score -= (aiAnalysis.performance || []).length * 3;
    score -= lintIssues.length * 2;
    score -= securityPatterns.length * 10;

    return Math.max(0, Math.min(100, score));
};

/**
 * Generate summary statistics
 */
const generateSummary = (results) => {
    const summary = {
        totalFiles: results.length,
        totalBugs: 0,
        totalSecurity: 0,
        totalPerformance: 0,
        totalSuggestions: 0,
        totalIssues: 0,
        averageScore: 0,
        criticalIssues: 0,
        warningIssues: 0,
        infoIssues: 0,
        byLanguage: {},
        bySeverity: {
            critical: 0,
            warning: 0,
            info: 0,
        },
        fileCategories: {
            clean: 0,           // Score >= 80
            needsAttention: 0,  // Score 50-79
            critical: 0,        // Score < 50
        },
        totalLinesOfCode: 0,
    };

    results.forEach(result => {
        // Count issues
        summary.totalBugs += result.analysis.bugs.length;
        summary.totalSecurity += result.analysis.security.length;
        summary.totalPerformance += result.analysis.performance.length;
        summary.totalSuggestions += result.analysis.suggestions.length;
        summary.averageScore += result.overallScore;
        summary.totalLinesOfCode += result.linesOfCode || 0;

        // Count by severity
        result.analysis.bugs.forEach(bug => {
            if (bug.severity === 'critical') {
                summary.criticalIssues++;
                summary.bySeverity.critical++;
            } else if (bug.severity === 'warning') {
                summary.warningIssues++;
                summary.bySeverity.warning++;
            } else {
                summary.infoIssues++;
                summary.bySeverity.info++;
            }
        });

        // Categorize files by score
        if (result.overallScore >= 80) {
            summary.fileCategories.clean++;
        } else if (result.overallScore >= 50) {
            summary.fileCategories.needsAttention++;
        } else {
            summary.fileCategories.critical++;
        }

        // Count by language
        if (!summary.byLanguage[result.language]) {
            summary.byLanguage[result.language] = {
                files: 0,
                bugs: 0,
                security: 0,
                performance: 0,
                linesOfCode: 0,
            };
        }
        summary.byLanguage[result.language].files++;
        summary.byLanguage[result.language].bugs += result.analysis.bugs.length;
        summary.byLanguage[result.language].security += result.analysis.security.length;
        summary.byLanguage[result.language].performance += result.analysis.performance.length;
        summary.byLanguage[result.language].linesOfCode += result.linesOfCode || 0;
    });

    // Calculate totals
    summary.totalIssues = summary.totalBugs + summary.totalSecurity + summary.totalPerformance;
    summary.averageScore = results.length > 0
        ? Math.round(summary.averageScore / results.length)
        : 0;

    // Generate high-level summary text
    summary.highLevelSummary = generateHighLevelSummary(summary);

    return summary;
};

/**
 * Generate high-level summary text
 */
const generateHighLevelSummary = (summary) => {
    const { totalFiles, totalIssues, totalBugs, totalSecurity, totalPerformance,
        averageScore, criticalIssues, fileCategories } = summary;

    let summaryText = '';

    // Overall assessment
    if (averageScore >= 80) {
        summaryText += `✅ Overall code quality is excellent (${averageScore}/100). `;
    } else if (averageScore >= 60) {
        summaryText += `⚠️ Overall code quality is good but has room for improvement (${averageScore}/100). `;
    } else {
        summaryText += `❌ Overall code quality needs significant improvement (${averageScore}/100). `;
    }

    // File statistics
    summaryText += `Analyzed ${totalFiles} files with ${summary.totalLinesOfCode.toLocaleString()} lines of code. `;

    // Issues breakdown
    if (totalIssues === 0) {
        summaryText += 'No issues detected. Great work! ';
    } else {
        summaryText += `Found ${totalIssues} total issues: `;

        const issueParts = [];
        if (totalBugs > 0) issueParts.push(`${totalBugs} bugs`);
        if (totalSecurity > 0) issueParts.push(`${totalSecurity} security concerns`);
        if (totalPerformance > 0) issueParts.push(`${totalPerformance} performance warnings`);

        summaryText += issueParts.join(', ') + '. ';
    }

    // Critical issues
    if (criticalIssues > 0) {
        summaryText += `⚠️ ${criticalIssues} critical issues require immediate attention. `;
    }

    // File categories
    if (fileCategories.critical > 0) {
        summaryText += `${fileCategories.critical} files need urgent refactoring (score < 50). `;
    }
    if (fileCategories.needsAttention > 0) {
        summaryText += `${fileCategories.needsAttention} files could be improved (score 50-79). `;
    }
    if (fileCategories.clean > 0) {
        summaryText += `${fileCategories.clean} files have good quality (score >= 80). `;
    }

    // Top languages
    const languages = Object.keys(summary.byLanguage);
    if (languages.length > 0) {
        const topLanguage = languages.reduce((prev, curr) =>
            summary.byLanguage[curr].files > summary.byLanguage[prev].files ? curr : prev
        );
        summaryText += `Primary language: ${topLanguage} (${summary.byLanguage[topLanguage].files} files). `;
    }

    return summaryText.trim();
};

module.exports = {
    analyzeSingleFile,
    analyzeMultipleFiles,
    analyzeRepository,
    generateSummary,
};
