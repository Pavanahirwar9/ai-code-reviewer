// backend/src/routes/review-public.routes.js
/**
 * Public Code Review Routes (No Auth Required - For Testing)
 */

const express = require('express');
const router = express.Router();
const { reviewCode } = require('../services/ai.service');
const { runESLint, analyzeSecurityPatterns } = require('../services/lint.service');
const logger = require('../utils/logger');

/**
 * @route   POST /api/public/review/analyze
 * @desc    Analyze code without authentication (for testing)
 * @access  Public
 */
router.post('/analyze', async (req, res) => {
    try {
        const { code, language = 'javascript', fileName = 'untitled.js' } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Code is required'
            });
        }

        logger.info(`Public code analysis requested for ${language}`);
        const startTime = Date.now();

        // Run analyses
        const lintResults = await runESLint(code, language);
        const securityPatterns = analyzeSecurityPatterns(code);
        const aiResults = await reviewCode(code, language, fileName);

        const analysisTime = ((Date.now() - startTime) / 1000).toFixed(1);

        // Merge results
        const response = {
            success: true,
            data: {
                fileName,
                language,
                linesAnalyzed: code.split('\n').length,
                bugs: [...(aiResults.bugs || []), ...lintResults],
                security: [...(aiResults.security || []), ...securityPatterns],
                performance: aiResults.performance || [],
                suggestions: aiResults.suggestions || [],
                analysisTime: `${analysisTime}s`,
                overallScore: calculateScore({
                    bugs: [...(aiResults.bugs || []), ...lintResults],
                    security: [...(aiResults.security || []), ...securityPatterns],
                    performance: aiResults.performance || []
                })
            },
            message: 'Code analysis completed'
        };

        res.status(200).json(response);

    } catch (error) {
        logger.error(`Public analysis error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Analysis failed',
            error: error.message
        });
    }
});

/**
 * Calculate overall score based on issues found
 */
function calculateScore(results) {
    const critical = results.security.filter(i => i.severity === 'critical').length;
    const warnings = results.bugs.length + results.security.filter(i => i.severity === 'warning').length;
    const info = results.performance.length;

    let score = 100;
    score -= (critical * 15);
    score -= (warnings * 5);
    score -= (info * 2);

    return Math.max(0, Math.min(100, score));
}

module.exports = router;
