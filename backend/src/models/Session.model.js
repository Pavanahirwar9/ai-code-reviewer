// backend/models/Session.model.js
/**
 * Session model for storing user sessions and GitHub tokens
 */

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    githubAccessToken: {
        type: String,
    },
    githubRefreshToken: {
        type: String,
    },
    githubTokenExpires: {
        type: Date,
    },
    sessionToken: {
        type: String,
        unique: true,
        sparse: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    ipAddress: {
        type: String,
    },
    userAgent: {
        type: String,
    },
    lastActivity: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// TTL index to auto-delete expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if session is valid
sessionSchema.methods.isValid = function () {
    return this.isActive && this.expiresAt > new Date();
};

module.exports = mongoose.model('Session', sessionSchema);
