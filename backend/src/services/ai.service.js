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
                    content: `You are an expert code reviewer AI. Analyze the provided code deeply and identify:
1. Bugs and logical errors
2. Security vulnerabilities  
3. Performance issues
4. Best practice improvements

For EVERY issue found, you MUST provide ALL of these fields:
- id: unique identifier (bug-1, sec-1, perf-1, sug-1)
- title: short descriptive title (max 8 words)
- description: detailed explanation of WHY this is a problem and what can go wrong
- line: exact line number where the issue occurs (1-based)
- code: the EXACT verbatim text from the file that is problematic — copy it character-for-character including surrounding quotes, semicolons, and operators. This must be a string that literally exists in the source file so it can be found and replaced.
- suggestion: the EXACT replacement text for the "code" field above — same scope and format. If "code" is a full statement, "suggestion" must be a full replacement statement. If "code" is a value/expression, "suggestion" must be just the replacement value/expression. Must be runnable code, never prose.
- howToFix: array of 2-4 clear numbered step strings, e.g. ["1. Remove X", "2. Replace with Y", "3. Add null check"]
- severity: critical, warning, or info

Critical rules:
- "code" and "suggestion" must be at EXACTLY the same scope (both full lines, or both sub-expressions, never mixed)
- "code" must be a verbatim substring of the provided source — do NOT paraphrase or summarise it
- "suggestion" is a direct drop-in replacement for "code" — the file will be patched by replacing "code" with "suggestion"
- "howToFix" must be specific actionable steps
- Be thorough — find real issues, not generic ones

Return ONLY a JSON object with this exact structure (no markdown, no prose outside JSON):
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
            title: 'Off-by-one error in loop condition',
            description: 'Using <= instead of < causes the loop to access one index beyond the last valid element, resulting in undefined access or an unexpected extra iteration.',
            line: lines.findIndex(l => /for\s*\(|while\s*\(/i.test(l)) + 1 || 3,
            code: 'for (let i = 0; i <= items.length; i++)',
            suggestion: 'for (let i = 0; i < items.length; i++)',
            howToFix: [
                '1. Find the loop condition (the middle part of the for statement)',
                '2. Change <= to < so the loop stops before the out-of-bounds index',
                '3. Test with a small array (e.g. length 3) and confirm items[2] is the last accessed',
            ],
            severity: 'warning',
        });
    }

    if (!hasTryCatch && hasAsync) {
        response.bugs.push({
            id: 'bug-2',
            title: 'Unhandled promise rejection',
            description: 'Async/await calls without try-catch silently swallow errors. If the promise rejects, the error is unhandled and can crash the process or leave the app in a broken state.',
            line: lines.findIndex(l => /async|await/i.test(l)) + 1 || 5,
            code: 'await someOperation();',
            suggestion: 'try {\n  await someOperation();\n} catch (error) {\n  console.error(\'Operation failed:\', error);\n}',
            howToFix: [
                '1. Wrap the async call in a try { } block',
                '2. Add a catch (error) { } block immediately after',
                '3. Inside catch, log the error and decide whether to rethrow or return a fallback value',
                '4. Add a finally { } block to clean up resources if needed',
            ],
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
            title: 'Hardcoded credentials detected',
            description: 'Sensitive values (API keys, passwords, tokens) are hardcoded in source code. If committed to version control or leaked, attackers gain immediate full access to the associated service.',
            line: lines.findIndex(l => /password|apikey|secret|token/i.test(l)) + 1 || 5,
            code: 'const apiKey = "sk_live_12345678"',
            suggestion: 'const apiKey = process.env.API_KEY;',
            howToFix: [
                '1. Remove the hardcoded value from source code immediately',
                '2. Create a .env file at the project root: API_KEY=your_actual_value',
                '3. Add .env to .gitignore to prevent committing it',
                '4. Access it in code with process.env.API_KEY',
                '5. If already committed, rotate/invalidate the leaked credential now',
            ],
            severity: 'critical',
        });
    }

    if (hasEval) {
        response.security.push({
            id: 'sec-2',
            title: 'Dangerous eval() — Remote Code Execution risk',
            description: 'eval() executes any string as JavaScript code. If user input reaches eval(), an attacker can run arbitrary code on your server (RCE). This is one of the most critical vulnerabilities possible.',
            line: lines.findIndex(l => /eval\s*\(/i.test(l)) + 1 || 8,
            code: 'eval(userInput)',
            suggestion: '// For JSON data, use JSON.parse() instead:\nconst data = JSON.parse(userInput);',
            howToFix: [
                '1. Remove all eval() calls from the codebase',
                '2. For JSON parsing: replace eval(str) with JSON.parse(str) wrapped in try/catch',
                '3. For math expressions: install and use a safe parser library (e.g. mathjs)',
                '4. Never pass user-controlled data to eval(), Function(), or setTimeout(string)',
            ],
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
            title: 'Sequential awaits blocking parallel I/O',
            description: 'Each sequential await blocks execution until the previous finishes. Independent async operations (e.g. two API calls, two DB queries) run one-at-a-time instead of in parallel, wasting significant time.',
            line: lines.findIndex(l => /await/.test(l)) + 1 || 10,
            code: 'const a = await fetchA();\nconst b = await fetchB();',
            suggestion: 'const [a, b] = await Promise.all([fetchA(), fetchB()]);',
            howToFix: [
                '1. Identify which awaited operations are independent (one result not needed by the next)',
                '2. Replace sequential awaits with: const [r1, r2] = await Promise.all([op1(), op2()])',
                '3. Wrap Promise.all in try/catch to handle any rejection',
                '4. Keep sequential awaits only where one result is required as input to the next call',
            ],
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
            title: 'Replace console.log with a proper logger',
            description: 'console.log() in production leaks internal data, has no log-level filtering, and cannot be disabled without code changes. A structured logger (winston/pino) supports levels, formatting, and log rotation.',
            line: lines.findIndex(l => /console\./i.test(l)) + 1 || 18,
            code: 'console.log(userData)',
            suggestion: "// Install: npm install winston\nconst logger = require('./logger');\nlogger.info('Processing user', { userId: userData.id });",
            howToFix: [
                '1. Install winston: npm install winston',
                '2. Create a logger.js file that configures transports and log levels',
                '3. Import and use logger.info() / logger.error() instead of console.log()',
                '4. Never log sensitive fields like passwords, tokens, or full objects with PII',
            ],
            severity: 'info',
        });
    }

    // Add suggestions
    response.suggestions.push({
        id: 'sug-1',
        title: 'Add input validation to all functions',
        description: 'Functions that accept parameters should validate inputs at entry point. Missing validation leads to runtime errors, unexpected behavior, and potential security issues.',
        line: 1,
        code: 'function process(data) {\n  // no validation\n}',
        suggestion: 'function process(data) {\n  if (!data || typeof data !== \'object\') {\n    throw new Error(\'Invalid input: data must be an object\');\n  }\n  // proceed safely\n}',
        howToFix: [
            '1. At the top of every function, check that required params are not null/undefined',
            '2. Validate types: typeof x === "string", Array.isArray(x), etc.',
            '3. For complex inputs, use a validation library like zod or joi',
            '4. Throw descriptive errors or return early with a clear error message',
        ],
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
