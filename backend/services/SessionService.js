const mongoose = require('mongoose');
const { Session, User } = require('../models');
const TransactionService = require('./TransactionService');
const { SESSION_STATUS, TRANSACTION_TYPE } = require('../config/constants');

/**
 * SessionService handles all session-related operations
 * including booking, confirmation, completion, and cancellation.
 */
class SessionService {
    /**
     * Book a new session with a tutor
     * This reserves credits from the student but doesn't transfer them yet
     */
    static async bookSession(studentId, tutorId, sessionData) {
        const { skillName, skillCategory, scheduledAt, duration, notes, meetingType } = sessionData;

        // Validate inputs
        if (studentId.toString() === tutorId.toString()) {
            throw new Error('Cannot book a session with yourself');
        }

        const scheduledDate = new Date(scheduledAt);
        if (scheduledDate <= new Date()) {
            throw new Error('Session must be scheduled in the future');
        }

        const mongoSession = await mongoose.startSession();

        try {
            let result;

            await mongoSession.withTransaction(async () => {
                // Get tutor and student
                const [tutor, student] = await Promise.all([
                    User.findById(tutorId).session(mongoSession),
                    User.findById(studentId).session(mongoSession)
                ]);

                if (!tutor) throw new Error('Tutor not found');
                if (!student) throw new Error('Student not found');

                // Find the skill in tutor's teaching skills
                const tutorSkill = tutor.teachingSkills.find(
                    s => s.name.toLowerCase() === skillName.toLowerCase() &&
                        s.category === skillCategory
                );

                if (!tutorSkill) {
                    throw new Error('Tutor does not offer this skill');
                }

                // Calculate credit cost based on duration and hourly rate
                const creditCost = (duration / 60) * tutorSkill.hourlyRate;

                // Check student has enough credits
                if (student.creditBalance < creditCost) {
                    throw new Error(`Insufficient credits. You have ${student.creditBalance} credits, but need ${creditCost}`);
                }

                // Check for overlapping sessions for both parties
                const studentOverlaps = await Session.findOverlapping(studentId, scheduledDate, duration);
                if (studentOverlaps.length > 0) {
                    throw new Error('You have a conflicting session at this time');
                }

                const tutorOverlaps = await Session.findOverlapping(tutorId, scheduledDate, duration);
                if (tutorOverlaps.length > 0) {
                    throw new Error('Tutor has a conflicting session at this time');
                }

                // Create the session
                const session = new Session({
                    tutor: tutorId,
                    student: studentId,
                    skill: {
                        name: tutorSkill.name,
                        category: tutorSkill.category
                    },
                    scheduledAt: scheduledDate,
                    duration: duration,
                    creditCost: creditCost,
                    status: SESSION_STATUS.PENDING,
                    notes: notes || '',
                    meetingDetails: {
                        type: meetingType || 'video'
                    },
                    statusHistory: [{
                        status: SESSION_STATUS.PENDING,
                        changedAt: new Date(),
                        changedBy: studentId
                    }]
                });

                await session.save({ session: mongoSession });

                result = {
                    success: true,
                    session: session.toObject(),
                    creditCost: creditCost
                };
            });

            return result;

        } catch (error) {
            console.error('Session booking failed:', error);
            throw error;
        } finally {
            await mongoSession.endSession();
        }
    }

