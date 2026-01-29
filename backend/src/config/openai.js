// backend/config/openai.js
/**
 * OpenAI API configuration
 * Initializes OpenAI client for code analysis
 */

const OpenAI = require('openai');
const logger = require('../utils/logger');

let openaiClient = null;

const initializeOpenAI = () => {
    if (!process.env.OPENAI_API_KEY) {
        logger.warn('⚠️  OPENAI_API_KEY not set. AI features will use mock responses.');
        return null;
    }

    try {
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        logger.info('✅ OpenAI client initialized');
        return openaiClient;
    } catch (error) {
        logger.error(`❌ OpenAI initialization failed: ${error.message}`);
        return null;
    }
};

const getOpenAIClient = () => {
    if (!openaiClient) {
        openaiClient = initializeOpenAI();
    }
    return openaiClient;
};

module.exports = {
    initializeOpenAI,
    getOpenAIClient,
};
