// backend/models/Repo.model.js
/**
 * Repository model for tracking GitHub repositories
 */

const mongoose = require('mongoose');

const repoSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    repoId: {
        type: String, // GitHub repo ID (for OAuth repos)
        sparse: true,
    },
    repoName: {
        type: String,
        required: true,
    },
    repoFullName: {
        type: String,
        required: true,
    },
    name: {
        type: String, // Short repo name (for consistency with GitHub API)
    },
    full_name: {
        type: String, // Full repo name owner/repo (for consistency with GitHub API)
    },
    repoUrl: {
        type: String,
        required: true,
    },
    html_url: {
        type: String, // GitHub URL (for consistency with GitHub API)
    },
    defaultBranch: {
        type: String,
        default: 'main',
    },
    default_branch: {
        type: String, // For consistency with GitHub API
    },
    lastAnalyzedBranch: {
        type: String,
    },
    lastAnalyzedAt: {
        type: Date,
    },
    totalAnalyses: {
        type: Number,
        default: 0,
    },
    isPrivate: {
        type: Boolean,
        default: false,
    },
    private: {
        type: Boolean, // For consistency with GitHub API
        default: false,
    },
    language: {
        type: String,
    },
    description: {
        type: String,
    },
    source: {
        type: String,
        enum: ['github', 'public-url'],
        default: 'github',
    },
    stargazers_count: {
        type: Number,
        default: 0,
    },
    watchers_count: {
        type: Number,
        default: 0,
    },
    forks_count: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Compound index for user and repo uniqueness
repoSchema.index({ userId: 1, repoFullName: 1 }, { unique: true });

module.exports = mongoose.model('Repo', repoSchema);
