// backend/models/Review.model.js
/**
 * Review model for storing code analysis results
 */

const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
    id: String,
    title: String,
    description: String,
    line: Number,
    code: String,
    suggestion: String,
    severity: {
        type: String,
        enum: ['critical', 'warning', 'info'],
    },
}, { _id: false });

const reviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    source: {
        type: String,
        enum: ['text', 'file', 'github'],
        required: true,
    },
    fileName: {
        type: String,
        default: 'untitled',
    },
    language: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    linesAnalyzed: {
        type: Number,
        default: 0,
    },

    // Analysis results
    bugs: [issueSchema],
    security: [issueSchema],
    performance: [issueSchema],
    suggestions: [issueSchema],

    // Summary
    overallScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
    },
    analysisTime: {
        type: String,
    },

    // Metadata
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'failed'],
        default: 'pending',
    },
    error: {
        type: String,
    },

    // Progress tracking (for repository analysis)
    progress: {
        totalFiles: {
            type: Number,
            default: 0,
        },
        filesAnalyzed: {
            type: Number,
            default: 0,
        },
        currentFile: {
            type: String,
            default: '',
        },
        percentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
    },

    // GitHub specific (if source is github)
    githubRepo: {
        type: String,
    },
    githubBranch: {
        type: String,
    },
    githubPath: {
        type: String,
    },

    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, {
    timestamps: true,
});

// Index for faster queries
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ status: 1 });

// Method to calculate overall score
reviewSchema.methods.calculateScore = function () {
    const totalIssues =
        this.bugs.length +
        this.security.length +
        this.performance.length;

    const criticalCount = [
        ...this.bugs,
        ...this.security,
        ...this.performance,
    ].filter(issue => issue.severity === 'critical').length;

    let score = 100 - (totalIssues * 5) - (criticalCount * 10);
    score = Math.max(0, Math.min(100, score));

    this.overallScore = Math.round(score);
    return this.overallScore;
};

// Method to update progress
reviewSchema.methods.updateProgress = function (filesAnalyzed, currentFile) {
    this.progress.filesAnalyzed = filesAnalyzed;
    this.progress.currentFile = currentFile || '';

    if (this.progress.totalFiles > 0) {
        this.progress.percentage = Math.round((filesAnalyzed / this.progress.totalFiles) * 100);
    }

    return this.save();
};

// Method to get summary
reviewSchema.methods.getSummary = function () {
    return {
        id: this._id,
        fileName: this.fileName,
        language: this.language,
        linesAnalyzed: this.linesAnalyzed,
        analysisTime: this.analysisTime,
        overallScore: this.overallScore,
        totalIssues: this.bugs.length + this.security.length + this.performance.length,
        bugs: this.bugs.length,
        security: this.security.length,
        performance: this.performance.length,
        suggestions: this.suggestions.length,
        status: this.status,
        progress: this.progress,
        createdAt: this.createdAt,
    };
};

module.exports = mongoose.model('Review', reviewSchema);
