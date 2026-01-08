require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const users = await User.find({}).select('firstName lastName email teachingSkills');
        
        console.log(`Total users: ${users.length}\n`);
        
        users.forEach(u => {
            console.log(`${u.firstName} ${u.lastName} (${u.email})`);
            console.log(`Teaching skills: ${u.teachingSkills.length}`);
            u.teachingSkills.forEach(s => {
                console.log(`  - ${s.name} (${s.category}) - ${s.proficiency}`);
            });
            console.log('');
        });

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUsers();
