// backend/controllers/auth.controller.js
/**
 * Authentication Controller
 * Handles user registration, login, and profile management
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User.model');
const Session = require('../models/Session.model');
const { sendSuccess, sendError, asyncHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d',
    });
};

const getBackendApiBaseUrl = (req) => {
    if (process.env.BACKEND_URL) {
        return process.env.BACKEND_URL;
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}/api`;
};

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
    // Log the incoming request for debugging
    logger.info('Registration request received:', {
        body: req.body,
        headers: req.headers['content-type']
    });

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return sendError(res, 'Email already registered', 400);
    }

    // Generate email verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Create user (not yet verified)
    const user = await User.create({
        name,
        email,
        password,
        isEmailVerified: false,
        emailVerificationToken: hashedToken,
        emailVerificationExpire: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    // Send verification email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/verify-email/${rawToken}`;

    try {
        const { sendVerificationEmail } = require('../config/email');
        const result = await sendVerificationEmail(user.email, user.name, verifyUrl);
        if (result && result.devMode) {
            logger.info(`[DEV] Verify URL: ${verifyUrl}`);
        }
    } catch (emailErr) {
        // Roll back user creation if email fails
        await User.findByIdAndDelete(user._id);
        logger.error(`Failed to send verification email: ${emailErr.message}`);
        return sendError(res, 'Could not send verification email. Please try again.', 500);
    }

    logger.info(`New user registered (pending verification): ${user.email}`);

    return sendSuccess(
        res,
        { needsVerification: true, email: user.email },
        'Account created! Please check your email to verify your account.',
        201
    );
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return sendError(res, 'Invalid credentials', 401);
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        return sendError(res, 'Invalid credentials', 401);
    }

    // Block unverified accounts
    if (!user.isEmailVerified) {
        return res.status(403).json({
            success: false,
            error: 'Please verify your email before logging in.',
            data: { emailNotVerified: true, email: user.email },
        });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Store user info in session
    req.session.userId = user._id.toString();
    req.session.email = user.email;
    req.session.isAuthenticated = true;

    // Update or create session in database
    const sessionToken = generateToken(user._id);
    await Session.findOneAndUpdate(
        { userId: user._id, isActive: true },
        {
            sessionToken,
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        },
        {
            upsert: true,
            new: true,
        }
    );

    // Generate token
    const token = generateToken(user._id);

    logger.info(`User logged in: ${user.email}`);

    sendSuccess(res, {
        token,
        user: user.getPublicProfile(),
    }, 'Login successful');
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and destroy session
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    // Mark all active sessions as inactive in database
    await Session.updateMany(
        { userId, isActive: true },
        { isActive: false, lastActivity: new Date() }
    );

    // Destroy express session
    req.session.destroy((err) => {
        if (err) {
            logger.error('Error destroying session:', err);
        }
    });

    // Clear session cookie
    res.clearCookie('connect.sid');

    logger.info(`User logged out: ${userId}`);

    sendSuccess(res, null, 'Logout successful');
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    sendSuccess(res, user.getPublicProfile(), 'User retrieved successfully');
});

/**
 * @route   PUT /api/auth/update
 * @desc    Update user profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res) => {
    const { name, email } = req.body;

    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (email) fieldsToUpdate.email = email;

    const user = await User.findByIdAndUpdate(
        req.user.id,
        fieldsToUpdate,
        { new: true, runValidators: true }
    );

    logger.info(`User profile updated: ${user.email}`);

    sendSuccess(res, user.getPublicProfile(), 'Profile updated successfully');
});

/**
 * @route   PUT /api/auth/password
 * @desc    Update password
 * @access  Private
 */
