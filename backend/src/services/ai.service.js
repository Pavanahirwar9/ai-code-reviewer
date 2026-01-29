// backend/services/ai.service.js
/**
 * AI Service for code analysis using OpenAI
 * Handles code review requests with AI-powered insights
 */

const { getOpenAIClient } = require('../config/openai');
const logger = require('../utils/logger');

/**
 * Review code using AI
 * Returns structured feedback with bugs, security issues, performance tips, and suggestions
 */
const reviewCode = async (code, language, fileName = 'code.txt') => {
    const openai = getOpenAIClient();

    // If OpenAI is not configured, return mock response
    if (!openai) {
        logger.warn('OpenAI not configured, returning mock AI response');
        return getMockAIResponse(code, language);
    }

    try {
        const startTime = Date.now();

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert code reviewer AI. Analyze the provided code and identify:
1. Bugs and logical errors
2. Security vulnerabilities
3. Performance issues
4. Best practice improvements

For each issue, provide:
- id: unique identifier (bug-1, sec-1, perf-1, sug-1)
- title: descriptive title
- description: detailed explanation
- line: line number (estimate if not clear)
- code: problematic code snippet
- suggestion: fixed code or recommendation
- severity: critical, warning, or info

Return ONLY a JSON object with this exact structure:
{
  "bugs": [...],
  "security": [...],
  "performance": [...],
  "suggestions": [...]
}`
                },
                {
                    role: 'user',
                    content: `Analyze this ${language} code from ${fileName}:\n\n${code}`
                }
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });

        const analysisTime = ((Date.now() - startTime) / 1000).toFixed(1);
        const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

        logger.info(`AI analysis completed in ${analysisTime}s`);

        return {
            bugs: aiResponse.bugs || [],
            security: aiResponse.security || [],
            performance: aiResponse.performance || [],
            suggestions: aiResponse.suggestions || [],
            analysisTime: `${analysisTime}s`,
        };

    } catch (error) {
        logger.error(`AI service error: ${error.message}`);

        // Return mock response on error
        return getMockAIResponse(code, language);
    }
};

/**
 * Summarize lint results with AI
 */
const summarizeLintResults = async (lintResults) => {
    const openai = getOpenAIClient();

    if (!openai || !lintResults || lintResults.length === 0) {
        return null;
    }

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a code quality expert. Summarize the lint errors concisely.'
                },
                {
                    role: 'user',
                    content: `Summarize these lint errors:\n${JSON.stringify(lintResults, null, 2)}`
                }
            ],
            max_tokens: 200,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        logger.error(`AI summarization error: ${error.message}`);
        return null;
    }
};

/**
 * Mock AI response for when OpenAI is not configured
 */
const getMockAIResponse = (code, language) => {
    logger.info('Generating mock AI response');

    const lines = code.split('\n');
    const linesCount = lines.length;
    const hasLoops = /for\s*\(|while\s*\(/i.test(code);
    const hasAsync = /async|await|promise/i.test(code);
    const hasTryCatch = /try\s*\{|catch\s*\(/i.test(code);
    const hasConsole = /console\.(log|error|warn)/i.test(code);
    const hasEval = /eval\s*\(/i.test(code);
    const hasSqlQuery = /select\s+.*from|insert\s+into|update\s+.*set|delete\s+from/i.test(code);
    const hasFileOperations = /fs\.|readFile|writeFile|unlink/i.test(code);
    const hasExec = /exec\s*\(|spawn\s*\(/i.test(code);

    const response = {
        bugs: [],
        security: [],
        performance: [],
        suggestions: [],
        analysisTime: '0.5s',
    };

    // Detect bugs
    if (hasLoops) {
        response.bugs.push({
            id: 'bug-1',
            title: 'Potential off-by-one error in loop',
            description: 'Loop condition might iterate one extra time or miss last element',
            line: lines.findIndex(l => /for\s*\(|while\s*\(/i.test(l)) + 1 || 3,
            code: 'for (let i = 0; i <= items.length; i++)',
            suggestion: 'for (let i = 0; i < items.length; i++)',
            severity: 'warning',
        });
    }

    if (!hasTryCatch && hasAsync) {
        response.bugs.push({
            id: 'bug-2',
            title: 'Unhandled promise rejection',
            description: 'Async operations should be wrapped in try-catch to handle errors',
            line: lines.findIndex(l => /async|await/i.test(l)) + 1 || 5,
            code: 'await someOperation();',
            suggestion: 'try { await someOperation(); } catch (error) { handleError(error); }',
            severity: 'warning',
        });
    }

    if (/==(?!=)/g.test(code)) {
        response.bugs.push({
            id: 'bug-3',
            title: 'Using loose equality (==) instead of strict equality (===)',
            description: 'Loose equality can lead to unexpected type coercion',
            line: lines.findIndex(l => /==(?!=)/.test(l)) + 1 || 7,
            code: 'if (value == 0)',
            suggestion: 'if (value === 0)',
            severity: 'warning',
        });
    }

    // Detect security issues
    if (code.includes('password') || code.includes('apiKey') || code.includes('secret') || code.includes('token')) {
        response.security.push({
            id: 'sec-1',
            title: 'Possible hardcoded credentials',
            description: 'Sensitive data should never be hardcoded. Use environment variables or secure vaults',
            line: lines.findIndex(l => /password|apikey|secret|token/i.test(l)) + 1 || 5,
            code: 'const apiKey = "hardcoded_key"',
            suggestion: 'const apiKey = process.env.API_KEY',
            severity: 'critical',
        });
    }

    if (hasEval) {
        response.security.push({
            id: 'sec-2',
            title: 'Dangerous use of eval()',
            description: 'eval() can execute arbitrary code and is a major security risk',
            line: lines.findIndex(l => /eval\s*\(/i.test(l)) + 1 || 8,
            code: 'eval(userInput)',
            suggestion: 'Use safer alternatives like JSON.parse() or Function constructor with validation',
            severity: 'critical',
        });
    }

    if (hasSqlQuery && /['"].*\+.*['"]/.test(code)) {
        response.security.push({
            id: 'sec-3',
            title: 'SQL injection vulnerability',
            description: 'String concatenation in SQL queries allows SQL injection attacks',
            line: lines.findIndex(l => /select|insert|update|delete/i.test(l)) + 1 || 10,
            code: 'SELECT * FROM users WHERE id = " + userId',
            suggestion: 'Use parameterized queries or prepared statements',
            severity: 'critical',
        });
    }

    if (hasExec) {
        response.security.push({
            id: 'sec-4',
            title: 'Command injection risk',
            description: 'Executing shell commands with user input can lead to command injection',
            line: lines.findIndex(l => /exec\s*\(|spawn\s*\(/i.test(l)) + 1 || 12,
            code: 'exec("command " + userInput)',
            suggestion: 'Validate and sanitize all inputs, use spawn with argument arrays',
            severity: 'critical',
        });
    }

    // Detect performance issues
    if (hasAsync && code.match(/await/g)?.length > 1 && !code.includes('Promise.all')) {
        response.performance.push({
            id: 'perf-1',
            title: 'Sequential awaits reduce performance',
            description: 'Sequential awaits block execution. Use Promise.all for parallel operations',
            line: lines.findIndex(l => /await/.test(l)) + 1 || 10,
            code: 'await operation1(); await operation2();',
            suggestion: 'await Promise.all([operation1(), operation2()])',
            severity: 'info',
        });
    }

    if (hasLoops && /\.push\s*\(/.test(code)) {
        response.performance.push({
            id: 'perf-2',
            title: 'Consider array methods over loops',
            description: 'Array methods like map, filter, reduce are more efficient and readable',
            line: lines.findIndex(l => /\.push\s*\(/.test(l)) + 1 || 15,
            code: 'for (let i = 0; i < arr.length; i++) { newArr.push(arr[i]); }',
            suggestion: 'const newArr = arr.map(item => item);',
            severity: 'info',
        });
    }

    if (hasConsole) {
        response.performance.push({
            id: 'perf-3',
            title: 'Remove console statements in production',
            description: 'Console statements can impact performance and expose sensitive information',
            line: lines.findIndex(l => /console\./i.test(l)) + 1 || 18,
            code: 'console.log(userData)',
            suggestion: 'Use proper logging library with log levels (winston, bunyan)',
            severity: 'info',
        });
    }

    // Add suggestions
    response.suggestions.push({
        id: 'sug-1',
        title: 'Add input validation',
        description: 'Validate all function inputs to prevent runtime errors and improve reliability',
        line: 1,
        code: 'function process(data)',
        suggestion: 'Add type checking, null checks, or use validation library like joi/zod',
        severity: 'info',
    });

    if (!hasTryCatch) {
        response.suggestions.push({
            id: 'sug-2',
            title: 'Add error handling',
            description: 'Implement proper error handling to make code more robust',
            line: 1,
            code: language,
            suggestion: 'Wrap risky operations in try-catch blocks and handle errors appropriately',
            severity: 'info',
        });
    }

    if (!code.includes('//') && !code.includes('/*')) {
        response.suggestions.push({
            id: 'sug-3',
            title: 'Add code documentation',
            description: 'Add comments to explain complex logic and improve maintainability',
            line: 1,
            code: language,
            suggestion: 'Add JSDoc comments for functions and inline comments for complex logic',
            severity: 'info',
        });
    }

    return response;
};

module.exports = {
    reviewCode,
    summarizeLintResults,
};
