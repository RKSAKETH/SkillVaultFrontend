// Script to cancel all pending/confirmed sessions for testing
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Session = require('./models/Session');

async function cancelAllSessions() {
    await connectDB();

    // Update all active sessions to cancelled
    const result = await Session.updateMany(
        { status: { $in: ['pending', 'confirmed', 'in_progress'] } },
        { $set: { status: 'cancelled' } }
    );

    console.log(`Cancelled ${result.modifiedCount} sessions`);

    // Verify
    const remaining = await Session.countDocuments({
        status: { $in: ['pending', 'confirmed', 'in_progress'] }
    });

    console.log(`Remaining active sessions: ${remaining}`);

    process.exit(0);
}

cancelAllSessions().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