exports.updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        return sendError(res, 'Current password is incorrect', 401);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password updated for user: ${user.email}`);

    sendSuccess(res, null, 'Password updated successfully');
});

/**
 * @route   GET /api/auth/github
 * @desc    Redirect to GitHub OAuth login page
 * @access  Public
 */
exports.githubLogin = asyncHandler(async (req, res) => {
    const backendApiBaseUrl = getBackendApiBaseUrl(req);
    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: `${backendApiBaseUrl}/auth/github/callback`,
        scope: 'user:email repo read:user',
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

/**
 * @route   GET /api/auth/github/callback
 * @desc    GitHub OAuth callback — login or register user, return JWT
 * @access  Public
 */
exports.githubCallback = asyncHandler(async (req, res) => {
    const { code } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (!code) {
        return res.redirect(`${frontendUrl}/login?error=no_code`);
    }

    try {
        // 1. Exchange code for access token
        const tokenRes = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
            },
            { headers: { Accept: 'application/json' } }
        );

        const accessToken = tokenRes.data?.access_token;
        if (!accessToken) {
            logger.error('GitHub OAuth: no access token received');
            return res.redirect(`${frontendUrl}/login?error=no_token`);
        }

        // 2. Fetch GitHub user profile + emails
        const [userRes, emailRes] = await Promise.all([
            axios.get('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${accessToken}` },
            }),
            axios.get('https://api.github.com/user/emails', {
                headers: { Authorization: `Bearer ${accessToken}` },
            }).catch(() => ({ data: [] })),
        ]);

        const githubUser = userRes.data;
        const primaryEmail =
            emailRes.data?.find?.((e) => e.primary && e.verified)?.email ||
            emailRes.data?.[0]?.email ||
            `${githubUser.login}@users.noreply.github.com`;

        const githubIdStr = githubUser.id.toString();

        const githubData = {
            id: githubIdStr,
            username: githubUser.login,
            accessToken,
            avatarUrl: githubUser.avatar_url,
            profileUrl: githubUser.html_url,
            connectedAt: new Date(),
        };

        // 3. Find or create user — also check root githubId for legacy accounts
        let user = await User.findOne({
            $or: [
                { 'github.id': githubIdStr },
                { githubId: githubIdStr },
                { email: primaryEmail },
            ],
        });

        if (!user) {
            try {
                user = await User.create({
                    name: githubUser.name || githubUser.login,
                    email: primaryEmail,
                    password: crypto.randomBytes(32).toString('hex'),
                    avatar: githubUser.avatar_url,
                    githubId: githubIdStr,
                    githubUsername: githubUser.login,
                    github: githubData,
                });
                logger.info(`New user created via GitHub OAuth: ${user.email}`);
            } catch (createErr) {
                // Race condition: another concurrent request already created the user
                if (createErr.code === 11000) {
                    user = await User.findOne({
                        $or: [
                            { 'github.id': githubIdStr },
                            { githubId: githubIdStr },
                            { email: primaryEmail },
                        ],
                    });
                    if (!user) throw createErr;
                    logger.info(`Recovered from race condition for: ${user.email}`);
                } else {
                    throw createErr;
                }
            }
        }

        // Always sync latest GitHub data
        user.github = githubData;
        user.githubId = githubIdStr;
        user.githubUsername = githubUser.login;
        user.avatar = user.avatar || githubUser.avatar_url;
        user.lastLogin = new Date();
        await user.save();
        logger.info(`GitHub OAuth login successful: ${user.email}`);

        // 4. Generate JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        // 5. Redirect to frontend success page with token
        return res.redirect(
            `${frontendUrl}/auth/github/success?token=${token}`
        );
    } catch (err) {
        logger.error(`GitHub OAuth callback error: ${err.message}`);
        return res.redirect(`${frontendUrl}/login?error=github_failed`);
    }
});

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify email address and activate account
 * @access  Public
 */
exports.verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params;
    if (!token) return sendError(res, 'Verification token is missing', 400);

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
        return sendError(res, 'Invalid or expired verification link. Please request a new one.', 400);
    }

    // Activate account
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    logger.info(`Email verified for user: ${user.email}`);

    // Create session and return JWT so user is immediately logged in
    const sessionToken = generateToken(user._id);
    await Session.create({
        userId: user._id,
        sessionToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        isActive: true,
    });

    const jwtToken = generateToken(user._id);
    return sendSuccess(res, { token: jwtToken, user: user.getPublicProfile() }, 'Email verified! Welcome to CodeLens AI.');
});

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
exports.resendVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return sendError(res, 'Email is required', 400);

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return success to prevent enumeration
    if (!user || user.isEmailVerified) {
        return sendSuccess(res, null, 'If that account exists and is unverified, a new link has been sent.');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/verify-email/${rawToken}`;

    try {
        const { sendVerificationEmail } = require('../config/email');
        await sendVerificationEmail(user.email, user.name, verifyUrl);
    } catch (err) {
        logger.error(`Failed to resend verification email: ${err.message}`);
        return sendError(res, 'Could not send email. Please try again later.', 500);
    }

    return sendSuccess(res, null, 'If that account exists and is unverified, a new link has been sent.');
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return sendError(res, 'Please provide your email address', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return success to prevent email enumeration
    if (!user) {
        return sendSuccess(res, null, 'If that email is registered, a reset link has been sent.');
    }

    // Generate raw token and store its hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${rawToken}`;

    try {
        const { sendPasswordResetEmail } = require('../config/email');
        const result = await sendPasswordResetEmail(user.email, user.name, resetUrl);

        if (result && result.devMode) {
            logger.info(`[DEV] Reset URL: ${resetUrl}`);
        }
    } catch (emailErr) {
        // Roll back token if email fails
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        logger.error(`Failed to send reset email: ${emailErr.message}`);
        return sendError(res, 'Could not send reset email. Please try again later.', 500);
    }

    return sendSuccess(res, null, 'If that email is registered, a reset link has been sent.');
});

