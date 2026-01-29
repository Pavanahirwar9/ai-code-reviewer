// backend/services/file.service.js
/**
 * File Service
 * Handles file operations and code extraction
 */

const fs = require('fs').promises;
const path = require('path');
const { detectLanguageFromFilename, detectLanguageFromContent } = require('../utils/languageDetector');
const logger = require('../utils/logger');

/**
 * Read uploaded file and extract code
 */
const readUploadedFile = async (filePath) => {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const fileName = path.basename(filePath);
        const language = detectLanguageFromFilename(fileName);

        return {
            code: content,
            fileName,
            language,
            size: Buffer.byteLength(content, 'utf-8'),
        };
    } catch (error) {
        logger.error(`File read error: ${error.message}`);
        throw new Error('Failed to read file');
    }
};

/**
 * Delete uploaded file
 */
const deleteFile = async (filePath) => {
    try {
        await fs.unlink(filePath);
        logger.info(`File deleted: ${filePath}`);
    } catch (error) {
        logger.error(`File delete error: ${error.message}`);
        // Don't throw error, just log it
    }
};

/**
 * Validate file size
 */
const validateFileSize = (size, maxSize = 10 * 1024 * 1024) => {
    if (size > maxSize) {
        throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
    }
    return true;
};

/**
 * Extract code metadata
 */
const extractCodeMetadata = (code, language) => {
    const lines = code.split('\n');
    const linesCount = lines.length;
    const size = Buffer.byteLength(code, 'utf-8');

    // Count non-empty lines
    const nonEmptyLines = lines.filter(line => line.trim().length > 0).length;

    // Count comment lines (basic detection)
    const commentLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed.startsWith('//') ||
            trimmed.startsWith('#') ||
            trimmed.startsWith('/*') ||
            trimmed.startsWith('*');
    }).length;

    return {
        totalLines: linesCount,
        nonEmptyLines,
        commentLines,
        size,
        language,
    };
};

/**
 * Sanitize file name
 */
const sanitizeFileName = (fileName) => {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
};

module.exports = {
    readUploadedFile,
    deleteFile,
    validateFileSize,
    extractCodeMetadata,
    sanitizeFileName,
};
