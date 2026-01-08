require('dotenv').config();
const mongoose = require('mongoose');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Look for users with name Eren
        // Note: Using the collection names 'users' and 'sessions' (usually plural lowercase)
        const users = await mongoose.connection.collection('users').find({
            $or: [
                { firstName: { $regex: 'eren', $options: 'i' } },
                { lastName: { $regex: 'yeager', $options: 'i' } }
            ]
        }).toArray();

        console.log(`Found ${users.length} users.`);

        for (const u of users) {
            console.log(`User: ${u.firstName} ${u.lastName} (${u._id})`);
            // Check sessions
            const sessions = await mongoose.connection.collection('sessions').find({
                $or: [
                    { tutor: u._id },
                    { student: u._id }
                ]
            }).toArray();

            console.log(`Sessions for ${u.firstName}: ${sessions.length}`);
            sessions.forEach(s => {
                console.log(`- Status: ${s.status}, Time: ${s.scheduledAt}, Duration: ${s.duration}`);
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

check();
