const { User } = require('../models');
const { TransactionService } = require('../services');
const { TRANSACTION_TYPE, INITIAL_CREDITS } = require('../config/constants');

/**
 * Auth Controller
 * Handles user registration, login, and authentication
 */
const authController = {
    /**
     * Register a new user
     * POST /api/auth/register
     */
    register: async (req, res, next) => {
        try {
            const { email, password, firstName, lastName } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already registered'
                });
            }

            // Create new user
            const user = new User({
                email: email.toLowerCase(),
                password,
                firstName,
                lastName
            });

            await user.save();

            // Create initial credit transaction
            await TransactionService.credit(
                user._id,
                INITIAL_CREDITS,
                TRANSACTION_TYPE.INITIAL,
                'Welcome bonus credits'
            );

            // Generate token
            const token = user.generateAuthToken();

            // Update last login
            user.lastLogin = new Date();
            await user.save();

            res.status(201).json({
                success: true,
                data: {
                    user: {
                        id: user._id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        fullName: user.fullName,
                        creditBalance: user.creditBalance,
                        avatar: user.avatar
                    },
                    token
                }
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Login user
     * POST /api/auth/login
     */
    login: async (req, res, next) => {
        try {
            const { email, password } = req.body;

            // Find user with password
            const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }

            // Check password
            const isMatch = await user.comparePassword(password);

            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }

            if (!user.isActive) {
                return res.status(401).json({
                    success: false,
                    error: 'Account is deactivated'
                });
            }

            // Generate token
            const token = user.generateAuthToken();

            // Update last login
            user.lastLogin = new Date();
            await user.save();

            res.json({
                success: true,
                data: {
                    user: {
                        id: user._id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        fullName: user.fullName,
                        creditBalance: user.creditBalance,
                        avatar: user.avatar,
                        bio: user.bio,
                        teachingSkills: user.teachingSkills || [],
                        learningInterests: user.learningInterests || [],
                        stats: user.stats || {
                            totalSessionsTaught: 0,
                            totalSessionsLearned: 0,
                            totalHoursTaught: 0,
                            totalHoursLearned: 0,
                            averageRating: 0,
                            totalRatings: 0
                        }
                    },
                    token
                }
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Get current user profile
     * GET /api/auth/me
     */
    getMe: async (req, res, next) => {
        try {
            const user = await User.findById(req.user._id);

            res.json({
                success: true,
                data: {
                    user: {
                        id: user._id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        fullName: user.fullName,
                        creditBalance: user.creditBalance,
                        avatar: user.avatar,
                        bio: user.bio,
                        teachingSkills: user.teachingSkills || [],
                        learningInterests: user.learningInterests || [],
                        stats: user.stats || {
                            totalSessionsTaught: 0,
                            totalSessionsLearned: 0,
                            totalHoursTaught: 0,
                            totalHoursLearned: 0,
                            averageRating: 0,
                            totalRatings: 0
                        },
                        availability: user.availability,
                        createdAt: user.createdAt
                    }
                }
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Update current user profile
     * PUT /api/auth/me
     */
    updateMe: async (req, res, next) => {
        try {
            const allowedUpdates = ['firstName', 'lastName', 'bio', 'avatar', 'availability'];
            const updates = {};

            Object.keys(req.body).forEach(key => {
                if (allowedUpdates.includes(key)) {
                    updates[key] = req.body[key];
                }
            });

            const user = await User.findByIdAndUpdate(
                req.user._id,
                { $set: updates },
                { new: true, runValidators: true }
            );

            res.json({
                success: true,
                data: {
                    user: {
                        id: user._id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        fullName: user.fullName,
                        bio: user.bio,
                        avatar: user.avatar,
                        availability: user.availability
                    }
                }
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Change password
     * PUT /api/auth/password
     */
    changePassword: async (req, res, next) => {
        try {
            const { currentPassword, newPassword } = req.body;

            const user = await User.findById(req.user._id).select('+password');

            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }

            user.password = newPassword;
            await user.save();

            res.json({
                success: true,
                message: 'Password updated successfully'
            });

        } catch (error) {
            next(error);
        }
    }
};

module.exports = authController;
