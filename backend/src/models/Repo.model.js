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
    repoName: {
        type: String,
        required: true,
    },
    repoFullName: {
        type: String,
        required: true,
    },
    repoUrl: {
        type: String,
        required: true,
    },
    defaultBranch: {
        type: String,
        default: 'main',
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
    language: {
        type: String,
    },
    description: {
        type: String,
    },
    owner: {
        type: String,
    },
    stars: {
        type: Number,
        default: 0,
    },
    source: {
        type: String,
        enum: ['github', 'user-github', 'public-url'],
        default: 'github',
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
