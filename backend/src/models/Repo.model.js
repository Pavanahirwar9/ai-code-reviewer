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

// Pre-save middleware to ensure backward compatibility
// Sync old field names with new field names
repoSchema.pre('save', function(next) {
    // If new fields are set, sync to old fields
    if (this.name) this.repoName = this.name;
    if (this.full_name) this.repoFullName = this.full_name;
    if (this.html_url) this.repoUrl = this.html_url;
    if (this.default_branch) this.defaultBranch = this.default_branch;
    if (this.private !== undefined) this.isPrivate = this.private;
    
    // If old fields are set but new fields aren't, sync from old to new
    if (!this.name && this.repoName) this.name = this.repoName;
    if (!this.full_name && this.repoFullName) this.full_name = this.repoFullName;
    if (!this.html_url && this.repoUrl) this.html_url = this.repoUrl;
    if (!this.default_branch && this.defaultBranch) this.default_branch = this.defaultBranch;
    if (this.private === undefined && this.isPrivate !== undefined) this.private = this.isPrivate;
    
    next();
});

// Transform output to include both old and new field names
repoSchema.set('toJSON', {
    transform: function(doc, ret) {
        // Ensure both old and new field names are present
        ret.name = ret.name || ret.repoName;
        ret.full_name = ret.full_name || ret.repoFullName;
        ret.html_url = ret.html_url || ret.repoUrl;
        ret.default_branch = ret.default_branch || ret.defaultBranch;
        ret.private = ret.private !== undefined ? ret.private : ret.isPrivate;
        return ret;
    }
});

// Compound index for user and repo uniqueness
repoSchema.index({ userId: 1, repoFullName: 1 }, { unique: true });

module.exports = mongoose.model('Repo', repoSchema);
