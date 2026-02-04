// backend/src/models/EditorFile.model.js
/**
 * EditorFile model for storing editable code files with analysis results
 */

const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
    line: {
        type: Number,
        required: true,
    },
    column: {
        type: Number,
        default: 0,
    },
    message: {
        type: String,
        required: true,
    },
    severity: {
        type: String,
        enum: ['error', 'warning', 'security', 'info'],
        default: 'warning',
    },
    rule: String,
    source: {
        type: String,
        enum: ['eslint', 'ai', 'security'],
        default: 'eslint',
    },
}, { _id: false });

const editorFileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    scanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Scan',
        default: null,
    },
    filePath: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    originalCode: {
        type: String,
        required: true,
    },
    language: {
        type: String,
        required: true,
    },
    issues: [issueSchema],
    isEdited: {
        type: Boolean,
        default: false,
    },
    editedAt: {
        type: Date,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Index for faster queries
editorFileSchema.index({ userId: 1, createdAt: -1 });
editorFileSchema.index({ scanId: 1 });

// Update the updatedAt timestamp before saving
editorFileSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('EditorFile', editorFileSchema);
