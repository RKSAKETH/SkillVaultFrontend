/**
 * Fraud Detection Test Cleanup Script
 * 
 * Removes all test data created by fraud-test.js
 * 
 * Usage: node backend/test/fraud-cleanup.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { User, Transaction } = require('../models');

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🧹 Removing test users...');
        const userResult = await User.deleteMany({ 
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
        console.log(`   Removed ${userResult.deletedCount} test users`);

        console.log('🧹 Removing test transactions...');
        const txResult = await Transaction.deleteMany({
            description: { 
                $regex: /Loop transaction|High-frequency transaction/ 
            }
        });
        console.log(`   Removed ${txResult.deletedCount} test transactions`);

        console.log('\n✅ Cleanup complete!');

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Disconnected from MongoDB');
    }
}

cleanup();
