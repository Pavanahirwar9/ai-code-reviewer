// Migration script to update existing repos with new field names
const mongoose = require('mongoose');
const Repo = require('./src/models/Repo.model');
require('dotenv').config();

async function migrateRepos() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all repos
        const repos = await Repo.find({});
        console.log(`Found ${repos.length} repositories to migrate`);

        let updated = 0;
        for (const repo of repos) {
            let needsUpdate = false;
            const updates = {};

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
                console.log(`Updated repo: ${repo.repoFullName || repo.full_name}`);
            }
        }

        console.log(`Migration complete! Updated ${updated} repositories`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateRepos();
