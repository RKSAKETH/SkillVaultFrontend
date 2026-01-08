const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { INITIAL_CREDITS, SKILL_CATEGORIES, PROFICIENCY_LEVELS } = require('../config/constants');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false // Don't return password by default
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    avatar: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters'],
        default: ''
    },

    // Credit balance with version for optimistic locking
    creditBalance: {
        type: Number,
        default: 0,
        min: [0, 'Credit balance cannot be negative']
    },

    // Version field for optimistic locking on credit operations
    creditVersion: {
        type: Number,
        default: 0
    },

    // Skills the user can teach
    teachingSkills: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            enum: SKILL_CATEGORIES,
            required: true
        },
        proficiency: {
            type: String,
            enum: PROFICIENCY_LEVELS,
            required: true
        },
        description: {
            type: String,
            maxlength: 300
        },
        hourlyRate: {
            type: Number,
            default: 1, // 1 credit per hour
            min: 1,
            max: 5
        }
    }],

    // Skills the user wants to learn
    learningInterests: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            enum: SKILL_CATEGORIES,
            required: true
        }
    }],

    // User statistics
    stats: {
        totalSessionsTaught: { type: Number, default: 0 },
        totalSessionsLearned: { type: Number, default: 0 },
        totalHoursTaught: { type: Number, default: 0 },
        totalHoursLearned: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 },
        totalRatings: { type: Number, default: 0 }
    },

    // Account status
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },

    // Availability schedule (simplified)
    availability: {
        timezone: {
            type: String,
            default: 'UTC'
        },
        weeklySchedule: {
            type: Map,
            of: [{
                start: String, // "09:00"
                end: String    // "17:00"
            }],
            default: {}
        }
    },

    lastLogin: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance (email index is created automatically by unique: true)
userSchema.index({ 'teachingSkills.name': 'text' });
userSchema.index({ 'teachingSkills.category': 1 });
userSchema.index({ creditBalance: 1 });
userSchema.index({ isActive: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
    return jwt.sign(
        {
            id: this._id,
            email: this.email
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// Get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function () {
    return {
        id: this._id,
        firstName: this.firstName,
        lastName: this.lastName,
        fullName: this.fullName,
        avatar: this.avatar,
        bio: this.bio,
        teachingSkills: this.teachingSkills,
        stats: this.stats,
        createdAt: this.createdAt
    };
};

module.exports = mongoose.model('User', userSchema);
