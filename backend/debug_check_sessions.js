require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { Session, User } = require('./models');

const checkSessions = async () => {
    console.log('Script started');
    console.log('URI exists:', !!process.env.MONGODB_URI);
    if (process.env.MONGODB_URI) {
        console.log('URI starts with:', process.env.MONGODB_URI.substring(0, 15) + '...');
    }
    await connectDB();

    try {
        // Find the tutor "eren yeager"
        const tutors = await User.find({
            $or: [
                { firstName: /eren/i },
                { lastName: /yeager/i }
            ]
        });

        console.log(`Found ${tutors.length} tutors matching "eren"`);

        for (const tutor of tutors) {
            console.log(`\nChecking sessions for Tutor: ${tutor.firstName} ${tutor.lastName} (${tutor._id})`);

            const sessions = await Session.find({
                $or: [{ tutor: tutor._id }, { student: tutor._id }]
            }).sort({ scheduledAt: 1 }).populate('student', 'firstName lastName').populate('tutor', 'firstName lastName');

            console.log(`Total sessions: ${sessions.length}`);

            sessions.forEach(s => {
                const start = new Date(s.scheduledAt);
                const end = new Date(start.getTime() + s.duration * 60000);
                console.log(`- [${s.status}] ${start.toISOString()} to ${end.toISOString()} (${s.duration} mins) | ID: ${s._id}`);
            });
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

checkSessions();
