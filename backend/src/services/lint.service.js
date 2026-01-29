// backend/services/lint.service.js
/**
 * Linting Service using ESLint
 * Static code analysis for JavaScript/TypeScript
 */

const { ESLint } = require('eslint');
const logger = require('../utils/logger');

/**
 * Run ESLint on JavaScript/TypeScript code
 */
const runESLint = async (code, language) => {
    // Only run ESLint for JavaScript/TypeScript
    const jsLanguages = ['javascript', 'jsx', 'typescript', 'tsx'];
    if (!jsLanguages.includes(language)) {
        return [];
    }

    try {
        const eslint = new ESLint({
            useEslintrc: false,
            overrideConfig: {
                env: {
                    browser: true,
                    node: true,
                    es2021: true,
                },
                parserOptions: {
                    ecmaVersion: 2021,
                    sourceType: 'module',
                    ecmaFeatures: {
                        jsx: language === 'jsx' || language === 'tsx',
                    },
                },
                extends: ['eslint:recommended'],
                rules: {
                    'no-unused-vars': 'warn',
                    'no-undef': 'warn',
                    'no-console': 'off',
                },
            },
        });

        const results = await eslint.lintText(code, {
            filePath: `temp.${getFileExtension(language)}`,
        });

        const lintIssues = [];

        if (results[0] && results[0].messages) {
            results[0].messages.forEach((msg, index) => {
                lintIssues.push({
                    id: `lint-${index + 1}`,
                    title: msg.message,
                    description: `ESLint ${msg.severity === 2 ? 'error' : 'warning'}: ${msg.ruleId || 'general'}`,
                    line: msg.line,
                    column: msg.column,
                    code: code.split('\n')[msg.line - 1] || '',
                    suggestion: msg.fix ? msg.fix.text : 'See ESLint documentation',
                    severity: msg.severity === 2 ? 'critical' : 'warning',
                    ruleId: msg.ruleId,
                });
            });
        }

        logger.info(`ESLint found ${lintIssues.length} issues`);
        return lintIssues;

    } catch (error) {
        logger.error(`ESLint error: ${error.message}`);
        return [];
    }
};

/**
 * Get file extension for language
 */
const getFileExtension = (language) => {
    const extensions = {
        javascript: 'js',
        jsx: 'jsx',
        typescript: 'ts',
        tsx: 'tsx',
    };
    return extensions[language] || 'js';
};

/**
 * Analyze code security patterns (basic checks)
 */
const analyzeSecurityPatterns = (code) => {
    const issues = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
        // Check for hardcoded secrets
        if (/['"](?:password|secret|apikey|api_key|token)['"]?\s*[:=]\s*['"][^'"]+['"]/.test(line.toLowerCase())) {
            issues.push({
                id: `sec-pattern-${index}`,
                title: 'Potential hardcoded secret',
                description: 'Hardcoded credentials or API keys detected',
                line: index + 1,
                code: line.trim(),
                suggestion: 'Use environment variables for sensitive data',
                severity: 'critical',
            });
        }

        // Check for eval usage
        if (/eval\s*\(/.test(line)) {
            issues.push({
                id: `sec-eval-${index}`,
                title: 'Dangerous eval() usage',
                description: 'eval() can execute arbitrary code and is a security risk',
                line: index + 1,
                code: line.trim(),
                suggestion: 'Avoid using eval(), use safer alternatives',
                severity: 'critical',
            });
        }

        // Check for SQL injection patterns
        if (/(SELECT|INSERT|UPDATE|DELETE)[\s\S]*['"\+]/.test(line)) {
            issues.push({
                id: `sec-sql-${index}`,
                title: 'Potential SQL injection',
                description: 'String concatenation in SQL queries can lead to SQL injection',
                line: index + 1,
                code: line.trim(),
                suggestion: 'Use parameterized queries or ORM',
                severity: 'critical',
            });
        }
    });

    return issues;
};

module.exports = {
    runESLint,
    analyzeSecurityPatterns,
};
