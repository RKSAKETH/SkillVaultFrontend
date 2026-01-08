const { TransactionService } = require('../services');

/**
 * Wallet Controller
 * Handles credit balance and transaction history
 */
const walletController = {
    /**
     * Get wallet summary
     * GET /api/wallet
     */
    getWallet: async (req, res, next) => {
        try {
            const summary = await TransactionService.getBalanceSummary(req.user._id);

            res.json({
                success: true,
                data: {
                    wallet: summary
                }
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Get transaction history
     * GET /api/wallet/transactions
     */
    getTransactions: async (req, res, next) => {
        try {
            const { page, limit, type, startDate, endDate } = req.query;

            const result = await TransactionService.getHistory(req.user._id, {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                type,
                startDate,
                endDate
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
     * Get a single transaction
     * GET /api/wallet/transactions/:id
     */
    getTransaction: async (req, res, next) => {
        try {
            const { Transaction } = require('../models');

            const transaction = await Transaction.findOne({
                _id: req.params.id,
                user: req.user._id
            })
                .populate('counterparty', 'firstName lastName avatar')
                .populate('session', 'skill scheduledAt duration');

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    error: 'Transaction not found'
                });
            }

            res.json({
                success: true,
                data: {
                    transaction
                }
            });

        } catch (error) {
            next(error);
        }
    }
};

module.exports = walletController;
