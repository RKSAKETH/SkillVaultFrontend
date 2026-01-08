const express = require('express');
const { body } = require('express-validator');
const { authController } = require('../controllers');
const { auth, validate } = require('../middleware');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
    '/register',
    [
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
            .matches(/\d/)
            .withMessage('Password must contain a number'),
        body('firstName')
            .trim()
            .notEmpty()
            .withMessage('First name is required')
            .isLength({ max: 50 })
            .withMessage('First name cannot exceed 50 characters'),
        body('lastName')
            .trim()
            .notEmpty()
            .withMessage('Last name is required')
            .isLength({ max: 50 })
            .withMessage('Last name cannot exceed 50 characters')
    ],
    validate,
    authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
    '/login',
    [
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail(),
        body('password')
            .notEmpty()
            .withMessage('Password is required')
    ],
    validate,
    authController.login
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', auth, authController.getMe);

/**
 * @route   PUT /api/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put(
    '/me',
    auth,
    [
        body('firstName')
            .optional()
            .trim()
            .isLength({ max: 50 })
            .withMessage('First name cannot exceed 50 characters'),
        body('lastName')
            .optional()
            .trim()
            .isLength({ max: 50 })
            .withMessage('Last name cannot exceed 50 characters'),
        body('bio')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Bio cannot exceed 500 characters')
    ],
    validate,
    authController.updateMe
);

/**
 * @route   PUT /api/auth/password
 * @desc    Change password
 * @access  Private
 */
router.put(
    '/password',
    auth,
    [
        body('currentPassword')
            .notEmpty()
            .withMessage('Current password is required'),
        body('newPassword')
            .isLength({ min: 8 })
            .withMessage('New password must be at least 8 characters')
            .matches(/\d/)
            .withMessage('New password must contain a number')
    ],
    validate,
    authController.changePassword
);

module.exports = router;
