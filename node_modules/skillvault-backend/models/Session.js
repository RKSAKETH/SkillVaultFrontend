const mongoose = require('mongoose');
const { SESSION_STATUS, MIN_SESSION_DURATION, MAX_SESSION_DURATION } = require('../config/constants');

const sessionSchema = new mongoose.Schema({
    // Tutor (the one teaching)
    tutor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Student (the one learning)
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Skill being taught
    skill: {
        name: {
            type: String,
            required: true
        },
        category: {
            type: String,
            required: true
        }
    },

    // Session timing
    scheduledAt: {
        type: Date,
        required: true,
        index: true
    },

    duration: {
        type: Number, // in minutes
        required: true,
        min: [MIN_SESSION_DURATION, `Minimum session duration is ${MIN_SESSION_DURATION} minutes`],
        max: [MAX_SESSION_DURATION, `Maximum session duration is ${MAX_SESSION_DURATION} minutes`]
    },

    // Credit cost (calculated based on duration and tutor's hourly rate)
    creditCost: {
        type: Number,
        required: true,
        min: [0.5, 'Minimum credit cost is 0.5']
    },

    // Session status with version for optimistic locking
    status: {
        type: String,
        enum: Object.values(SESSION_STATUS),
        default: SESSION_STATUS.PENDING,
        index: true
    },

    // Version for optimistic locking on status changes
    version: {
        type: Number,
        default: 0
    },

    // Timestamps for status changes
    statusHistory: [{
        status: {
            type: String,
            enum: Object.values(SESSION_STATUS)
        },
        changedAt: {
            type: Date,
            default: Date.now
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String
    }],

    // Session notes
    notes: {
        type: String,
        maxlength: 1000
    },

    // Meeting details (could be video link, location, etc.)
    meetingDetails: {
        type: {
            type: String,
            enum: ['video', 'in-person', 'chat'],
            default: 'video'
        },
        link: String,
        location: String
    },

    // Review/Rating (after completion)
    review: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            maxlength: 500
        },
        createdAt: Date
    },

    // Cancellation details
    cancellation: {
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        cancelledAt: Date,
        refunded: {
            type: Boolean,
            default: false
        }
    },

    // Flag to prevent double processing
    isProcessed: {
        type: Boolean,
        default: false
    },

    // Lock timestamp for preventing race conditions
    lockedUntil: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Compound indexes
sessionSchema.index({ tutor: 1, scheduledAt: 1 });
sessionSchema.index({ student: 1, scheduledAt: 1 });
sessionSchema.index({ status: 1, scheduledAt: 1 });
sessionSchema.index({ tutor: 1, status: 1 });
sessionSchema.index({ student: 1, status: 1 });

// Prevent booking with self
sessionSchema.pre('save', function (next) {
    if (this.tutor.equals(this.student)) {
        return next(new Error('Cannot book a session with yourself'));
    }
    next();
});

// Method to check if session can be cancelled
sessionSchema.methods.canBeCancelled = function () {
    const cancellableStatuses = [SESSION_STATUS.PENDING, SESSION_STATUS.CONFIRMED];
    return cancellableStatuses.includes(this.status);
};

// Method to check if session can be completed
sessionSchema.methods.canBeCompleted = function () {
    return this.status === SESSION_STATUS.CONFIRMED || this.status === SESSION_STATUS.IN_PROGRESS;
};

// Static method to find overlapping sessions
sessionSchema.statics.findOverlapping = async function (userId, scheduledAt, duration, excludeSessionId = null) {
    const sessionEnd = new Date(scheduledAt.getTime() + duration * 60000);

    const query = {
        $or: [
            { tutor: userId },
            { student: userId }
        ],
        status: { $in: [SESSION_STATUS.PENDING, SESSION_STATUS.CONFIRMED, SESSION_STATUS.IN_PROGRESS] },
        $and: [
            { scheduledAt: { $lt: sessionEnd } },
            {
                $expr: {
                    $gt: [
                        { $add: ['$scheduledAt', { $multiply: ['$duration', 60000] }] },
                        scheduledAt
                    ]
                }
            }
        ]
    };

    if (excludeSessionId) {
        query._id = { $ne: excludeSessionId };
    }

    return this.find(query);
};

module.exports = mongoose.model('Session', sessionSchema);
