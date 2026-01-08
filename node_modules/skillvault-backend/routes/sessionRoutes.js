const express = require('express');
const { body, query } = require('express-validator');
const { sessionController } = require('../controllers');
const { auth, validate } = require('../middleware');
const { MIN_SESSION_DURATION, MAX_SESSION_DURATION } = require('../config/constants');

const router = express.Router();

// All session routes require authentication
router.use(auth);

/**
 * @route   POST /api/sessions
 * @desc    Book a new session
 * @access  Private
 */
router.post(
    '/',
    [
        body('tutorId')
            .notEmpty()
            .withMessage('Tutor ID is required')
            .isMongoId()
            .withMessage('Invalid tutor ID'),
        body('skillName')
            .trim()
            .notEmpty()
            .withMessage('Skill name is required'),
        body('skillCategory')
            .notEmpty()
            .withMessage('Skill category is required'),
        body('scheduledAt')
            .notEmpty()
            .withMessage('Scheduled date/time is required')
            .isISO8601()
            .withMessage('Invalid date format'),
        body('duration')
            .notEmpty()
            .withMessage('Duration is required')
            .isInt({ min: MIN_SESSION_DURATION, max: MAX_SESSION_DURATION })
            .withMessage(`Duration must be between ${MIN_SESSION_DURATION} and ${MAX_SESSION_DURATION} minutes`),
        body('notes')
            .optional()
            .isLength({ max: 1000 })
            .withMessage('Notes cannot exceed 1000 characters'),
        body('meetingType')
            .optional()
            .isIn(['video', 'in-person', 'chat'])
            .withMessage('Invalid meeting type')
    ],
    validate,
    sessionController.bookSession
);

/**
 * @route   GET /api/sessions
 * @desc    Get user's sessions
 * @access  Private
 */
router.get(
    '/',
    [
        query('role')
            .optional()
            .isIn(['tutor', 'student', 'all'])
            .withMessage('Role must be tutor, student, or all'),
        query('status')
            .optional(),
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100')
    ],
    validate,
    sessionController.getMySessions
);

/**
 * @route   GET /api/sessions/:id
 * @desc    Get a single session
 * @access  Private
 */
router.get('/:id', sessionController.getSession);

/**
 * @route   PUT /api/sessions/:id/confirm
 * @desc    Confirm a pending session (tutor only)
 * @access  Private
 */
router.put('/:id/confirm', sessionController.confirmSession);

/**
 * @route   PUT /api/sessions/:id/complete
 * @desc    Complete a session and transfer credits
 * @access  Private
 */
router.put('/:id/complete', sessionController.completeSession);

/**
 * @route   PUT /api/sessions/:id/cancel
 * @desc    Cancel a session
 * @access  Private
 */
router.put(
    '/:id/cancel',
    [
        body('reason')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Reason cannot exceed 500 characters')
    ],
    validate,
    sessionController.cancelSession
);

/**
 * @route   POST /api/sessions/:id/review
 * @desc    Add a review to a completed session
 * @access  Private
 */
router.post(
    '/:id/review',
    [
        body('rating')
            .notEmpty()
            .withMessage('Rating is required')
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),
        body('comment')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Comment cannot exceed 500 characters')
    ],
    validate,
    sessionController.addReview
);

module.exports = router;
