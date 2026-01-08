const { SessionService } = require('../services');

/**
 * Session Controller
 * Handles session booking, management, and completion
 */
const sessionController = {
    /**
     * Book a new session
     * POST /api/sessions
     */
    bookSession: async (req, res, next) => {
        try {
            const { tutorId, skillName, skillCategory, scheduledAt, duration, notes, meetingType } = req.body;

            const result = await SessionService.bookSession(
                req.user._id,
                tutorId,
                {
                    skillName,
                    skillCategory,
                    scheduledAt,
                    duration,
                    notes,
                    meetingType
                }
            );

            res.status(201).json({
                success: true,
                data: result
            });

        } catch (error) {
            if (error.message.includes('Insufficient credits') ||
                error.message.includes('Cannot book') ||
                error.message.includes('conflicting') ||
                error.message.includes('not offer')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            next(error);
        }
    },

    /**
     * Get a single session
     * GET /api/sessions/:id
     */
    getSession: async (req, res, next) => {
        try {
            const { Session } = require('../models');

            const session = await Session.findById(req.params.id)
                .populate('tutor', 'firstName lastName avatar email stats.averageRating')
                .populate('student', 'firstName lastName avatar email');

            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
            }

            // Check if user is part of this session
            if (!session.tutor._id.equals(req.user._id) && !session.student._id.equals(req.user._id)) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to view this session'
                });
            }

            res.json({
                success: true,
                data: {
                    session
                }
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Get user's sessions
     * GET /api/sessions
     */
    getMySessions: async (req, res, next) => {
        try {
            const { role, status, page, limit, upcoming } = req.query;

            const result = await SessionService.getUserSessions(req.user._id, {
                role,
                status,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                upcoming: upcoming === 'true'
            });

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Confirm a session (tutor)
     * PUT /api/sessions/:id/confirm
     */
    confirmSession: async (req, res, next) => {
        try {
            const result = await SessionService.confirmSession(
                req.params.id,
                req.user._id
            );

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            if (error.message.includes('not found') ||
                error.message.includes('not the tutor') ||
                error.message.includes('insufficient')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            next(error);
        }
    },

    /**
     * Complete a session
     * PUT /api/sessions/:id/complete
     */
    completeSession: async (req, res, next) => {
        try {
            const result = await SessionService.completeSession(
                req.params.id,
                req.user._id
            );

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            if (error.message.includes('not found') ||
                error.message.includes('already') ||
                error.message.includes('Not authorized') ||
                error.message.includes('Insufficient')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            next(error);
        }
    },

    /**
     * Cancel a session
     * PUT /api/sessions/:id/cancel
     */
    cancelSession: async (req, res, next) => {
        try {
            const { reason } = req.body;

            const result = await SessionService.cancelSession(
                req.params.id,
                req.user._id,
                reason
            );

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            if (error.message.includes('not found') ||
                error.message.includes('cannot be cancelled') ||
                error.message.includes('Not authorized')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            next(error);
        }
    },

    /**
     * Add a review to a completed session
     * POST /api/sessions/:id/review
     */
    addReview: async (req, res, next) => {
        try {
            const { rating, comment } = req.body;

            const result = await SessionService.addReview(
                req.params.id,
                req.user._id,
                rating,
                comment
            );

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            if (error.message.includes('not found') ||
                error.message.includes('cannot review') ||
                error.message.includes('already has')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            next(error);
        }
    }
};

module.exports = sessionController;
