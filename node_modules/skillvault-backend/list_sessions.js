require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Session = require('./models/Session');

async function listSessions() {
    await connectDB();

    const sessions = await Session.find({
        status: { $in: ['pending', 'confirmed', 'in_progress'] }
    }).lean();

    console.log('\nActive Sessions:', sessions.length);

    sessions.forEach(sess => {
        console.log(JSON.stringify({
            id: sess._id,
            skill: sess.skill?.name,
            scheduledAt: sess.scheduledAt,
            duration: sess.duration,
            status: sess.status
        }, null, 2));
    });

    process.exit(0);
}

listSessions();
