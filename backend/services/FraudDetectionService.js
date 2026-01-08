const mongoose = require('mongoose');
const { Transaction, User, Session } = require('../models');

/**
 * FraudDetectionService - "The Anti-Collusion Sentinel"
 * 
 * This AI-powered service detects fraudulent patterns in the time-banking system:
 * - Circular Trading (A→B→C→A loops)
 * - High-frequency suspicious transactions
 * - Abnormal credit accumulation
 * - Trust score manipulation attempts
 * 
 * Built for Build2Break Hackathon - Systems Security Track
 */
class FraudDetectionService {
    
    /**
     * Detect circular trading patterns (closed loops in transaction graph)
     * This is the PRIMARY attack vector in time-banking systems
     * 
     * @param {number} lookbackDays - How many days to analyze (default: 7)
     * @param {number} minLoopSize - Minimum loop size to detect (default: 3)
     * @returns {Object} Detected loops and suspicious clusters
     */
    static async detectCircularTrading(lookbackDays = 7, minLoopSize = 3) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

        // Get all transactions in the time window
        const transactions = await Transaction.find({
            createdAt: { $gte: cutoffDate },
            counterparty: { $ne: null },
            status: 'completed'
        }).select('user counterparty amount createdAt');

        // Build adjacency graph: user -> [list of counterparties with transaction counts]
        const graph = new Map();
        const edgeWeights = new Map();
        const transactionTimes = new Map();

        transactions.forEach(tx => {
            const from = tx.user.toString();
            const to = tx.counterparty.toString();
            const edge = `${from}->${to}`;

            // Build adjacency list
            if (!graph.has(from)) {
                graph.set(from, []);
            }
            graph.get(from).push(to);

            // Track edge weights (transaction count)
            edgeWeights.set(edge, (edgeWeights.get(edge) || 0) + 1);

            // Track transaction times for frequency analysis
            if (!transactionTimes.has(edge)) {
                transactionTimes.set(edge, []);
            }
            transactionTimes.get(edge).push(tx.createdAt);
        });

        // Detect cycles using DFS
        const detectedLoops = [];
        const visited = new Set();

