const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const fraudController = require('../controllers/fraudController');

/**
 * Fraud Detection & Monitoring Routes
 * All routes require authentication
 * Admin-only routes are marked with [ADMIN]
 */

// ===== ADMIN DASHBOARD ROUTES =====

/**
 * GET /api/fraud/dashboard
 * [ADMIN] Get comprehensive fraud statistics for admin dashboard
 */
router.get('/dashboard', protect, adminOnly, fraudController.getDashboard);

/**
 * GET /api/fraud/circular-trading
 * [ADMIN] Detect circular trading patterns (A→B→C→A loops)
 * Query params: lookbackDays (default: 7), minLoopSize (default: 3)
 */
router.get('/circular-trading', protect, adminOnly, fraudController.detectCircularTrading);

/**
 * GET /api/fraud/high-frequency
 * [ADMIN] Detect high-frequency suspicious patterns
 * Query params: timeWindowMinutes (default: 60), threshold (default: 5)
 */
router.get('/high-frequency', protect, adminOnly, fraudController.detectHighFrequency);

// ===== USER TRUST SCORE ROUTES =====

/**
 * GET /api/fraud/trust-score/:userId
 * Get trust score for any user (users can view their own, admins can view anyone's)
 */
router.get('/trust-score/:userId', protect, fraudController.getTrustScore);

/**
 * GET /api/fraud/my-trust-score
 * Get current user's trust score
 */
router.get('/my-trust-score', protect, fraudController.getMyTrustScore);

// ===== REAL-TIME RISK ASSESSMENT =====

/**
 * POST /api/fraud/assess-risk
 * Assess risk of a transaction before it's processed
 * Body: { toUserId, amount }
 */
router.post('/assess-risk', protect, fraudController.assessRisk);

// ===== TRANSACTION GRAPH VISUALIZATION =====

/**
 * GET /api/fraud/transaction-graph
 * [ADMIN] Get transaction graph data for visualization
 * Query params: lookbackDays (default: 7), minConnections (default: 2)
 */
router.get('/transaction-graph', protect, adminOnly, fraudController.getTransactionGraph);

/**
 * GET /api/fraud/user-network/:userId
 * Get user's transaction network (connections)
 */
router.get('/user-network/:userId', protect, fraudController.getUserNetwork);

module.exports = router;
