require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function addTeachingSkills() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Add teaching skills to existing test users
        const updates = [
            {
                email: 'alice.fraud@test.com',
                skills: [
                    {
                        name: 'Python Programming',
                        category: 'Programming',
                        proficiency: 'Expert',
                        description: 'Full-stack Python development with Django and Flask',
                        hourlyRate: 1
                    },
                    {
                        name: 'Data Science',
                        category: 'Programming',
                        proficiency: 'Advanced',
                        description: 'Machine learning, pandas, numpy, scikit-learn',
                        hourlyRate: 1
                    }
                ]
            },
            {
                email: 'bob.fraud@test.com',
                skills: [
                    {
                        name: 'JavaScript & Node.js',
                        category: 'Programming',
                        proficiency: 'Advanced',
                        description: 'Backend development with Express, MongoDB, REST APIs',
                        hourlyRate: 1
                    },
                    {
                        name: 'React & Next.js',
                        category: 'Programming',
                        proficiency: 'Expert',
                        description: 'Modern React with hooks, context, and Next.js framework',
                        hourlyRate: 1
                    }
                ]
            },
            {
                email: 'charlie.fraud@test.com',
                skills: [
                    {
                        name: 'Spanish Language',
                        category: 'Languages',
                        proficiency: 'Expert',
                        description: 'Native Spanish speaker, conversational and business Spanish',
                        hourlyRate: 1
                    },
                    {
                        name: 'Guitar',
                        category: 'Music',
                        proficiency: 'Advanced',
                        description: 'Classical and acoustic guitar, music theory basics',
                        hourlyRate: 1
                    }
                ]
            },
            {
                email: 'trusted@test.com',
                skills: [
                    {
                        name: 'Calculus',
                        category: 'Mathematics',
                        proficiency: 'Expert',
                        description: 'Differential and integral calculus, limits, derivatives',
                        hourlyRate: 1
                    },
                    {
                        name: 'Physics',
                        category: 'Science',
                        proficiency: 'Advanced',
                        description: 'Classical mechanics, thermodynamics, electromagnetism',
                        hourlyRate: 1
                    }
                ]
            },
            {
                email: 'newbie@test.com',
                skills: [
                    {
                        name: 'Photography',
                        category: 'Art & Design',
                        proficiency: 'Beginner',
                        description: 'Basic camera skills, composition, lighting fundamentals',
                        hourlyRate: 1
                    }
                ]
            }
        ];

        for (const update of updates) {
            const user = await User.findOne({ email: update.email });
            if (user) {
                user.teachingSkills = update.skills;
                await user.save();
                console.log(`✅ Added ${update.skills.length} teaching skills to ${user.firstName} ${user.lastName}`);
            } else {
                console.log(`❌ User not found: ${update.email}`);
            }
        }

        console.log('\n✅ All teaching skills added successfully!');
        console.log('\n📊 Summary:');
        const tutors = await User.find({ 'teachingSkills.0': { $exists: true } });
        console.log(`Total tutors with skills: ${tutors.length}`);
        tutors.forEach(t => {
            console.log(`  - ${t.firstName} ${t.lastName}: ${t.teachingSkills.length} skills`);
        });

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

addTeachingSkills();
