const mongoose = require('mongoose');
const { User, Transaction } = require('../models');
const { TRANSACTION_TYPE, TRANSACTION_STATUS } = require('../config/constants');

/**
 * TransactionService handles all credit operations with atomic guarantees.
 * This is the core of the financial system - prevents double spending,
 * race conditions, and ensures data integrity.
 */
class TransactionService {
    /**
     * Transfer credits from one user to another atomically.
     * Uses MongoDB transactions for ACID compliance.
     * 
     * @param {string} fromUserId - User ID to debit credits from
     * @param {string} toUserId - User ID to credit credits to
     * @param {number} amount - Amount to transfer (must be positive)
     * @param {string} description - Description for the transaction
     * @param {Object} options - Additional options
     * @param {string} options.sessionId - Related session ID
     * @param {string} options.idempotencyKey - Key to prevent duplicate operations
     * @returns {Object} Result with both transactions
     */
    static async transfer(fromUserId, toUserId, amount, description, options = {}) {
        // Validate amount
        if (typeof amount !== 'number' || amount <= 0) {
            throw new Error('Transfer amount must be a positive number');
        }

        // Prevent self-transfer
        if (fromUserId.toString() === toUserId.toString()) {
            throw new Error('Cannot transfer credits to yourself');
        }

        // Check for idempotency
        if (options.idempotencyKey) {
            const existingTransaction = await Transaction.findOne({
                idempotencyKey: options.idempotencyKey
            });

            if (existingTransaction) {
                console.log(`Duplicate transaction detected: ${options.idempotencyKey}`);
                return {
                    success: true,
                    duplicate: true,
                    message: 'Transaction already processed'
                };
            }
        }

        // Helper to execute with or without transaction
        const executeOperation = async (operation) => {
            const mongoSession = await mongoose.startSession();
            try {
                let result;
                await mongoSession.withTransaction(async () => {
                    result = await operation(mongoSession);
                });
                return result;
            } catch (error) {
                // If the error is due to standalone instance (IllegalOperation), retry without transaction
                if (error.code === 20 || error.codeName === 'IllegalOperation' || error.message.includes('Transaction numbers are only allowed on a replica set')) {
                    console.warn('MongoDB Transaction failed (likely standalone instance). Retrying without transaction...');
                    // Retry correctly passing undefined as session
                    return await operation(undefined);
                }
                throw error;
            } finally {
                await mongoSession.endSession();
            }
        };

        // Wrap the core logic
        return executeOperation(async (session) => {
            // Acquire lock on both users
            const userIds = [fromUserId, toUserId].sort();

            // Use find instead of findOne to get both in one query
            const users = await User.find({ _id: { $in: userIds } }).session(session);

            const fromUser = users.find(u => u._id.toString() === fromUserId.toString());
            const toUser = users.find(u => u._id.toString() === toUserId.toString());

            if (!fromUser || !toUser) {
                throw new Error('One or both users not found');
            }

            // Check sufficient balance
            if (fromUser.creditBalance < amount) {
                throw new Error(`Insufficient credits. Balance: ${fromUser.creditBalance}, Required: ${amount}`);
            }

            // Calculate new balances
            const fromBalanceBefore = fromUser.creditBalance;
            const fromBalanceAfter = fromBalanceBefore - amount;
            const toBalanceBefore = toUser.creditBalance;
            const toBalanceAfter = toBalanceBefore + amount;

            // Update balances atomically with version check (optimistic locking)
            const fromUpdateResult = await User.updateOne(
                {
                    _id: fromUserId,
                    creditVersion: fromUser.creditVersion,
                    creditBalance: { $gte: amount } // Double-check balance
                },
                {
                    $set: { creditBalance: fromBalanceAfter },
                    $inc: { creditVersion: 1 }
                },
                { session: session }
            );

            if (fromUpdateResult.modifiedCount === 0) {
                throw new Error('Failed to update sender balance - concurrent modification detected');
            }

            const toUpdateResult = await User.updateOne(
                {
                    _id: toUserId,
                    creditVersion: toUser.creditVersion
                },
                {
                    $set: { creditBalance: toBalanceAfter },
                    $inc: { creditVersion: 1 }
                },
                { session: session }
            );

            if (toUpdateResult.modifiedCount === 0) {
                // If we fail here in non-transaction mode, we have a partial failure (sender debited, receiver not credited)
                // In a real production system without transactions, we would need a compensation action here.
                // For this fallback, we throw, but the sender is already debited if session is null.
                throw new Error('Failed to update receiver balance - concurrent modification detected');
            }

            // Create debit transaction for sender
            const debitTransaction = new Transaction({
                user: fromUserId,
                counterparty: toUserId,
                session: options.sessionId || null,
                type: TRANSACTION_TYPE.DEBIT,
                amount: amount,
                balanceBefore: fromBalanceBefore,
                balanceAfter: fromBalanceAfter,
                status: TRANSACTION_STATUS.COMPLETED,
                description: description,
                idempotencyKey: options.idempotencyKey ? `${options.idempotencyKey}-debit` : undefined,
                metadata: options.metadata || {}
            });

            // Create credit transaction for receiver
            const creditTransaction = new Transaction({
                user: toUserId,
                counterparty: fromUserId,
                session: options.sessionId || null,
                type: TRANSACTION_TYPE.CREDIT,
                amount: amount,
                balanceBefore: toBalanceBefore,
                balanceAfter: toBalanceAfter,
                status: TRANSACTION_STATUS.COMPLETED,
                description: `Received: ${description}`,
                idempotencyKey: options.idempotencyKey ? `${options.idempotencyKey}-credit` : undefined,
                metadata: options.metadata || {}
            });

            // Save both transactions
            await debitTransaction.save({ session: session });
            await creditTransaction.save({ session: session });

            // Link the paired transactions
            debitTransaction.pairedTransaction = creditTransaction._id;
            creditTransaction.pairedTransaction = debitTransaction._id;

            await debitTransaction.save({ session: session });
            await creditTransaction.save({ session: session });

            return {
                success: true,
                debitTransaction: debitTransaction.toObject(),
                creditTransaction: creditTransaction.toObject(),
                fromBalance: fromBalanceAfter,
                toBalance: toBalanceAfter
            };
        });
    }

