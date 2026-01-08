const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { TRANSACTION_TYPE, TRANSACTION_STATUS } = require('../config/constants');

const transactionSchema = new mongoose.Schema({
    // Unique transaction ID for idempotency
    transactionId: {
        type: String,
        unique: true,
        default: () => uuidv4(),
        index: true
    },

    // The user whose balance is affected
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // The other party in the transaction (if applicable)
    counterparty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    // Related session (if this is a session payment)
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        default: null
    },

    // Transaction type
    type: {
        type: String,
        enum: Object.values(TRANSACTION_TYPE),
        required: true
    },

    // Amount (always positive, type determines direction)
    amount: {
        type: Number,
        required: true,
        min: [0.01, 'Amount must be positive'],
        validate: {
            validator: function (v) {
                return v > 0;
            },
            message: 'Amount must be a positive number'
        }
    },

    // Balance before transaction
    balanceBefore: {
        type: Number,
        required: true
    },

    // Balance after transaction
    balanceAfter: {
        type: Number,
        required: true
    },

    // Transaction status
    status: {
        type: String,
        enum: Object.values(TRANSACTION_STATUS),
        default: TRANSACTION_STATUS.COMPLETED
    },

    // Description
    description: {
        type: String,
        required: true,
        maxlength: 255
    },

    // Metadata for additional info
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Reference to paired transaction (for transfers)
    pairedTransaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        default: null
    },

    // Idempotency key for preventing duplicate operations
    idempotencyKey: {
        type: String,
        sparse: true
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ session: 1 });
transactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

// Pre-save validation
transactionSchema.pre('save', function (next) {
    // Validate balance consistency
    if (this.type === TRANSACTION_TYPE.CREDIT || this.type === TRANSACTION_TYPE.INITIAL || this.type === TRANSACTION_TYPE.REFUND || this.type === TRANSACTION_TYPE.BONUS) {
        if (this.balanceAfter !== this.balanceBefore + this.amount) {
            return next(new Error('Balance calculation mismatch for credit transaction'));
        }
    } else if (this.type === TRANSACTION_TYPE.DEBIT) {
        if (this.balanceAfter !== this.balanceBefore - this.amount) {
            return next(new Error('Balance calculation mismatch for debit transaction'));
        }
    }

    next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
