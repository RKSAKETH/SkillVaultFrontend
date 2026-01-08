/**
 * Fraud Detection Test Script
 * 
 * Creates test scenarios to demonstrate the Anti-Collusion Sentinel
 * Run this to populate your database with realistic fraud patterns
 * 
 * Usage: node backend/test/fraud-test.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { User, Session, Transaction } = require('../models');
const { SessionService, TransactionService, FraudDetectionService } = require('../services');
const { INITIAL_CREDITS } = require('../config/constants');

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
}

/**
 * Test Scenario 1: Circular Trading Attack
 * Creates a 3-user loop with multiple transactions
 */
async function testCircularTrading() {
    console.log('\n🔄 === TEST 1: Circular Trading Attack ===\n');

    try {
        // Create 3 test users
        const alice = new User({
            email: 'alice.fraud@test.com',
            password: 'password123',
            firstName: 'Alice',
            lastName: 'Fraud',
            creditBalance: 50
        });
        await alice.save();

        const bob = new User({
            email: 'bob.fraud@test.com',
            password: 'password123',
            firstName: 'Bob',
            lastName: 'Fraud',
            creditBalance: 50
        });
        await bob.save();

        const charlie = new User({
            email: 'charlie.fraud@test.com',
            password: 'password123',
            firstName: 'Charlie',
            lastName: 'Fraud',
            creditBalance: 50
        });
        await charlie.save();

        console.log('✅ Created 3 test users');

        // Create circular transactions: A→B→C→A (repeat 15 times)
        console.log('Creating circular transaction loop...');
        
        for (let i = 0; i < 15; i++) {
            // A → B
            await TransactionService.transfer(
                alice._id,
                bob._id,
                1,
                `Loop transaction ${i + 1} (A→B)`,
                { idempotencyKey: `loop-${i}-ab` }
            );

            // B → C
            await TransactionService.transfer(
                bob._id,
                charlie._id,
                1,
                `Loop transaction ${i + 1} (B→C)`,
                { idempotencyKey: `loop-${i}-bc` }
            );

            // C → A
            await TransactionService.transfer(
                charlie._id,
                alice._id,
                1,
                `Loop transaction ${i + 1} (C→A)`,
                { idempotencyKey: `loop-${i}-ca` }
            );

            if ((i + 1) % 5 === 0) {
                console.log(`  ✓ Completed ${i + 1} loop iterations`);
            }
        }

        console.log('✅ Created 15 circular transaction loops (45 total transactions)');

        // Run detection
        console.log('\n🔍 Running circular trading detection...');
        const detection = await FraudDetectionService.detectCircularTrading(7, 3);

        console.log(`\n📊 RESULTS:`);
        console.log(`   Loops detected: ${detection.loopsDetected}`);
        
        if (detection.loops.length > 0) {
            const loop = detection.loops[0];
            console.log(`   Loop size: ${loop.size} users`);
            console.log(`   Total transactions: ${loop.totalTransactions}`);
            console.log(`   Suspicion score: ${loop.suspicionScore}/100`);
            console.log(`   Risk level: ${loop.riskLevel}`);
            console.log(`   Users involved: ${loop.users.map(u => u.name).join(' → ')}`);
        }

        return { alice, bob, charlie, detection };

    } catch (error) {
        console.error('❌ Test 1 failed:', error.message);
        throw error;
    }
}

/**
 * Test Scenario 2: High-Frequency Attack
 * Creates rapid transactions between 2 users
 */
