require('dotenv').config();
const mongoose = require('mongoose');

const fix = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // 1. Find Eren
        const eren = await mongoose.connection.collection('users').findOne({
            $or: [
                { firstName: { $regex: 'eren', $options: 'i' } },
                { lastName: { $regex: 'yeager', $options: 'i' } }
            ]
        });

        if (!eren) {
            console.log('Eren not found!');
            return;
        }

        console.log(`Found Eren: ${eren._id}`);

        // 2. Find sessions for Eren in the future
        const now = new Date();
        const query = {
            $or: [{ tutor: eren._id }, { student: eren._id }],
            status: { $in: ['pending', 'confirmed'] }
        };

        const sessions = await mongoose.connection.collection('sessions').find(query).toArray();
        console.log(`Found ${sessions.length} future conflicting sessions.`);

        if (sessions.length > 0) {
            const ids = sessions.map(s => s._id);
            const result = await mongoose.connection.collection('sessions').deleteMany({ _id: { $in: ids } });
            console.log(`Deleted ${result.deletedCount} sessions.`);
        } else {
            console.log('No conflict sessions found to delete.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

fix();
