// backend/models/User.model.js
/**
 * User model for authentication and user management
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email',
        ],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false, // Don't return password by default
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    githubId: {
        type: String,
        unique: true,
        sparse: true,
    },
    githubUsername: {
        type: String,
    },
    avatar: {
        type: String,
    },
    github: {
        id: { type: String },
        username: { type: String },
        accessToken: { type: String },
        avatarUrl: { type: String },
        profileUrl: { type: String },
        connectedAt: { type: Date },
    },
    google: {
        id: { type: String },
        email: { type: String },
        name: { type: String },
        picture: { type: String },
        accessToken: { type: String },
        connectedAt: { type: Date },
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
        type: Date,
        default: Date.now,
    },
    lastLogin: {
        type: Date,
    },
}, {
    timestamps: true,
});

// Encrypt password before saving
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get public profile
userSchema.methods.getPublicProfile = function () {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
        githubUsername: this.github?.username || this.githubUsername,
        avatar: this.google?.picture || this.github?.avatarUrl || this.avatar,
        githubConnected: !!(this.github?.accessToken),
        googleConnected: !!(this.google?.id),
        createdAt: this.createdAt,
    };
};

module.exports = mongoose.model('User', userSchema);
