// backend/config/github.js
/**
 * GitHub API configuration
 * Configuration for GitHub OAuth and API access
 */

const axios = require('axios');
const logger = require('../utils/logger');

const githubConfig = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/github/callback',
    scope: 'repo read:org read:user',

    // GitHub API endpoints
    endpoints: {
        authorize: 'https://github.com/login/oauth/authorize',
        accessToken: 'https://github.com/login/oauth/access_token',
        user: 'https://api.github.com/user',
        repos: 'https://api.github.com/user/repos',
        repo: 'https://api.github.com/repos',
    },
};

/**
 * Create GitHub API client with access token
 */
const createGitHubClient = (accessToken) => {
    return axios.create({
        baseURL: 'https://api.github.com',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
        },
    });
};

/**
 * Validate GitHub configuration
 */
const validateGitHubConfig = () => {
    const missingVars = [];

    if (!githubConfig.clientId) missingVars.push('GITHUB_CLIENT_ID');
    if (!githubConfig.clientSecret) missingVars.push('GITHUB_CLIENT_SECRET');

    if (missingVars.length > 0) {
        logger.warn(`⚠️  GitHub OAuth not configured. Missing: ${missingVars.join(', ')}`);
        return false;
    }

    logger.info('✅ GitHub OAuth configured');
    return true;
};

module.exports = {
    githubConfig,
    createGitHubClient,
    validateGitHubConfig,
};
