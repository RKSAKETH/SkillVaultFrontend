const { User } = require('../models');
const { SKILL_CATEGORIES, PROFICIENCY_LEVELS } = require('../config/constants');

/**
 * User Controller
 * Handles user profiles, skills, and marketplace functionality
 */
const userController = {
    /**
     * Get user public profile
     * GET /api/users/:id
     */
    getProfile: async (req, res, next) => {
        try {
            const user = await User.findById(req.params.id);

            if (!user || !user.isActive) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            res.json({
                success: true,
                data: {
                    user: user.getPublicProfile()
                }
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Search for tutors
     * GET /api/users/search
     */
    searchTutors: async (req, res, next) => {
        try {
            const {
                skill,
                category,
                proficiency,
                page = 1,
                limit = 20,
                sortBy = 'rating' // 'rating', 'sessions', 'newest'
            } = req.query;

            const query = {
                isActive: true,
                'teachingSkills.0': { $exists: true } // Has at least one teaching skill
            };

            // Filter by skill name (text search)
            if (skill) {
                query['teachingSkills.name'] = { $regex: skill, $options: 'i' };
            }

            // Filter by category
            if (category && SKILL_CATEGORIES.includes(category)) {
                query['teachingSkills.category'] = category;
            }

            // Filter by proficiency
            if (proficiency && PROFICIENCY_LEVELS.includes(proficiency)) {
                query['teachingSkills.proficiency'] = proficiency;
            }

            // Exclude current user if authenticated
            if (req.user) {
                query._id = { $ne: req.user._id };
            }

            // Sort options
            let sort = {};
            switch (sortBy) {
                case 'rating':
                    sort = { 'stats.averageRating': -1, 'stats.totalRatings': -1 };
                    break;
                case 'sessions':
                    sort = { 'stats.totalSessionsTaught': -1 };
                    break;
                case 'newest':
                    sort = { createdAt: -1 };
                    break;
                default:
                    sort = { 'stats.averageRating': -1 };
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const [users, total] = await Promise.all([
                User.find(query)
                    .select('firstName lastName avatar bio teachingSkills stats createdAt')
                    .sort(sort)
                    .skip(skip)
                    .limit(parseInt(limit)),
                User.countDocuments(query)
            ]);

            res.json({
                success: true,
                data: {
                    tutors: users.map(u => ({
                        id: u._id,
                        firstName: u.firstName,
                        lastName: u.lastName,
                        fullName: u.fullName,
                        avatar: u.avatar,
                        bio: u.bio,
                        teachingSkills: u.teachingSkills,
                        stats: u.stats
                    })),
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Add a teaching skill
     * POST /api/users/skills/teaching
     */
    addTeachingSkill: async (req, res, next) => {
        try {
            const { name, category, proficiency, description, hourlyRate } = req.body;

            // Validate category and proficiency
            if (!SKILL_CATEGORIES.includes(category)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid category'
                });
            }

            if (!PROFICIENCY_LEVELS.includes(proficiency)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid proficiency level'
                });
            }

            const user = await User.findById(req.user._id);

            // Check if skill already exists
            const existingSkill = user.teachingSkills.find(
                s => s.name.toLowerCase() === name.toLowerCase() && s.category === category
            );

            if (existingSkill) {
                return res.status(400).json({
                    success: false,
                    error: 'You already have this skill listed'
                });
            }

            // Add skill
            user.teachingSkills.push({
                name: name.trim(),
                category,
                proficiency,
                description: description || '',
                hourlyRate: hourlyRate || 1
            });

            await user.save();

            res.status(201).json({
                success: true,
                data: {
                    teachingSkills: user.teachingSkills
                }
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Update a teaching skill
     * PUT /api/users/skills/teaching/:skillId
     */
    updateTeachingSkill: async (req, res, next) => {
        try {
            const { skillId } = req.params;
            const updates = req.body;

            const user = await User.findById(req.user._id);

            const skill = user.teachingSkills.id(skillId);

            if (!skill) {
                return res.status(404).json({
                    success: false,
                    error: 'Skill not found'
                });
            }

            // Update allowed fields
            const allowedUpdates = ['proficiency', 'description', 'hourlyRate'];
            allowedUpdates.forEach(field => {
                if (updates[field] !== undefined) {
                    skill[field] = updates[field];
                }
            });

            await user.save();

            res.json({
                success: true,
                data: {
                    skill
                }
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Remove a teaching skill
     * DELETE /api/users/skills/teaching/:skillId
     */
    removeTeachingSkill: async (req, res, next) => {
        try {
            const { skillId } = req.params;

            const user = await User.findById(req.user._id);

            const skill = user.teachingSkills.id(skillId);

            if (!skill) {
                return res.status(404).json({
                    success: false,
                    error: 'Skill not found'
                });
            }

            skill.deleteOne();
            await user.save();

            res.json({
                success: true,
                message: 'Skill removed successfully'
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Add a learning interest
     * POST /api/users/skills/learning
     */
    addLearningInterest: async (req, res, next) => {
        try {
            const { name, category } = req.body;

            if (!SKILL_CATEGORIES.includes(category)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid category'
                });
            }

            const user = await User.findById(req.user._id);

            // Check if already exists
            const existing = user.learningInterests.find(
                s => s.name.toLowerCase() === name.toLowerCase() && s.category === category
            );

            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: 'Interest already added'
                });
            }

            user.learningInterests.push({
                name: name.trim(),
                category
            });

            await user.save();

            res.status(201).json({
                success: true,
                data: {
                    learningInterests: user.learningInterests
                }
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Remove a learning interest
     * DELETE /api/users/skills/learning/:interestId
     */
    removeLearningInterest: async (req, res, next) => {
        try {
            const { interestId } = req.params;

            const user = await User.findById(req.user._id);

            const interest = user.learningInterests.id(interestId);

            if (!interest) {
                return res.status(404).json({
                    success: false,
                    error: 'Interest not found'
                });
            }

            interest.deleteOne();
            await user.save();

            res.json({
                success: true,
                message: 'Interest removed successfully'
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Get skill categories and proficiency levels
     * GET /api/users/skills/options
     */
    getSkillOptions: async (req, res, next) => {
        try {
            res.json({
                success: true,
                data: {
                    categories: SKILL_CATEGORIES,
                    proficiencyLevels: PROFICIENCY_LEVELS
                }
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = userController;
