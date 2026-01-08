// Application constants
module.exports = {
    // Initial credits for new users
    INITIAL_CREDITS: 5,

    // Minimum session duration in minutes
    MIN_SESSION_DURATION: 30,

    // Maximum session duration in minutes
    MAX_SESSION_DURATION: 180,

    // Session statuses
    SESSION_STATUS: {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        DISPUTED: 'disputed'
    },

    // Transaction types
    TRANSACTION_TYPE: {
        CREDIT: 'credit',
        DEBIT: 'debit',
        INITIAL: 'initial',
        REFUND: 'refund',
        BONUS: 'bonus'
    },

    // Transaction statuses
    TRANSACTION_STATUS: {
        PENDING: 'pending',
        COMPLETED: 'completed',
        FAILED: 'failed',
        REVERSED: 'reversed'
    },

    // Skill categories
    SKILL_CATEGORIES: [
        'Programming',
        'Mathematics',
        'Science',
        'Languages',
        'Music',
        'Art & Design',
        'Business',
        'Writing',
        'Test Prep',
        'Other'
    ],

    // Proficiency levels
    PROFICIENCY_LEVELS: [
        'Beginner',
        'Intermediate',
        'Advanced',
        'Expert'
    ]
};