    /**
     * Confirm a pending session (tutor confirms)
     */
    static async confirmSession(sessionId, tutorId) {
        const mongoSession = await mongoose.startSession();

        try {
            let result;

            await mongoSession.withTransaction(async () => {
                // Find and lock the session
                const session = await Session.findOneAndUpdate(
                    {
                        _id: sessionId,
                        tutor: tutorId,
                        status: SESSION_STATUS.PENDING,
                        lockedUntil: { $lt: new Date() }
                    },
                    {
                        $set: { lockedUntil: new Date(Date.now() + 30000) } // 30 second lock
                    },
                    { new: true, session: mongoSession }
                );

                if (!session) {
                    throw new Error('Session not found, already processed, or you are not the tutor');
                }

                // Verify student still has enough credits
                const student = await User.findById(session.student).session(mongoSession);
                if (student.creditBalance < session.creditCost) {
                    // Release lock and reject
                    session.status = SESSION_STATUS.CANCELLED;
                    session.statusHistory.push({
                        status: SESSION_STATUS.CANCELLED,
                        changedAt: new Date(),
                        changedBy: tutorId,
                        reason: 'Student has insufficient credits'
                    });
                    session.lockedUntil = null;
                    await session.save({ session: mongoSession });

                    throw new Error('Student no longer has sufficient credits');
                }

                // Update session status
                session.status = SESSION_STATUS.CONFIRMED;
                session.version += 1;
                session.lockedUntil = null;
                session.statusHistory.push({
                    status: SESSION_STATUS.CONFIRMED,
                    changedAt: new Date(),
                    changedBy: tutorId
                });

                await session.save({ session: mongoSession });

                result = {
                    success: true,
                    session: session.toObject()
                };
            });

            return result;

        } catch (error) {
            console.error('Session confirmation failed:', error);
            throw error;
        } finally {
            await mongoSession.endSession();
        }
    }

    /**
     * Complete a session and transfer credits
     * This is where the actual credit transfer happens
     */
    static async completeSession(sessionId, completedBy) {
        const mongoSession = await mongoose.startSession();

        try {
            let result;

            await mongoSession.withTransaction(async () => {
                // Find and lock the session with version check
                const session = await Session.findOneAndUpdate(
                    {
                        _id: sessionId,
                        $or: [
                            { status: SESSION_STATUS.CONFIRMED },
                            { status: SESSION_STATUS.IN_PROGRESS }
                        ],
                        isProcessed: false,
                        lockedUntil: { $lt: new Date() }
                    },
                    {
                        $set: {
                            lockedUntil: new Date(Date.now() + 60000), // 1 minute lock for transfer
                            isProcessed: true // Mark as being processed
                        }
                    },
                    { new: true, session: mongoSession }
                );

                if (!session) {
                    throw new Error('Session not found, already completed, or is being processed');
                }

                // Verify the user is authorized (either tutor or student)
                if (!session.tutor.equals(completedBy) && !session.student.equals(completedBy)) {
                    // Release lock
                    session.isProcessed = false;
                    session.lockedUntil = null;
                    await session.save({ session: mongoSession });
                    throw new Error('Not authorized to complete this session');
                }

                // Generate idempotency key to prevent double payments
                const idempotencyKey = `session-complete-${sessionId}`;

                // Transfer credits from student to tutor
                // This is done outside the session since TransactionService has its own
                // We'll verify after
                try {
                    await TransactionService.transfer(
                        session.student,
                        session.tutor,
                        session.creditCost,
                        `Session: ${session.skill.name}`,
                        {
                            sessionId: session._id,
                            idempotencyKey: idempotencyKey
                        }
                    );
                } catch (transferError) {
                    // Release lock on failure
                    session.isProcessed = false;
                    session.lockedUntil = null;
                    await session.save({ session: mongoSession });
                    throw transferError;
                }

                // Update session status
                session.status = SESSION_STATUS.COMPLETED;
                session.version += 1;
                session.lockedUntil = null;
                session.statusHistory.push({
                    status: SESSION_STATUS.COMPLETED,
                    changedAt: new Date(),
                    changedBy: completedBy
                });

                await session.save({ session: mongoSession });

                // Update user stats
                await Promise.all([
                    User.updateOne(
                        { _id: session.tutor },
                        {
                            $inc: {
                                'stats.totalSessionsTaught': 1,
                                'stats.totalHoursTaught': session.duration / 60
                            }
                        },
                        { session: mongoSession }
                    ),
                    User.updateOne(
                        { _id: session.student },
                        {
                            $inc: {
                                'stats.totalSessionsLearned': 1,
                                'stats.totalHoursLearned': session.duration / 60
                            }
                        },
                        { session: mongoSession }
                    )
                ]);

                result = {
                    success: true,
                    session: session.toObject(),
                    creditsTransferred: session.creditCost
                };
            });

            return result;

        } catch (error) {
            console.error('Session completion failed:', error);
            throw error;
        } finally {
            await mongoSession.endSession();
        }
    }

