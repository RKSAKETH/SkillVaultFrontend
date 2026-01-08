const express = require('express');
const { query } = require('express-validator');
const { walletController } = require('../controllers');
const { auth, validate } = require('../middleware');

const router = express.Router();

// All wallet routes require authentication
router.use(auth);

/**
 * @route   GET /api/wallet
 * @desc    Get wallet summary (balance, stats)
 * @access  Private
 */
router.get('/', walletController.getWallet);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get transaction history
 * @access  Private
 */
router.get(
    '/transactions',
    [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        query('type')
            .optional()
            .isIn(['credit', 'debit', 'initial', 'refund', 'bonus'])
            .withMessage('Invalid transaction type'),
        query('startDate')
            .optional()
            .isISO8601()
            .withMessage('Invalid start date format'),
        query('endDate')
            .optional()
            .isISO8601()
            .withMessage('Invalid end date format')
    ],
    validate,
    walletController.getTransactions
);

/**
 * @route   GET /api/wallet/transactions/:id
 * @desc    Get a single transaction
 * @access  Private
 */
router.get('/transactions/:id', walletController.getTransaction);

module.exports = router;
