const FraudDetectionService = require('../services/FraudDetectionService');
const { Transaction } = require('../models');

/**
 * Fraud Detection Controller
 * Handles all fraud detection and monitoring endpoints
 */
const fraudController = {
    /**
     * GET /api/fraud/dashboard
     * Get comprehensive fraud statistics
     */
    getDashboard: async (req, res, next) => {
        try {
            const stats = await FraudDetectionService.getFraudStatistics();

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/fraud/circular-trading
     * Detect circular trading patterns
     */
    detectCircularTrading: async (req, res, next) => {
        try {
            const { lookbackDays = 7, minLoopSize = 3 } = req.query;

            const result = await FraudDetectionService.detectCircularTrading(
                parseInt(lookbackDays),
                parseInt(minLoopSize)
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/fraud/high-frequency
     * Detect high-frequency patterns
     */
    detectHighFrequency: async (req, res, next) => {
        try {
            const { timeWindowMinutes = 60, threshold = 5 } = req.query;

            const result = await FraudDetectionService.detectHighFrequencyPatterns(
                parseInt(timeWindowMinutes),
                parseInt(threshold)
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/fraud/trust-score/:userId
     * Get trust score for a user
     */
    getTrustScore: async (req, res, next) => {
        try {
            const { userId } = req.params;

            // Users can only view their own trust score unless they're admin
            if (userId !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'You can only view your own trust score'
                });
            }

            const trustScore = await FraudDetectionService.calculateTrustScore(userId);

            res.json({
                success: true,
                data: trustScore
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/fraud/my-trust-score
     * Get current user's trust score
     */
    getMyTrustScore: async (req, res, next) => {
        try {
            const trustScore = await FraudDetectionService.calculateTrustScore(req.user._id);

            res.json({
                success: true,
                data: trustScore
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/fraud/assess-risk
     * Assess transaction risk in real-time
     */
    assessRisk: async (req, res, next) => {
        try {
            const { toUserId, amount } = req.body;
            const fromUserId = req.user._id;

            if (!toUserId || !amount) {
                return res.status(400).json({
                    success: false,
                    error: 'toUserId and amount are required'
                });
            }

            const assessment = await FraudDetectionService.assessTransactionRisk(
                fromUserId,
                toUserId,
                parseFloat(amount)
            );

            res.json({
                success: true,
                data: assessment
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/fraud/transaction-graph
     * Get transaction graph data for visualization
     */
    getTransactionGraph: async (req, res, next) => {
        try {
            const { lookbackDays = 7, minConnections = 2 } = req.query;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - parseInt(lookbackDays));

            // Get all relevant transactions
            const transactions = await Transaction.find({
                createdAt: { $gte: cutoffDate },
                counterparty: { $ne: null },
                status: 'completed'
            })
            .populate('user counterparty', 'firstName lastName email creditBalance')
            .select('user counterparty amount createdAt');

            // Build graph structure
            const nodes = new Map();
            const edges = [];
            const edgeMap = new Map();

            transactions.forEach(tx => {
                const fromId = tx.user._id.toString();
                const toId = tx.counterparty._id.toString();

                // Add nodes
                if (!nodes.has(fromId)) {
                    nodes.set(fromId, {
                        id: fromId,
                        name: `${tx.user.firstName} ${tx.user.lastName}`,
                        email: tx.user.email,
                        balance: tx.user.creditBalance,
                        transactionCount: 0
                    });
                }
                nodes.get(fromId).transactionCount++;

                if (!nodes.has(toId)) {
                    nodes.set(toId, {
                        id: toId,
                        name: `${tx.counterparty.firstName} ${tx.counterparty.lastName}`,
                        email: tx.counterparty.email,
                        balance: tx.counterparty.creditBalance,
                        transactionCount: 0
                    });
                }

                // Add edge
                const edgeKey = `${fromId}->${toId}`;
                if (!edgeMap.has(edgeKey)) {
                    edgeMap.set(edgeKey, {
                        from: fromId,
                        to: toId,
                        weight: 0,
                        totalAmount: 0
                    });
                }
                const edge = edgeMap.get(edgeKey);
                edge.weight++;
                edge.totalAmount += tx.amount;
            });

            // Convert to arrays
            const nodeArray = Array.from(nodes.values());
            const edgeArray = Array.from(edgeMap.values())
                .filter(edge => edge.weight >= parseInt(minConnections));

            // Detect suspicious patterns
            const circularTrading = await FraudDetectionService.detectCircularTrading(
                parseInt(lookbackDays),
                3
            );

            // Mark suspicious nodes
            const suspiciousUserIds = new Set();
            circularTrading.loops.forEach(loop => {
                loop.cycle.forEach(userId => suspiciousUserIds.add(userId));
            });

            nodeArray.forEach(node => {
                node.suspicious = suspiciousUserIds.has(node.id);
                node.riskLevel = node.suspicious ? 'HIGH' : 'LOW';
            });

            res.json({
                success: true,
                data: {
                    nodes: nodeArray,
                    edges: edgeArray,
                    metadata: {
                        totalNodes: nodeArray.length,
                        totalEdges: edgeArray.length,
                        suspiciousNodes: Array.from(suspiciousUserIds).length,
                        analysisWindow: {
                            days: parseInt(lookbackDays),
                            startDate: cutoffDate,
                            endDate: new Date()
                        }
                    },
                    circularLoops: circularTrading.loops
                }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/fraud/user-network/:userId
     * Get user's transaction network
     */
    getUserNetwork: async (req, res, next) => {
        try {
            const { userId } = req.params;
            const { lookbackDays = 30 } = req.query;

            // Users can only view their own network unless they're admin
            if (userId !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'You can only view your own network'
                });
            }

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - parseInt(lookbackDays));

            // Get user's transactions
            const transactions = await Transaction.find({
                $or: [
                    { user: userId },
                    { counterparty: userId }
                ],
                createdAt: { $gte: cutoffDate },
                counterparty: { $ne: null },
                status: 'completed'
            })
            .populate('user counterparty', 'firstName lastName email')
            .sort({ createdAt: -1 });

            // Build network
            const connections = new Map();

            transactions.forEach(tx => {
                const isOutgoing = tx.user._id.toString() === userId;
                const otherId = isOutgoing 
                    ? tx.counterparty._id.toString() 
                    : tx.user._id.toString();
                const otherUser = isOutgoing ? tx.counterparty : tx.user;

                if (!connections.has(otherId)) {
                    connections.set(otherId, {
                        userId: otherId,
                        name: `${otherUser.firstName} ${otherUser.lastName}`,
                        email: otherUser.email,
                        sentTo: 0,
                        receivedFrom: 0,
                        totalAmount: 0,
                        transactionCount: 0,
                        lastTransaction: tx.createdAt
                    });
                }

                const conn = connections.get(otherId);
                if (isOutgoing) {
                    conn.sentTo += tx.amount;
                } else {
                    conn.receivedFrom += tx.amount;
                }
                conn.totalAmount += tx.amount;
                conn.transactionCount++;
            });

            const connectionsArray = Array.from(connections.values())
                .sort((a, b) => b.transactionCount - a.transactionCount);

            res.json({
                success: true,
                data: {
                    userId,
                    connections: connectionsArray,
                    summary: {
                        totalConnections: connectionsArray.length,
                        totalTransactions: transactions.length,
                        period: {
                            days: parseInt(lookbackDays),
                            startDate: cutoffDate,
                            endDate: new Date()
                        }
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = fraudController;