    /**
     * Cancel a session
     */
    static async cancelSession(sessionId, cancelledBy, reason) {
        const mongoSession = await mongoose.startSession();

        try {
            let result;

            await mongoSession.withTransaction(async () => {
                const session = await Session.findOneAndUpdate(
                    {
                        _id: sessionId,
                        status: { $in: [SESSION_STATUS.PENDING, SESSION_STATUS.CONFIRMED] },
                        lockedUntil: { $lt: new Date() }
                    },
                    {
                        $set: { lockedUntil: new Date(Date.now() + 30000) }
                    },
                    { new: true, session: mongoSession }
                );

                if (!session) {
                    throw new Error('Session not found or cannot be cancelled');
                }

                // Verify authorization
                if (!session.tutor.equals(cancelledBy) && !session.student.equals(cancelledBy)) {
                    session.lockedUntil = null;
                    await session.save({ session: mongoSession });
                    throw new Error('Not authorized to cancel this session');
                }

                // Update session
                session.status = SESSION_STATUS.CANCELLED;
                session.version += 1;
                session.lockedUntil = null;
                session.cancellation = {
                    cancelledBy: cancelledBy,
                    reason: reason || 'No reason provided',
                    cancelledAt: new Date(),
                    refunded: false // No credits to refund since they weren't taken yet
                };
                session.statusHistory.push({
                    status: SESSION_STATUS.CANCELLED,
                    changedAt: new Date(),
                    changedBy: cancelledBy,
                    reason: reason
                });

                await session.save({ session: mongoSession });

                result = {
                    success: true,
                    session: session.toObject()
                };
            });

            return result;

        } catch (error) {
            console.error('Session cancellation failed:', error);
            throw error;
        } finally {
            await mongoSession.endSession();
        }
    }

    /**
     * Add a review to a completed session
     */
    static async addReview(sessionId, reviewerId, rating, comment) {
        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        const session = await Session.findOne({
            _id: sessionId,
            student: reviewerId,
            status: SESSION_STATUS.COMPLETED
        });

        if (!session) {
            throw new Error('Session not found or you cannot review it');
        }

        if (session.review && session.review.rating) {
            throw new Error('Session already has a review');
        }

        session.review = {
            rating: rating,
            comment: comment || '',
            createdAt: new Date()
        };

        await session.save();

        // Update tutor's average rating
        const tutorSessions = await Session.find({
            tutor: session.tutor,
            status: SESSION_STATUS.COMPLETED,
            'review.rating': { $exists: true }
        });

        const totalRating = tutorSessions.reduce((sum, s) => sum + s.review.rating, 0);
        const avgRating = totalRating / tutorSessions.length;

        await User.updateOne(
            { _id: session.tutor },
            {
                $set: {
                    'stats.averageRating': Math.round(avgRating * 10) / 10,
                    'stats.totalRatings': tutorSessions.length
                }
            }
        );

        return {
            success: true,
            session: session.toObject()
        };
    }

    /**
     * Get sessions for a user
     */
    static async getUserSessions(userId, options = {}) {
        const {
            role = 'all', // 'tutor', 'student', or 'all'
            status = null,
            page = 1,
            limit = 20,
            upcoming = false
        } = options;

        let query = {};

        if (role === 'tutor') {
            query.tutor = userId;
        } else if (role === 'student') {
            query.student = userId;
        } else {
            query.$or = [{ tutor: userId }, { student: userId }];
        }

        if (status) {
            query.status = status;
        }

        if (upcoming) {
            query.scheduledAt = { $gte: new Date() };
            query.status = { $in: [SESSION_STATUS.PENDING, SESSION_STATUS.CONFIRMED] };
        }

        const [sessions, total] = await Promise.all([
            Session.find(query)
                .populate('tutor', 'firstName lastName avatar stats.averageRating')
                .populate('student', 'firstName lastName avatar')
                .sort({ scheduledAt: upcoming ? 1 : -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Session.countDocuments(query)
        ]);

        return {
            sessions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = SessionService;
