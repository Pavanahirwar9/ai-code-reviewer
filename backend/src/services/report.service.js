// backend/services/report.service.js
/**
 * Report Service
 * Generates analysis reports and summaries
 */

const logger = require('../utils/logger');

/**
 * Generate comprehensive analysis report
 */
const generateReport = (review) => {
    const totalIssues =
        review.bugs.length +
        review.security.length +
        review.performance.length;

    const criticalCount = [
        ...review.bugs,
        ...review.security,
        ...review.performance,
    ].filter(issue => issue.severity === 'critical').length;

    const warningCount = [
        ...review.bugs,
        ...review.security,
        ...review.performance,
    ].filter(issue => issue.severity === 'warning').length;

    const infoCount = [
        ...review.bugs,
        ...review.security,
        ...review.performance,
    ].filter(issue => issue.severity === 'info').length;

    return {
        summary: {
            fileName: review.fileName,
            language: review.language,
            linesAnalyzed: review.linesAnalyzed,
            analysisTime: review.analysisTime,
            overallScore: review.overallScore,
        },
        code: review.code, // Include the actual code for editing
        statistics: {
            totalIssues,
            critical: criticalCount,
            warning: warningCount,
            info: infoCount,
            bugs: review.bugs.length,
            security: review.security.length,
            performance: review.performance.length,
            suggestions: review.suggestions.length,
        },
        issues: {
            bugs: review.bugs,
            security: review.security,
            performance: review.performance,
            suggestions: review.suggestions,
        },
        metadata: {
            id: review._id,
            source: review.source,
            status: review.status,
            createdAt: review.createdAt,
        },
    };
};

/**
 * Generate summary for history list
 */
const generateSummary = (review) => {
    return {
        id: review._id,
        fileName: review.fileName,
        language: review.language,
        overallScore: review.overallScore,
        totalIssues:
            review.bugs.length +
            review.security.length +
            review.performance.length,
        bugsCount: review.bugs.length,
        securityCount: review.security.length,
        performanceCount: review.performance.length,
        critical: [
            ...review.bugs,
            ...review.security,
            ...review.performance,
        ].filter(issue => issue.severity === 'critical').length,
        status: review.status,
        createdAt: review.createdAt,
    };
};

/**
 * Generate text report for download
 */
const generateTextReport = (review) => {
    let report = '';

    report += `===========================================\n`;
    report += `CODE ANALYSIS REPORT\n`;
    report += `===========================================\n\n`;

    report += `File: ${review.fileName}\n`;
    report += `Language: ${review.language}\n`;
    report += `Lines Analyzed: ${review.linesAnalyzed}\n`;
    report += `Analysis Time: ${review.analysisTime}\n`;
    report += `Overall Score: ${review.overallScore}/100\n`;
    report += `Date: ${new Date(review.createdAt).toLocaleString()}\n\n`;

    report += `===========================================\n`;
    report += `SUMMARY\n`;
    report += `===========================================\n`;
    report += `Total Issues: ${review.bugs.length + review.security.length + review.performance.length}\n`;
    report += `  - Bugs: ${review.bugs.length}\n`;
    report += `  - Security: ${review.security.length}\n`;
    report += `  - Performance: ${review.performance.length}\n`;
    report += `Suggestions: ${review.suggestions.length}\n\n`;

    if (review.bugs.length > 0) {
        report += `===========================================\n`;
        report += `BUGS (${review.bugs.length})\n`;
        report += `===========================================\n\n`;
        review.bugs.forEach((bug, i) => {
            report += `${i + 1}. ${bug.title} [${bug.severity.toUpperCase()}]\n`;
            report += `   Line: ${bug.line}\n`;
            report += `   ${bug.description}\n`;
            report += `   Code: ${bug.code}\n`;
            report += `   Fix: ${bug.suggestion}\n\n`;
        });
    }

    if (review.security.length > 0) {
        report += `===========================================\n`;
        report += `SECURITY ISSUES (${review.security.length})\n`;
        report += `===========================================\n\n`;
        review.security.forEach((issue, i) => {
            report += `${i + 1}. ${issue.title} [${issue.severity.toUpperCase()}]\n`;
            report += `   Line: ${issue.line}\n`;
            report += `   ${issue.description}\n`;
            report += `   Code: ${issue.code}\n`;
            report += `   Fix: ${issue.suggestion}\n\n`;
        });
    }

    if (review.performance.length > 0) {
        report += `===========================================\n`;
        report += `PERFORMANCE (${review.performance.length})\n`;
        report += `===========================================\n\n`;
        review.performance.forEach((issue, i) => {
            report += `${i + 1}. ${issue.title} [${issue.severity.toUpperCase()}]\n`;
            report += `   Line: ${issue.line}\n`;
            report += `   ${issue.description}\n`;
            report += `   Code: ${issue.code}\n`;
            report += `   Fix: ${issue.suggestion}\n\n`;
        });
    }

    if (review.suggestions.length > 0) {
        report += `===========================================\n`;
        report += `SUGGESTIONS (${review.suggestions.length})\n`;
        report += `===========================================\n\n`;
        review.suggestions.forEach((suggestion, i) => {
            report += `${i + 1}. ${suggestion.title}\n`;
            report += `   ${suggestion.description}\n`;
            report += `   ${suggestion.suggestion}\n\n`;
        });
    }

    report += `===========================================\n`;
    report += `END OF REPORT\n`;
    report += `===========================================\n`;

    return report;
};

module.exports = {
    generateReport,
    generateSummary,
    generateTextReport,
};