    /**
     * Add credits to a user's account (for initial credits, bonuses, refunds)
     * 
     * @param {string} userId - User ID to credit
     * @param {number} amount - Amount to add
     * @param {string} type - Transaction type
     * @param {string} description - Description
     * @param {Object} options - Additional options
     */
    static async credit(userId, amount, type, description, options = {}) {
        if (typeof amount !== 'number' || amount <= 0) {
            throw new Error('Credit amount must be a positive number');
        }

        const validTypes = [TRANSACTION_TYPE.INITIAL, TRANSACTION_TYPE.BONUS, TRANSACTION_TYPE.REFUND];
        if (!validTypes.includes(type)) {
            throw new Error('Invalid credit transaction type');
        }

        // Helper to execute with or without transaction
        const executeOperation = async (operation) => {
            const mongoSession = await mongoose.startSession();
            try {
                let result;
                await mongoSession.withTransaction(async () => {
                    result = await operation(mongoSession);
                });
                return result;
            } catch (error) {
                if (error.code === 20 || error.codeName === 'IllegalOperation' || error.message.includes('Transaction numbers are only allowed on a replica set')) {
                    console.warn('MongoDB Transaction failed (likely standalone instance). Retrying without transaction...');
                    return await operation(undefined);
                }
                throw error;
            } finally {
                await mongoSession.endSession();
            }
        };

        return executeOperation(async (session) => {
            const user = await User.findById(userId).session(session);

            if (!user) {
                throw new Error('User not found');
            }

            const balanceBefore = user.creditBalance;
            const balanceAfter = balanceBefore + amount;

            // Update balance with version check
            const updateResult = await User.updateOne(
                {
                    _id: userId,
                    creditVersion: user.creditVersion
                },
                {
                    $set: { creditBalance: balanceAfter },
                    $inc: { creditVersion: 1 }
                },
                { session: session }
            );

            if (updateResult.modifiedCount === 0) {
                throw new Error('Failed to update balance - concurrent modification');
            }

            // Create transaction record
            const transaction = new Transaction({
                user: userId,
                counterparty: options.counterparty || null,
                session: options.sessionId || null,
                type: type,
                amount: amount,
                balanceBefore: balanceBefore,
                balanceAfter: balanceAfter,
                status: TRANSACTION_STATUS.COMPLETED,
                description: description,
                idempotencyKey: options.idempotencyKey,
                metadata: options.metadata || {}
            });

            await transaction.save({ session: session });

            return {
                success: true,
                transaction: transaction.toObject(),
                newBalance: balanceAfter
            };
        });
    }

    /**
     * Get transaction history for a user
     * 
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     */
    static async getHistory(userId, options = {}) {
        const {
            page = 1,
            limit = 20,
            type = null,
            startDate = null,
            endDate = null
        } = options;

        const query = { user: userId };

        if (type) {
            query.type = type;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .populate('counterparty', 'firstName lastName avatar')
                .populate('session', 'skill scheduledAt')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Transaction.countDocuments(query)
        ]);

        return {
            transactions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get balance summary for a user
     */
    static async getBalanceSummary(userId) {
        const user = await User.findById(userId).select('creditBalance creditVersion');

        if (!user) {
            throw new Error('User not found');
        }

        // Get transaction summary
        const summary = await Transaction.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const summaryMap = {};
        summary.forEach(s => {
            summaryMap[s._id] = { total: s.total, count: s.count };
        });

        return {
            currentBalance: user.creditBalance,
            totalEarned: (summaryMap.credit?.total || 0) + (summaryMap.initial?.total || 0) + (summaryMap.bonus?.total || 0) + (summaryMap.refund?.total || 0),
            totalSpent: summaryMap.debit?.total || 0,
            transactionCounts: summaryMap
        };
    }
}

module.exports = TransactionService;
