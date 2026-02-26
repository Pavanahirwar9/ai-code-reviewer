// backend/services/github.service.js
/**
 * GitHub Service
 * Handles GitHub OAuth and repository operations
 */

const axios = require('axios');
const { githubConfig, createGitHubClient } = require('../config/github');
const Session = require('../models/Session.model');
const Repo = require('../models/Repo.model');
const logger = require('../utils/logger');

/**
 * Generate GitHub OAuth authorization URL
 */
const getAuthorizationURL = (state) => {
    const params = new URLSearchParams({
        client_id: githubConfig.clientId,
        redirect_uri: githubConfig.callbackURL,
        scope: githubConfig.scope,
        state: state || generateRandomState(),
    });

    return `${githubConfig.endpoints.authorize}?${params}`;
};

/**
 * Exchange authorization code for access token
 */
const getAccessToken = async (code) => {
    try {
        const response = await axios.post(
            githubConfig.endpoints.accessToken,
            {
                client_id: githubConfig.clientId,
                client_secret: githubConfig.clientSecret,
                code,
            },
            {
                headers: {
                    Accept: 'application/json',
                },
            }
        );

        if (response.data.error) {
            throw new Error(response.data.error_description || response.data.error);
        }

        return response.data.access_token;
    } catch (error) {
        logger.error(`GitHub access token error: ${error.message}`);
        throw error;
    }
};

/**
 * Get GitHub user information
 */
const getGitHubUser = async (accessToken) => {
    try {
        const client = createGitHubClient(accessToken);
        const response = await client.get('/user');
        return response.data;
    } catch (error) {
        logger.error(`GitHub user fetch error: ${error.message}`);
        throw error;
    }
};

/**
 * Fetch user repositories
 */
const fetchUserRepos = async (accessToken, page = 1, perPage = 30) => {
    try {
        const client = createGitHubClient(accessToken);
        const response = await client.get('/user/repos', {
            params: {
                page,
                per_page: perPage,
                sort: 'updated',
                affiliation: 'owner,collaborator',
            },
        });

        return response.data.map(repo => ({
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            url: repo.html_url,
            defaultBranch: repo.default_branch,
            private: repo.private,
            language: repo.language,
            updatedAt: repo.updated_at,
            size: repo.size,
            stars: repo.stargazers_count,
        }));
    } catch (error) {
        logger.error(`GitHub repos fetch error: ${error.message}`);
        throw error;
    }
};

/**
 * Fetch repository branches
 */
const fetchRepoBranches = async (accessToken, owner, repo) => {
    try {
        const client = createGitHubClient(accessToken);
        const response = await client.get(`/repos/${owner}/${repo}/branches`);

        return response.data.map(branch => branch.name);
    } catch (error) {
        logger.error(`GitHub branches fetch error: ${error.message}`);
        throw error;
    }
};

/**
 * Fetch file content from repository
 * Uses GitHub Contents API to get raw file content
 */
const fetchFileContent = async (accessToken, owner, repo, path, branch = 'main') => {
    try {
        const client = createGitHubClient(accessToken);

        // GitHub Contents API
        const response = await client.get(`/repos/${owner}/${repo}/contents/${path}`, {
            params: { ref: branch },
        });

        // Check if it's a file (not a directory)
        if (response.data.type !== 'file') {
            throw new Error(`Path '${path}' is not a file`);
        }

        // Check file size (GitHub API has 1MB limit for base64 encoded content)
        const maxSize = 1024 * 1024; // 1MB
        if (response.data.size > maxSize) {
            // For large files, use raw content URL
            const rawResponse = await client.get(response.data.download_url, {
                baseURL: '', // Don't use API baseURL for raw content
                transformResponse: [(data) => data], // Don't parse as JSON
            });

            return {
                path: response.data.path,
                name: response.data.name,
                size: response.data.size,
                content: rawResponse.data,
                sha: response.data.sha,
                encoding: 'utf-8',
                url: response.data.html_url,
            };
        }

        // Decode base64 content for files under 1MB
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');

        return {
            path: response.data.path,
            name: response.data.name,
            size: response.data.size,
            content: content,
            sha: response.data.sha,
            encoding: response.data.encoding,
            url: response.data.html_url,
        };
    } catch (error) {
        logger.error(`GitHub file fetch error: ${error.message}`);

        if (error.response?.status === 404) {
            throw new Error(`File '${path}' not found in ${owner}/${repo} on branch '${branch}'`);
        }

        if (error.response?.status === 403) {
            throw new Error('GitHub API rate limit exceeded or access denied');
        }

        throw error;
    }
};