async function testHighFrequency() {
    console.log('\n⚡ === TEST 2: High-Frequency Attack ===\n');

    try {
        // Create 2 users
        const attacker1 = new User({
            email: 'attacker1@test.com',
            password: 'password123',
            firstName: 'Attacker',
            lastName: 'One',
            creditBalance: 50
        });
        await attacker1.save();

        const attacker2 = new User({
            email: 'attacker2@test.com',
            password: 'password123',
            firstName: 'Attacker',
            lastName: 'Two',
            creditBalance: 50
        });
        await attacker2.save();

        console.log('✅ Created 2 test users');

        // Create 10 rapid transactions (within 5 minutes)
        console.log('Creating high-frequency transactions...');
        
        for (let i = 0; i < 10; i++) {
            const direction = i % 2 === 0;
            const from = direction ? attacker1._id : attacker2._id;
            const to = direction ? attacker2._id : attacker1._id;

            await TransactionService.transfer(
                from,
                to,
                1,
                `High-frequency transaction ${i + 1}`,
                { idempotencyKey: `hf-${i}` }
            );

            // Small delay to keep them within same time window
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('✅ Created 10 rapid transactions');

        // Run detection
        console.log('\n🔍 Running high-frequency detection...');
        const detection = await FraudDetectionService.detectHighFrequencyPatterns(60, 5);

        console.log(`\n📊 RESULTS:`);
        console.log(`   Suspicious pairs found: ${detection.suspiciousPairsFound}`);
        
        if (detection.pairs.length > 0) {
            const pair = detection.pairs[0];
            console.log(`   Transaction count: ${pair.transactionCount}`);
            console.log(`   Total amount: ${pair.totalAmount} credits`);
            console.log(`   Avg time between: ${pair.avgSecondsBetween} seconds`);
            console.log(`   Risk level: ${pair.riskLevel}`);
        }

        return { attacker1, attacker2, detection };

    } catch (error) {
        console.error('❌ Test 2 failed:', error.message);
        throw error;
    }
}

/**
 * Test Scenario 3: Trust Score Evaluation
 * Evaluates trust scores for different user profiles
 */
async function testTrustScore() {
    console.log('\n🛡️  === TEST 3: Trust Score Evaluation ===\n');

    try {
        // Create users with different profiles

        // 1. New suspicious account
        const newAccount = new User({
            email: 'newbie@test.com',
            password: 'password123',
            firstName: 'New',
            lastName: 'User',
            creditBalance: 5,
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day old
        });
        await newAccount.save();

        // 2. Established trusted account
        const trustedAccount = new User({
            email: 'trusted@test.com',
            password: 'password123',
            firstName: 'Trusted',
            lastName: 'User',
            creditBalance: 25,
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days old
            stats: {
                sessionsAsStudent: 15,
                sessionsAsTutor: 20,
                totalHoursTaught: 35,
                totalHoursLearned: 15,
                completedSessions: 35
            }
        });
        await trustedAccount.save();

        console.log('✅ Created 2 test users with different profiles');

        // Calculate trust scores
        console.log('\n🔍 Calculating trust scores...');

        const newScore = await FraudDetectionService.calculateTrustScore(newAccount._id);
        const trustedScore = await FraudDetectionService.calculateTrustScore(trustedAccount._id);

        console.log(`\n📊 NEW ACCOUNT:`);
        console.log(`   Trust Score: ${newScore.trustScore}/100`);
        console.log(`   Level: ${newScore.level}`);
        console.log(`   Account Age: ${newScore.breakdown.accountAge.days} days`);
        console.log(`   Flags: ${newScore.flags.join(', ') || 'None'}`);

        console.log(`\n📊 TRUSTED ACCOUNT:`);
        console.log(`   Trust Score: ${trustedScore.trustScore}/100`);
        console.log(`   Level: ${trustedScore.level}`);
        console.log(`   Account Age: ${trustedScore.breakdown.accountAge.days} days`);
        console.log(`   Sessions Completed: ${trustedScore.breakdown.activity.sessionsCompleted}`);

        return { newAccount, trustedAccount, newScore, trustedScore };

    } catch (error) {
        console.error('❌ Test 3 failed:', error.message);
        throw error;
    }
}

/**
 * Test Scenario 4: Real-Time Risk Assessment
 * Tests pre-transaction risk evaluation
 */
async function testRiskAssessment(users) {
    console.log('\n⚠️  === TEST 4: Real-Time Risk Assessment ===\n');

    try {
        if (!users.alice || !users.bob) {
            console.log('⚠️  Skipping (requires Test 1 users)');
            return;
        }

        console.log('🔍 Assessing risk for new transaction...');

        // Assess risk of another transaction in the loop
        const assessment = await FraudDetectionService.assessTransactionRisk(
            users.alice._id,
            users.bob._id,
            1
        );

        console.log(`\n📊 RISK ASSESSMENT:`);
        console.log(`   Risk Score: ${assessment.riskScore}/100`);
        console.log(`   Risk Level: ${assessment.riskLevel}`);
        console.log(`   Recommendation: ${assessment.recommendation}`);
        console.log(`   Transaction Allowed: ${assessment.allowed ? '✅ YES' : '❌ NO'}`);
        
        if (assessment.risks.length > 0) {
            console.log(`\n   Detected Risks:`);
            assessment.risks.forEach(risk => {
                console.log(`   - [${risk.severity}] ${risk.type}: ${risk.message}`);
            });
        }

        return assessment;

    } catch (error) {
        console.error('❌ Test 4 failed:', error.message);
        throw error;
    }
}

/**
 * Test Scenario 5: Admin Dashboard Stats
 * Tests system-wide fraud statistics
 */
async function testDashboard() {
    console.log('\n📊 === TEST 5: Admin Dashboard Statistics ===\n');

    try {
        console.log('🔍 Fetching system-wide fraud statistics...');

        const stats = await FraudDetectionService.getFraudStatistics();

        console.log(`\n📊 SYSTEM OVERVIEW:`);
        console.log(`   Total Users: ${stats.overview.totalUsers}`);
        console.log(`   Total Transactions: ${stats.overview.totalTransactions}`);
        console.log(`   Avg Trust Score: ${stats.overview.avgTrustScore}/100`);
        console.log(`   System Health: ${stats.overview.systemHealth}`);

        console.log(`\n⚠️  THREATS DETECTED:`);
        console.log(`   Circular Trading Loops: ${stats.threats.circularTradingLoops}`);
        console.log(`   High-Risk Loops: ${stats.threats.highRiskLoops}`);
        console.log(`   High-Frequency Pairs: ${stats.threats.highFrequencyPairs}`);

        console.log(`\n📈 RECENT ACTIVITY:`);
        console.log(`   Last 24 Hours: ${stats.recentActivity.last24Hours} transactions`);
        console.log(`   Avg Amount: ${stats.recentActivity.avgTransactionAmount} credits`);

        return stats;

    } catch (error) {
        console.error('❌ Test 5 failed:', error.message);
        throw error;
    }
}

/**
 * Cleanup function
 */
async function cleanup() {
    console.log('\n🧹 Cleaning up test data...');

    await User.deleteMany({ 
        email: { 
            $in: [
                'alice.fraud@test.com',
                'bob.fraud@test.com',
                'charlie.fraud@test.com',
                'attacker1@test.com',
                'attacker2@test.com',
                'newbie@test.com',
                'trusted@test.com'
            ] 
        } 
    });

    await Transaction.deleteMany({
        description: { 
            $regex: /Loop transaction|High-frequency transaction/ 
        }
    });

    console.log('✅ Cleanup complete');
}

/**
 * Main test runner
 */
async function runTests() {
    console.log('🚀 SkillVault Fraud Detection Test Suite');
    console.log('=========================================\n');

    await connectDB();

    try {
        // Run tests
        const test1Results = await testCircularTrading();
        const test2Results = await testHighFrequency();
        const test3Results = await testTrustScore();
        await testRiskAssessment(test1Results);
        await testDashboard();

        console.log('\n✅ === ALL TESTS COMPLETED SUCCESSFULLY ===\n');

        // Ask if user wants to cleanup
        console.log('Test data has been created in your database.');
        console.log('You can now test the API endpoints or view data in MongoDB.');
        console.log('\nTo cleanup test data, run: node backend/test/fraud-cleanup.js');

    } catch (error) {
        console.error('\n❌ TEST SUITE FAILED:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

// Run if called directly
if (require.main === module) {
    runTests();
}

module.exports = { 
    testCircularTrading, 
    testHighFrequency, 
    testTrustScore,
    testRiskAssessment,
    testDashboard,
    cleanup
};