/**
 * @route   PUT /api/auth/reset-password/:token
 * @desc    Reset password using token
 * @access  Public
 */
exports.resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
        return sendError(res, 'Reset token is missing', 400);
    }
    if (!password || password.length < 6) {
        return sendError(res, 'Password must be at least 6 characters', 400);
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
        return sendError(res, 'Invalid or expired reset token', 400);
    }

    // Set new password and clear reset fields
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    logger.info(`Password reset successful for user: ${user.email}`);

    // Return a fresh JWT so the user is immediately logged in
    const jwtToken = generateToken(user._id);
    return sendSuccess(res, { token: jwtToken }, 'Password reset successfully');
});

/**
 * @route   GET /api/auth/google
 * @desc    Redirect to Google OAuth
 * @access  Public
 */
exports.googleLogin = asyncHandler(async (req, res) => {
    const backendApiBaseUrl = getBackendApiBaseUrl(req);
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: `${backendApiBaseUrl}/auth/google/callback`,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'select_account',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback — exchange code, find/create user, return JWT
 * @access  Public
 */
exports.googleCallback = asyncHandler(async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const { code, error: oauthError } = req.query;
    const backendApiBaseUrl = getBackendApiBaseUrl(req);

    // Google returned an explicit error (e.g. user denied access)
    if (oauthError) {
        logger.warn(`Google OAuth denied by user: ${oauthError}`);
        return res.redirect(`${frontendUrl}/login?error=google_denied`);
    }

    if (!code) {
        return res.redirect(`${frontendUrl}/login?error=google_no_code`);
    }

    const redirectUri = `${backendApiBaseUrl}/auth/google/callback`;

    try {
        // 1. Exchange auth code for Google access token
        let tokenData;
        try {
            const tokenRes = await axios.post(
                'https://oauth2.googleapis.com/token',
                {
                    code,
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                },
                { headers: { 'Content-Type': 'application/json' } }
            );
            tokenData = tokenRes.data;
        } catch (tokenErr) {
            const detail = tokenErr.response?.data?.error_description || tokenErr.response?.data?.error || tokenErr.message;
            logger.error(`Google token exchange failed: ${detail}`);
            return res.redirect(`${frontendUrl}/login?error=google_token_failed&detail=${encodeURIComponent(detail)}`);
        }

        const { access_token } = tokenData;
        if (!access_token) {
            logger.error('Google token exchange returned no access_token');
            return res.redirect(`${frontendUrl}/login?error=google_no_token`);
        }

        // 2. Fetch Google user profile
        let googleUser;
        try {
            const profileRes = await axios.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                { headers: { Authorization: `Bearer ${access_token}` } }
            );
            googleUser = profileRes.data;
        } catch (profileErr) {
            logger.error(`Google profile fetch failed: ${profileErr.message}`);
            return res.redirect(`${frontendUrl}/login?error=google_profile_failed`);
        }

        logger.info(`Google profile received: ${JSON.stringify({ id: googleUser.id, email: googleUser.email, verified: googleUser.verified_email })}`);

        // 3. Find existing user by Google ID or email
        let user = await User.findOne({
            $or: [
                { 'google.id': String(googleUser.id) },
                { email: googleUser.email.toLowerCase() },
            ],
        });

        const googleData = {
            id: String(googleUser.id),
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture,
            accessToken: access_token,
            connectedAt: new Date(),
        };

        if (!user) {
            // New user — create account via Google (bypass email validation middleware)
            user = new User({
                name: googleUser.name,
                email: googleUser.email.toLowerCase(),
                password: crypto.randomBytes(32).toString('hex'),
                avatar: googleUser.picture,
                isEmailVerified: true,
                google: googleData,
            });
            await user.save({ validateBeforeSave: false });
            logger.info(`New user created via Google OAuth: ${user.email}`);
        } else {
            // Existing user — update Google info
            user.google = googleData;
            user.isEmailVerified = true;
            if (!user.avatar) user.avatar = googleUser.picture;
            user.lastLogin = new Date();
            await user.save({ validateBeforeSave: false });
            logger.info(`Existing user logged in via Google OAuth: ${user.email}`);
        }

        // 4. Generate JWT and redirect to success page
        const token = generateToken(user._id);
        return res.redirect(`${frontendUrl}/auth/google/success?token=${token}`);

    } catch (err) {
        const msg = err.response?.data?.error || err.message || 'Unknown error';
        logger.error(`Google OAuth callback unhandled error: ${msg}`, { stack: err.stack });
        return res.redirect(`${frontendUrl}/login?error=google_failed&detail=${encodeURIComponent(msg)}`);
    }
});
