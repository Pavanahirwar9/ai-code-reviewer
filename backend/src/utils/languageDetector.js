// backend/utils/languageDetector.js
/**
 * Language detection utility
 * Detects programming language from file extension or content
 */

const path = require('path');

// Map file extensions to languages
const extensionMap = {
    // JavaScript/TypeScript
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.mjs': 'javascript',
    '.cjs': 'javascript',

    // Python
    '.py': 'python',
    '.pyw': 'python',

    // Java
    '.java': 'java',

    // C/C++
    '.c': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.cxx': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',

    // C#
    '.cs': 'csharp',

    // Ruby
    '.rb': 'ruby',

    // PHP
    '.php': 'php',

    // Go
    '.go': 'go',

    // Rust
    '.rs': 'rust',

    // Swift
    '.swift': 'swift',

    // Kotlin
    '.kt': 'kotlin',
    '.kts': 'kotlin',

    // Scala
    '.scala': 'scala',

    // R
    '.r': 'r',
    '.R': 'r',

    // Objective-C
    '.m': 'objective-c',
    '.mm': 'objective-c',

    // Shell
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'zsh',

    // Web
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',

    // Data formats
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',

    // Others
    '.sql': 'sql',
    '.md': 'markdown',
    '.txt': 'text',
};

/**
 * Detect language from filename
 */
const detectLanguageFromFilename = (filename) => {
    if (!filename) return 'text';

    const ext = path.extname(filename).toLowerCase();
    return extensionMap[ext] || 'text';
};

/**
 * Detect language from code content (basic heuristics)
 */
const detectLanguageFromContent = (code) => {
    if (!code) return 'text';

    // Check for shebang
    if (code.startsWith('#!')) {
        if (code.includes('python')) return 'python';
        if (code.includes('node')) return 'javascript';
        if (code.includes('bash') || code.includes('sh')) return 'bash';
    }

    // Simple heuristics
    if (/^\s*import\s+\w+\s+from\s+['"]/.test(code)) return 'javascript';
    if (/^\s*from\s+\w+\s+import\s+/.test(code)) return 'python';
    if (/^\s*def\s+\w+\s*\(/.test(code)) return 'python';
    if (/^\s*function\s+\w+\s*\(/.test(code)) return 'javascript';
    if (/^\s*public\s+class\s+\w+/.test(code)) return 'java';
    if (/^\s*package\s+\w+/.test(code)) return 'go';

    return 'text';
};

/**
 * Get language display name
 */
const getLanguageName = (lang) => {
    const names = {
        javascript: 'JavaScript',
        jsx: 'React JSX',
        typescript: 'TypeScript',
        tsx: 'React TSX',
        python: 'Python',
        java: 'Java',
        c: 'C',
        cpp: 'C++',
        csharp: 'C#',
        ruby: 'Ruby',
        php: 'PHP',
        go: 'Go',
        rust: 'Rust',
        swift: 'Swift',
        kotlin: 'Kotlin',
        scala: 'Scala',
        r: 'R',
        'objective-c': 'Objective-C',
        bash: 'Bash',
        zsh: 'Zsh',
        html: 'HTML',
        css: 'CSS',
        scss: 'SCSS',
        sass: 'Sass',
        less: 'Less',
        json: 'JSON',
        xml: 'XML',
        yaml: 'YAML',
        sql: 'SQL',
        markdown: 'Markdown',
        text: 'Plain Text',
    };

    return names[lang] || lang;
};

module.exports = {
    detectLanguageFromFilename,
    detectLanguageFromContent,
    getLanguageName,
    extensionMap,
};
