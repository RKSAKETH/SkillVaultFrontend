const mongoose = require('mongoose');
require('dotenv').config();

const fixIndexes = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const collection = mongoose.connection.collection('users');

        // List current indexes
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes.map(i => i.name));

        // Drop the entire users collection (wipes data AND indexes)
        console.log('Dropping "users" collection...');
        try {
            await collection.drop();
            console.log('Collection dropped successfully.');
        } catch (e) {
            if (e.code === 26) {
                console.log('Collection does not exist, skipping drop.');
            } else {
                throw e;
            }
        }

        console.log('The server will recreate the collection and indexes on next startup.');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing indexes:', error);
        process.exit(1);
    }
};

fixIndexes();