        const dfs = (node, path, pathSet) => {
            if (path.length >= minLoopSize && pathSet.has(node)) {
                // Found a cycle!
                const cycleStart = path.indexOf(node);
                const cycle = path.slice(cycleStart);
                
                // Calculate cycle metrics
                let totalTransactions = 0;
                let cycleEdges = [];
                
                for (let i = 0; i < cycle.length; i++) {
                    const from = cycle[i];
                    const to = cycle[(i + 1) % cycle.length];
                    const edge = `${from}->${to}`;
                    const count = edgeWeights.get(edge) || 0;
                    totalTransactions += count;
                    cycleEdges.push({ from, to, count });
                }

                // Calculate suspicion score (higher = more suspicious)
                const avgTransactionsPerEdge = totalTransactions / cycle.length;
                const cycleFrequencyScore = avgTransactionsPerEdge * (1 / cycle.length);
                const suspicionScore = Math.min(100, cycleFrequencyScore * 10);

                detectedLoops.push({
                    cycle: cycle,
                    size: cycle.length,
                    totalTransactions,
                    edges: cycleEdges,
                    suspicionScore: Math.round(suspicionScore),
                    riskLevel: suspicionScore > 70 ? 'HIGH' : suspicionScore > 40 ? 'MEDIUM' : 'LOW'
                });

                return;
            }

            if (path.length > 10) return; // Prevent deep recursion

            visited.add(node);
            pathSet.add(node);
            path.push(node);

            const neighbors = graph.get(node) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor) || pathSet.has(neighbor)) {
                    dfs(neighbor, [...path], new Set(pathSet));
                }
            }

            pathSet.delete(node);
        };

        // Run DFS from each node
        graph.forEach((neighbors, node) => {
            if (!visited.has(node)) {
                dfs(node, [], new Set());
            }
        });

        // Remove duplicate cycles
        const uniqueLoops = this._deduplicateCycles(detectedLoops);

        // Get user details for suspicious actors
        const suspiciousUserIds = new Set();
        uniqueLoops.forEach(loop => {
            loop.cycle.forEach(userId => suspiciousUserIds.add(userId));
        });

        const suspiciousUsers = await User.find({
            _id: { $in: Array.from(suspiciousUserIds) }
        }).select('firstName lastName email creditBalance stats');

        const userMap = new Map();
        suspiciousUsers.forEach(user => {
            userMap.set(user._id.toString(), {
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                balance: user.creditBalance,
                sessionsCompleted: user.stats?.sessionsAsStudent + user.stats?.sessionsAsTutor || 0
            });
        });

        // Enrich loops with user data
        const enrichedLoops = uniqueLoops.map(loop => ({
            ...loop,
            users: loop.cycle.map(userId => ({
                userId,
                ...userMap.get(userId)
            }))
        }));

        return {
            loopsDetected: enrichedLoops.length,
            loops: enrichedLoops.sort((a, b) => b.suspicionScore - a.suspicionScore),
            analysisWindow: {
                days: lookbackDays,
                startDate: cutoffDate,
                endDate: new Date()
            },
            totalTransactionsAnalyzed: transactions.length
        };
    }

    /**
     * Detect high-frequency trading patterns (rapid back-and-forth transactions)
     * 
     * @param {number} timeWindowMinutes - Time window to check (default: 60)
     * @param {number} threshold - Minimum transactions to flag (default: 5)
     */
    static async detectHighFrequencyPatterns(timeWindowMinutes = 60, threshold = 5) {
        const cutoffDate = new Date();
        cutoffDate.setMinutes(cutoffDate.getMinutes() - timeWindowMinutes);

        const transactions = await Transaction.find({
            createdAt: { $gte: cutoffDate },
            counterparty: { $ne: null },
            status: 'completed'
        }).populate('user counterparty', 'firstName lastName email')
          .sort({ createdAt: -1 });

        // Group transactions by user pairs
        const pairActivity = new Map();

        transactions.forEach(tx => {
            const userId1 = tx.user._id.toString();
            const userId2 = tx.counterparty._id.toString();
            
            // Create consistent pair key (sorted to treat A->B and B->A as same pair)
            const pairKey = [userId1, userId2].sort().join('_');

            if (!pairActivity.has(pairKey)) {
                pairActivity.set(pairKey, {
                    user1: tx.user,
                    user2: tx.counterparty,
                    transactions: []
                });
            }

            pairActivity.get(pairKey).transactions.push({
                from: tx.user.firstName + ' ' + tx.user.lastName,
                to: tx.counterparty.firstName + ' ' + tx.counterparty.lastName,
                amount: tx.amount,
                time: tx.createdAt
            });
        });

        // Filter pairs exceeding threshold
        const suspiciousPairs = [];
        pairActivity.forEach((data, pairKey) => {
            if (data.transactions.length >= threshold) {
                const totalAmount = data.transactions.reduce((sum, tx) => sum + tx.amount, 0);
                const avgTimeBetween = this._calculateAvgTimeBetween(data.transactions);

                suspiciousPairs.push({
                    users: [
                        {
                            name: `${data.user1.firstName} ${data.user1.lastName}`,
                            email: data.user1.email,
                            id: data.user1._id
                        },
                        {
                            name: `${data.user2.firstName} ${data.user2.lastName}`,
                            email: data.user2.email,
                            id: data.user2._id
                        }
                    ],
                    transactionCount: data.transactions.length,
                    totalAmount,
                    avgSecondsBetween: avgTimeBetween,
                    transactions: data.transactions,
                    suspicionScore: Math.min(100, (data.transactions.length / threshold) * 50),
                    riskLevel: data.transactions.length > threshold * 2 ? 'HIGH' : 'MEDIUM'
                });
            }
        });

        return {
            suspiciousPairsFound: suspiciousPairs.length,
            pairs: suspiciousPairs.sort((a, b) => b.suspicionScore - a.suspicionScore),
            timeWindow: {
                minutes: timeWindowMinutes,
                startTime: cutoffDate,
                endTime: new Date()
            }
        };
    }

    /**
     * Calculate Trust Score for a user
     * Based on transaction patterns, session completion rate, and anomaly flags
     * 
     * @param {string} userId - User ID
     * @returns {Object} Trust score and breakdown
     */
    static async calculateTrustScore(userId) {
        const user = await User.findById(userId).select('stats creditBalance createdAt');
        if (!user) throw new Error('User not found');

        const accountAgeDays = Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24));

        // Get user's transaction history
        const transactions = await Transaction.find({
            user: userId,
            status: 'completed'
        }).select('type amount counterparty createdAt');

        const uniqueCounterparties = new Set(
            transactions
                .filter(tx => tx.counterparty)
                .map(tx => tx.counterparty.toString())
        ).size;

        // Get session data
        const sessions = await Session.find({
            $or: [{ student: userId }, { tutor: userId }],
            status: 'completed'
        });

        const sessionsCompleted = sessions.length;
        const uniquePartners = new Set(
            sessions.map(s => 
                s.student.toString() === userId.toString() 
                    ? s.tutor.toString() 
                    : s.student.toString()
            )
        ).size;

        // Calculate metrics
        const transactionDiversity = uniqueCounterparties;
        const sessionCompletionRate = user.stats?.sessionsCompleted || sessionsCompleted;
        const avgCreditsPerTransaction = transactions.length > 0 
            ? transactions.reduce((sum, tx) => sum + tx.amount, 0) / transactions.length 
            : 0;

        // Scoring components (0-100 each)
        const accountAgeScore = Math.min(100, (accountAgeDays / 30) * 100); // Max at 30 days
        const activityScore = Math.min(100, sessionsCompleted * 5); // Max at 20 sessions
        const diversityScore = Math.min(100, transactionDiversity * 10); // Max at 10 unique partners
        const consistencyScore = avgCreditsPerTransaction > 0 && avgCreditsPerTransaction < 10 ? 100 : 50;

        // Overall trust score (weighted average)
        const trustScore = Math.round(
            accountAgeScore * 0.2 +
            activityScore * 0.3 +
            diversityScore * 0.3 +
            consistencyScore * 0.2
        );

        return {
            userId,
            trustScore,
            level: trustScore >= 80 ? 'TRUSTED' : trustScore >= 50 ? 'MODERATE' : 'LOW',
            breakdown: {
                accountAge: { score: Math.round(accountAgeScore), days: accountAgeDays },
                activity: { score: Math.round(activityScore), sessionsCompleted },
                diversity: { score: Math.round(diversityScore), uniquePartners: transactionDiversity },
                consistency: { score: Math.round(consistencyScore), avgAmount: avgCreditsPerTransaction.toFixed(2) }
            },
            flags: await this._generateUserFlags(userId, transactions, sessions)
        };
    }

    /**
     * Real-time anomaly detection on new transaction
     * Call this BEFORE processing a transaction to prevent fraud
     * 
     * @param {string} fromUserId - Sender
     * @param {string} toUserId - Receiver
     * @param {number} amount - Amount
     * @returns {Object} Risk assessment
     */
    static async assessTransactionRisk(fromUserId, toUserId, amount) {
        const risks = [];
        let riskScore = 0;

        // Check 1: Rapid repeat transactions
        const recentTransactions = await Transaction.find({
            user: fromUserId,
            counterparty: toUserId,
            createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
        });

        if (recentTransactions.length >= 3) {
            risks.push({
                type: 'HIGH_FREQUENCY',
                severity: 'HIGH',
                message: `${recentTransactions.length} transactions to same user in 10 minutes`
            });
            riskScore += 40;
        }

        // Check 2: Check if users are in a detected loop
        const loopData = await this.detectCircularTrading(7, 3);
        const isInLoop = loopData.loops.some(loop => 
            loop.cycle.includes(fromUserId.toString()) && 
            loop.cycle.includes(toUserId.toString())
        );

        if (isInLoop) {
            risks.push({
                type: 'CIRCULAR_TRADING',
                severity: 'HIGH',
                message: 'Users are part of a detected circular trading pattern'
            });
            riskScore += 50;
        }

        // Check 3: Unusual amount
        const userAvg = await Transaction.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(fromUserId) } },
            { $group: { _id: null, avgAmount: { $avg: '$amount' } } }
        ]);

        if (userAvg.length > 0 && amount > userAvg[0].avgAmount * 5) {
            risks.push({
                type: 'UNUSUAL_AMOUNT',
                severity: 'MEDIUM',
                message: `Amount is 5x user's average transaction`
            });
            riskScore += 20;
        }

        // Check 4: Trust score
        const senderTrust = await this.calculateTrustScore(fromUserId);
        const receiverTrust = await this.calculateTrustScore(toUserId);

        if (senderTrust.trustScore < 30 || receiverTrust.trustScore < 30) {
            risks.push({
                type: 'LOW_TRUST',
                severity: 'MEDIUM',
                message: 'One or both users have low trust scores'
            });
            riskScore += 15;
        }

        return {
            allowed: riskScore < 80, // Block if risk too high
            riskScore: Math.min(100, riskScore),
            riskLevel: riskScore >= 80 ? 'CRITICAL' : riskScore >= 50 ? 'HIGH' : riskScore >= 25 ? 'MEDIUM' : 'LOW',
            risks,
            recommendation: riskScore >= 80 
                ? 'BLOCK_TRANSACTION' 
                : riskScore >= 50 
                ? 'REQUIRE_VERIFICATION' 
                : 'ALLOW'
        };
    }

    /**
     * Get system-wide fraud statistics (for admin dashboard)
     */
    static async getFraudStatistics() {
        const [
            circularTrading,
            highFrequency,
            totalUsers,
            totalTransactions,
            recentTransactions
        ] = await Promise.all([
            this.detectCircularTrading(7, 3),
            this.detectHighFrequencyPatterns(60, 5),
            User.countDocuments(),
            Transaction.countDocuments({ status: 'completed' }),
            Transaction.find({ status: 'completed' })
                .sort({ createdAt: -1 })
                .limit(100)
        ]);

        // Calculate average trust score
        const trustScores = [];
        const sampleSize = Math.min(50, totalUsers);
        const sampleUsers = await User.find().limit(sampleSize).select('_id');
        
        for (const user of sampleUsers) {
            const trust = await this.calculateTrustScore(user._id);
            trustScores.push(trust.trustScore);
        }

        const avgTrustScore = trustScores.length > 0 
            ? Math.round(trustScores.reduce((a, b) => a + b, 0) / trustScores.length)
            : 0;

        return {
            overview: {
                totalUsers,
                totalTransactions,
                avgTrustScore,
                systemHealth: avgTrustScore >= 70 ? 'HEALTHY' : avgTrustScore >= 50 ? 'MODERATE' : 'AT_RISK'
            },
            threats: {
                circularTradingLoops: circularTrading.loopsDetected,
                highFrequencyPairs: highFrequency.suspiciousPairsFound,
                highRiskLoops: circularTrading.loops.filter(l => l.riskLevel === 'HIGH').length
            },
            recentActivity: {
                last24Hours: recentTransactions.length,
                avgTransactionAmount: recentTransactions.length > 0
                    ? (recentTransactions.reduce((sum, tx) => sum + tx.amount, 0) / recentTransactions.length).toFixed(2)
                    : 0
            }
        };
    }

    // ========== HELPER METHODS ==========

    static _deduplicateCycles(cycles) {
        const seen = new Set();
        const unique = [];

        cycles.forEach(cycle => {
            // Normalize cycle (start from smallest ID)
            const normalized = this._normalizeCycle(cycle.cycle);
            const key = normalized.join('-');

            if (!seen.has(key)) {
                seen.add(key);
                unique.push(cycle);
            }
        });

        return unique;
    }

    static _normalizeCycle(cycle) {
        const minIndex = cycle.indexOf(Math.min(...cycle.map(id => id.toString())));
        return [...cycle.slice(minIndex), ...cycle.slice(0, minIndex)];
    }

    static _calculateAvgTimeBetween(transactions) {
        if (transactions.length < 2) return 0;

        const sortedTimes = transactions.map(tx => tx.time).sort((a, b) => a - b);
        let totalDiff = 0;

        for (let i = 1; i < sortedTimes.length; i++) {
            totalDiff += (sortedTimes[i] - sortedTimes[i - 1]) / 1000; // Convert to seconds
        }

        return Math.round(totalDiff / (sortedTimes.length - 1));
    }

    static async _generateUserFlags(userId, transactions, sessions) {
        const flags = [];

        // Check for very new account with high activity
        const user = await User.findById(userId);
        const accountAgeDays = Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24));
        
        if (accountAgeDays < 3 && transactions.length > 20) {
            flags.push('NEW_ACCOUNT_HIGH_ACTIVITY');
        }

        // Check for one-sided transactions (only receiving or only sending)
        const credits = transactions.filter(tx => tx.type === 'credit').length;
        const debits = transactions.filter(tx => tx.type === 'debit').length;

        if (transactions.length > 10 && (credits === 0 || debits === 0)) {
            flags.push('ONE_SIDED_TRANSACTIONS');
        }

        return flags;
    }
}

module.exports = FraudDetectionService;
