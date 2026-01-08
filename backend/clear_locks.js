// Script to clear session locks
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { Session } = require('./models');

async function clearLocks() {
    await connectDB();

    console.log('Clearing locks on all sessions...');

    const result = await Session.updateMany(
        { lockedUntil: { $exists: true } },
        { $set: { lockedUntil: null } }
    );

    console.log(`Updated ${result.modifiedCount} sessions`);

    // Also reset any sessions stuck in bad states
    const pendingSessions = await Session.find({ status: 'pending' });
    console.log(`Found ${pendingSessions.length} pending sessions:`);

    for (const session of pendingSessions) {
        console.log(`  - ${session._id}: ${session.skill?.name}, lockedUntil: ${session.lockedUntil}`);
    }

    process.exit(0);
}

clearLocks().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
