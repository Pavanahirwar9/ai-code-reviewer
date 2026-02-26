// backend/utils/validators.js
/**
 * Validation utilities using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');
const { verifyEmail } = require('./verifyEmail');

/**
 * Validate request and return errors
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err) => err.msg);
        return res.status(400).json({
            success: false,
            error: errorMessages.join(', '),
            errors: errors.array().map((err) => ({
                field: err.param,
                message: err.msg,
            })),
        });
    }
    next();
};

/**
 * User registration validation rules
 */
const registerValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail()
        .custom(async (value) => {
            const result = await verifyEmail(value);
            if (!result.valid) throw new Error(result.reason);
            return true;
        }),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

/**
 * Login validation rules
 */
const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required'),
];

/**
 * Code review validation rules
 */
const reviewTextValidation = [
    body('code')
        .notEmpty().withMessage('Code is required')
        .isLength({ max: 100000 }).withMessage('Code is too long (max 100KB)'),

    body('language')
        .optional()
        .isString().withMessage('Language must be a string'),

    body('fileName')
        .optional()
        .isString().withMessage('File name must be a string'),
];

/**
 * Review ID validation
 */
const reviewIdValidation = [
    param('id')
        .notEmpty().withMessage('Review ID is required')
        .isMongoId().withMessage('Invalid review ID'),
];

/**
 * GitHub repository validation
 */
const githubRepoValidation = [
    body('owner')
        .optional()
        .isString().withMessage('Owner must be a string'),

    body('repo')
        .optional()
        .isString().withMessage('Repository name must be a string'),

    body('branch')
        .notEmpty().withMessage('Branch is required')
        .isString().withMessage('Branch must be a string'),
];

/**
 * Pagination validation
 */
const paginationValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

module.exports = {
    validate,
    registerValidation,
    loginValidation,
    reviewTextValidation,
    reviewIdValidation,
    githubRepoValidation,
    paginationValidation,
};
