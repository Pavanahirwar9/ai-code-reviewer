// backend/src/controllers/migration.controller.js
/**
 * Migration Controller
 * Handles database migrations
 */

const Repo = require('../models/Repo.model');
const { sendSuccess, sendError, asyncHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');

/**
 * @route   POST /api/migrate/repos
 * @desc    Migrate existing repos to new field structure
 * @access  Private (Admin only - add auth if needed)
 */
exports.migrateRepos = asyncHandler(async (req, res) => {
    try {
        logger.info('Starting repository migration...');

        // Find all repos
        const repos = await Repo.find({});
        logger.info(`Found ${repos.length} repositories to check`);

        let updated = 0;
        const results = [];

        for (const repo of repos) {
            const updates = {};
            let needsUpdate = false;

            // Sync old field names to new field names
            if (repo.repoName && !repo.name) {
                updates.name = repo.repoName;
                needsUpdate = true;
            }
            if (repo.repoFullName && !repo.full_name) {
                updates.full_name = repo.repoFullName;
                needsUpdate = true;
            }
            if (repo.repoUrl && !repo.html_url) {
                updates.html_url = repo.repoUrl;
                needsUpdate = true;
            }
            if (repo.defaultBranch && !repo.default_branch) {
                updates.default_branch = repo.defaultBranch;
                needsUpdate = true;
            }
            if (repo.isPrivate !== undefined && repo.private === undefined) {
                updates.private = repo.isPrivate;
                needsUpdate = true;
            }
            if (!repo.source) {
                updates.source = 'github'; // Default to github for existing repos
                needsUpdate = true;
            }

            if (needsUpdate) {
                await Repo.updateOne({ _id: repo._id }, { $set: updates });
                updated++;
                results.push({
                    id: repo._id,
                    name: repo.repoFullName || repo.full_name,
                    updates: Object.keys(updates)
                });
                logger.info(`Updated repo: ${repo.repoFullName || repo.full_name}`);
            }
        }

        logger.info(`Migration complete! Updated ${updated} out of ${repos.length} repositories`);

        return sendSuccess(res, {
            totalRepos: repos.length,
            updatedRepos: updated,
            skippedRepos: repos.length - updated,
            updates: results
        }, `Migration complete! Updated ${updated} repositories`);

    } catch (error) {
        logger.error('Migration error:', error);
        return sendError(res, `Migration failed: ${error.message}`, 500);
    }
});
