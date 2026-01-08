const express = require('express');
const { body } = require('express-validator');
const { userController } = require('../controllers');
const { auth, optionalAuth, validate } = require('../middleware');

const router = express.Router();

/**
 * @route   GET /api/users/skills/options
 * @desc    Get skill categories and proficiency levels
 * @access  Public
 */
router.get('/skills/options', userController.getSkillOptions);

/**
 * @route   GET /api/users/search
 * @desc    Search for tutors
 * @access  Public (optional auth for excluding self)
 */
router.get('/search', optionalAuth, userController.searchTutors);

/**
 * @route   GET /api/users/:id
 * @desc    Get user public profile
 * @access  Public
 */
router.get('/:id', userController.getProfile);

/**
 * @route   POST /api/users/skills/teaching
 * @desc    Add a teaching skill
 * @access  Private
 */
router.post(
    '/skills/teaching',
    auth,
    [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Skill name is required')
            .isLength({ max: 100 })
            .withMessage('Skill name cannot exceed 100 characters'),
        body('category')
            .notEmpty()
            .withMessage('Category is required'),
        body('proficiency')
            .notEmpty()
            .withMessage('Proficiency level is required'),
        body('description')
            .optional()
            .isLength({ max: 300 })
            .withMessage('Description cannot exceed 300 characters'),
        body('hourlyRate')
            .optional()
            .isFloat({ min: 1, max: 5 })
            .withMessage('Hourly rate must be between 1 and 5 credits')
    ],
    validate,
    userController.addTeachingSkill
);

/**
 * @route   PUT /api/users/skills/teaching/:skillId
 * @desc    Update a teaching skill
 * @access  Private
 */
router.put(
    '/skills/teaching/:skillId',
    auth,
    [
        body('proficiency')
            .optional(),
        body('description')
            .optional()
            .isLength({ max: 300 })
            .withMessage('Description cannot exceed 300 characters'),
        body('hourlyRate')
            .optional()
            .isFloat({ min: 1, max: 5 })
            .withMessage('Hourly rate must be between 1 and 5 credits')
    ],
    validate,
    userController.updateTeachingSkill
);

/**
 * @route   DELETE /api/users/skills/teaching/:skillId
 * @desc    Remove a teaching skill
 * @access  Private
 */
router.delete('/skills/teaching/:skillId', auth, userController.removeTeachingSkill);

/**
 * @route   POST /api/users/skills/learning
 * @desc    Add a learning interest
 * @access  Private
 */
router.post(
    '/skills/learning',
    auth,
    [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Skill name is required')
            .isLength({ max: 100 })
            .withMessage('Skill name cannot exceed 100 characters'),
        body('category')
            .notEmpty()
            .withMessage('Category is required')
    ],
    validate,
    userController.addLearningInterest
);

/**
 * @route   DELETE /api/users/skills/learning/:interestId
 * @desc    Remove a learning interest
 * @access  Private
 */
router.delete('/skills/learning/:interestId', auth, userController.removeLearningInterest);

module.exports = router;