/**
 * Fetch multiple file contents in batch
 * Optimized for fetching multiple files from the same repository
 */
const fetchMultipleFileContents = async (accessToken, owner, repo, filePaths, branch = 'main') => {
    try {
        const results = await Promise.allSettled(
            filePaths.map(path =>
                fetchFileContent(accessToken, owner, repo, path, branch)
            )
        );

        const successful = [];
        const failed = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successful.push(result.value);
            } else {
                failed.push({
                    path: filePaths[index],
                    error: result.reason.message,
                });
            }
        });

        logger.info(`Fetched ${successful.length}/${filePaths.length} files from ${owner}/${repo}/${branch}`);

        return {
            successful,
            failed,
            total: filePaths.length,
            successCount: successful.length,
            failCount: failed.length,
        };
    } catch (error) {
        logger.error(`Batch file fetch error: ${error.message}`);
        throw error;
    }
};

/**
 * Fetch repository tree (file structure)
 */
const fetchRepoTree = async (accessToken, owner, repo, branch = 'main') => {
    try {
        const client = createGitHubClient(accessToken);

        // Get the tree SHA
        const branchResponse = await client.get(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
        const treeSha = branchResponse.data.object.sha;

        // Get the tree
        const treeResponse = await client.get(`/repos/${owner}/${repo}/git/trees/${treeSha}`, {
            params: { recursive: 1 },
        });

        return treeResponse.data.tree.filter(item => item.type === 'blob'); // Only files
    } catch (error) {
        logger.error(`GitHub tree fetch error: ${error.message}`);
        throw error;
    }
};

/**
 * Save GitHub token to session
 */
const saveGitHubToken = async (userId, accessToken, ipAddress, userAgent) => {
    try {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await Session.findOneAndUpdate(
            { userId },
            {
                userId,
                githubAccessToken: accessToken,
                isActive: true,
                expiresAt,
                ipAddress,
                userAgent,
                lastActivity: new Date(),
            },
            { upsert: true, new: true }
        );

        logger.info(`GitHub token saved for user: ${userId}`);
    } catch (error) {
        logger.error(`Save GitHub token error: ${error.message}`);
        throw error;
    }
};

/**
 * Get GitHub token — checks user.github.accessToken first, then session fallback
 */
const getGitHubToken = async (userId) => {
    try {
        // Primary: use token stored on user record (from OAuth login)
        const User = require('../models/User.model');
        const user = await User.findById(userId).select('github');
        if (user?.github?.accessToken) {
            return user.github.accessToken;
        }

        // Fallback: legacy session-based token
        const session = await Session.findOne({
            userId,
            isActive: true,
            expiresAt: { $gt: new Date() },
        });

        return session?.githubAccessToken || null;
    } catch (error) {
        logger.error(`Get GitHub token error: ${error.message}`);
        return null;
    }
};

/**
 * Fetch complete repository tree recursively
 * Uses GitHub Trees API with recursive mode
 * Filters only source code files
 */
const fetchCompleteRepoTree = async (accessToken, owner, repo, branch = 'main') => {
    try {
        const client = createGitHubClient(accessToken);

        // Allowed source code extensions
        const allowedExtensions = [
            '.js', '.jsx', '.ts', '.tsx',     // JavaScript/TypeScript
            '.py', '.pyw',                     // Python
            '.java',                           // Java
            '.go',                             // Go
            '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', // C/C++
            '.cs',                             // C#
            '.rb',                             // Ruby
            '.php',                            // PHP
            '.swift',                          // Swift
            '.kt', '.kts',                     // Kotlin
            '.rs',                             // Rust
            '.vue',                            // Vue
            '.scala',                          // Scala
            '.m', '.mm',                       // Objective-C
            '.dart',                           // Dart
            '.r',                              // R
            '.sql',                            // SQL
            '.sh', '.bash',                    // Shell scripts
        ];

        // Binary and config files to ignore
        const ignoredExtensions = [
            '.min.js', '.min.css',             // Minified files
            '.map',                            // Source maps
            '.lock',                           // Lock files
            '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp', // Images
            '.mp4', '.avi', '.mov', '.wmv',    // Videos
            '.mp3', '.wav', '.ogg',            // Audio
            '.pdf', '.doc', '.docx',           // Documents
            '.zip', '.tar', '.gz', '.rar',     // Archives
            '.exe', '.dll', '.so', '.dylib',   // Binaries
            '.woff', '.woff2', '.ttf', '.eot', // Fonts
            '.db', '.sqlite',                  // Databases
        ];

        // Config and generated files to ignore
        const ignoredFiles = [
            'package-lock.json',
            'yarn.lock',
            'pnpm-lock.yaml',
            'composer.lock',
            'Gemfile.lock',
            'poetry.lock',
            'Cargo.lock',
            '.DS_Store',
            'Thumbs.db',
            '.gitignore',
            '.dockerignore',
            '.eslintrc',
            '.prettierrc',
            'tsconfig.json',
            'jsconfig.json',
            'webpack.config.js',
            'vite.config.js',
            'jest.config.js',
        ];

        // Folders to ignore
        const ignoredFolders = [
            'node_modules',
            'dist',
            'build',
            '.git',
            '.next',
            'vendor',
            'venv',
            '__pycache__',
            '.venv',
            'target',
            'out',
            'coverage',
            '.cache',
            'tmp',
            'temp',
            'logs',
            'public/assets',
            'static/assets',
            'assets',
            '.idea',
            '.vscode',
            '.pytest_cache',
            '__snapshots__',
            '.nuxt',
            '.output',
        ];

        // Get the branch reference to get the commit SHA
        const refResponse = await client.get(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
        const commitSha = refResponse.data.object.sha;

        // Get the commit to get the tree SHA
        const commitResponse = await client.get(`/repos/${owner}/${repo}/git/commits/${commitSha}`);
        const treeSha = commitResponse.data.tree.sha;

        // Fetch the tree recursively (GitHub will return all nested files)
        const treeResponse = await client.get(`/repos/${owner}/${repo}/git/trees/${treeSha}`, {
            params: {
                recursive: 1
            }
        });

        logger.info(`GitHub tree API returned ${treeResponse.data.tree.length} total items for ${owner}/${repo}/${branch}`);

        // Filter and process files
        const files = treeResponse.data.tree
            .filter(item => {
                // Only include files (blobs)
                if (item.type !== 'blob') return false;

                const path = item.path.toLowerCase();
                const fileName = path.split('/').pop();

                // Check if path contains any ignored folder
                const pathParts = path.split('/');
                if (pathParts.some(part => ignoredFolders.includes(part))) {
                    return false;
                }

                // Check if file is in ignored list
                if (ignoredFiles.includes(fileName)) {
                    return false;
                }

                // Check for ignored extensions
                if (ignoredExtensions.some(ext => path.endsWith(ext))) {
                    return false;
                }

                // Check if file has allowed extension
                const hasAllowedExtension = allowedExtensions.some(ext => path.endsWith(ext));

                return hasAllowedExtension;
            })
            .map(item => ({
                path: item.path,
                type: item.type,
                sha: item.sha,
                size: item.size || 0,
                url: item.url,
                extension: item.path.split('.').pop()
            }));

        // Calculate statistics
        const stats = {
            totalFiles: files.length,
            byExtension: files.reduce((acc, file) => {
                const ext = file.extension;
                acc[ext] = (acc[ext] || 0) + 1;
                return acc;
            }, {}),
            totalSize: files.reduce((sum, file) => sum + file.size, 0)
        };

        logger.info(`Fetched ${files.length} code files from ${owner}/${repo}/${branch}`);

        return {
            owner,
            repo,
            branch,
            commitSha,
            totalFiles: files.length,
            files: files,
            stats,
            truncated: treeResponse.data.truncated || false
        };
    } catch (error) {
        logger.error(`GitHub tree fetch error: ${error.message}`);
        if (error.response?.status === 404) {
            throw new Error(`Branch '${branch}' not found in ${owner}/${repo}`);
        }
        throw error;
    }
};

/**
 * Generate random state for CSRF protection
 */
const generateRandomState = () => {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
};

module.exports = {
    getAuthorizationURL,
    getAccessToken,
    getGitHubUser,
    fetchUserRepos,
    fetchRepoBranches,
    fetchFileContent,
    fetchMultipleFileContents,
    fetchRepoTree,
    fetchCompleteRepoTree,
    saveGitHubToken,
    getGitHubToken,
};
