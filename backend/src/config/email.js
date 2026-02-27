// backend/src/config/email.js
/**
 * Email Service using Nodemailer
 * Handles sending password reset and other transactional emails
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Create a nodemailer transporter from environment config
 */
const createTransporter = () => {
  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_SECURE,
  } = process.env;

    if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    logger.warn('Email not configured — set EMAIL_HOST, EMAIL_USER, EMAIL_PASS in .env');
        return null;
    }

    const smtpPort = Number(EMAIL_PORT) || 587;
    const useSecure = String(EMAIL_SECURE || '').toLowerCase() === 'true' || smtpPort === 465;

    return nodemailer.createTransport({
        host: EMAIL_HOST,
      port: smtpPort,
      secure: useSecure,
      requireTLS: true,
      tls: {
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 20000,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });
};

/**
 * Send a password reset email
 * @param {string} to       - Recipient email
 * @param {string} name     - Recipient display name
 * @param {string} resetUrl - Full reset URL with token
 */
const sendPasswordResetEmail = async (to, name, resetUrl) => {
    const transporter = createTransporter();

    if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email service is not configured');
    }
        // In development without email config, log the link so the dev can test it
        logger.info(`[DEV] Password reset link for ${to}: ${resetUrl}`);
        return { devMode: true, resetUrl };
    }

    const from = process.env.EMAIL_FROM || `CodeLens AI <${process.env.EMAIL_USER}>`;

    const mailOptions = {
        from,
        to,
        subject: 'Reset Your CodeLens AI Password',
        text: `
Hi ${name},

You requested a password reset for your CodeLens AI account.

Click the link below to reset your password (valid for 1 hour):

${resetUrl}

If you did not request this, you can safely ignore this email — your password will not change.

— The CodeLens AI Team
        `.trim(),
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;letter-spacing:-0.5px;">&#10024; CodeLens AI</h1>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.75);">Password Reset Request</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#94a3b8;">Hi <strong style="color:#e2e8f0;">${name}</strong>,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
              We received a request to reset the password for your CodeLens AI account.
              Click the button below to choose a new password.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
                Reset My Password
              </a>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Or paste this link into your browser:</p>
            <p style="margin:0 0 24px;font-size:12px;color:#6366f1;word-break:break-all;">${resetUrl}</p>
            <div style="border-top:1px solid #334155;padding-top:20px;">
              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                &#x26A0;&#xFE0F; This link expires in <strong>1 hour</strong>.<br>
                If you did not request a password reset, you can safely ignore this email.
              </p>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#0f172a;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#475569;">&copy; ${new Date().getFullYear()} CodeLens AI. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
        `.trim(),
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${to} — messageId: ${info.messageId}`);
    return info;
};

/**
 * Send an email verification / account activation email
 * @param {string} to          - Recipient email
 * @param {string} name        - Recipient display name
 * @param {string} verifyUrl   - Full verification URL with token
 */
const sendVerificationEmail = async (to, name, verifyUrl) => {
    const transporter = createTransporter();

    if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email service is not configured');
    }
        logger.info(`[DEV] Email verification link for ${to}: ${verifyUrl}`);
        return { devMode: true, verifyUrl };
    }

    const from = process.env.EMAIL_FROM || `CodeLens AI <${process.env.EMAIL_USER}>`;

    const mailOptions = {
        from,
        to,
        subject: 'Verify your CodeLens AI email address',
        text: `Hi ${name},\n\nPlease verify your email by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\n— The CodeLens AI Team`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;">&#10024; CodeLens AI</h1>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.75);">Confirm your email address</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#94a3b8;">Hi <strong style="color:#e2e8f0;">${name}</strong>,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
              Thanks for creating a CodeLens AI account! Click the button below to verify your email address and activate your account.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;text-decoration:none;">
                Verify Email Address
              </a>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Or paste this link into your browser:</p>
            <p style="margin:0 0 24px;font-size:12px;color:#6366f1;word-break:break-all;">${verifyUrl}</p>
            <div style="border-top:1px solid #334155;padding-top:20px;">
              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                &#x26A0;&#xFE0F; This link expires in <strong>24 hours</strong>.<br>
                If you did not create this account, you can safely ignore this email.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#0f172a;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#475569;">&copy; ${new Date().getFullYear()} CodeLens AI. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${to} — messageId: ${info.messageId}`);
    return info;
};

module.exports = { sendPasswordResetEmail, sendVerificationEmail };
