'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Card, Button, Input, Select, Avatar, Badge, Modal } from '@/components/ui';
import {
    User,
    BookOpen,
    GraduationCap,
    Plus,
    Trash2,
    Star,
    Edit
} from 'lucide-react';
import { SKILL_CATEGORIES, PROFICIENCY_LEVELS } from '@/types';

export default function ProfilePage() {
    const router = useRouter();
    const { user, token, isLoading: authLoading, isAuthenticated, refreshUser } = useAuth();

    const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [newSkill, setNewSkill] = useState({
        name: '',
        category: SKILL_CATEGORIES[0],
        proficiency: PROFICIENCY_LEVELS[0],
        description: '',
        hourlyRate: 1,
    });
    const [profileData, setProfileData] = useState({
        firstName: '',
        lastName: '',
        bio: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    React.useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    React.useEffect(() => {
        if (user) {
            setProfileData({
                firstName: user.firstName,
                lastName: user.lastName,
                bio: user.bio || '',
            });
        }
    }, [user]);

    const handleAddSkill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setIsLoading(true);
        try {
            await api.addTeachingSkill(token, newSkill);
            await refreshUser();
            setIsAddSkillOpen(false);
            setNewSkill({
                name: '',
                category: SKILL_CATEGORIES[0],
                proficiency: PROFICIENCY_LEVELS[0],
                description: '',
                hourlyRate: 1,
            });
        } catch (error: any) {
            alert(error.message || 'Failed to add skill');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveSkill = async (skillId: string) => {
        if (!token || !confirm('Are you sure you want to remove this skill?')) return;

        try {
            await api.removeTeachingSkill(token, skillId);
            await refreshUser();
        } catch (error: any) {
            alert(error.message || 'Failed to remove skill');
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setIsLoading(true);
        try {
            await api.updateProfile(token, profileData);
            await refreshUser();
            setIsEditProfileOpen(false);
        } catch (error: any) {
            alert(error.message || 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Profile Header */}
            <Card className="mb-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <Avatar
                        src={user.avatar}
                        firstName={user.firstName}
                        lastName={user.lastName}
                        size="xl"
                    />

                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-white">{user.fullName}</h1>
                        <p className="text-gray-400 mt-1">{user.email}</p>
                        {user.bio && (
                            <p className="text-gray-300 mt-3">{user.bio}</p>
                        )}

                        <div className="flex items-center gap-4 mt-4 text-sm">
                            <div className="flex items-center gap-1.5">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                <span className="text-white font-medium">
                                    {(user.stats?.averageRating || 0) > 0 ? user.stats!.averageRating.toFixed(1) : 'New'}
                                </span>
                                {(user.stats?.totalRatings || 0) > 0 && (
                                    <span className="text-gray-500">({user.stats!.totalRatings} reviews)</span>
                                )}
                            </div>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-400">
                                {user.stats?.totalSessionsTaught || 0} sessions taught
                            </span>
                        </div>
                    </div>

                    <Button variant="outline" onClick={() => setIsEditProfileOpen(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                    </Button>
                </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Teaching Skills */}
                <Card>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-violet-500/20">
                                <GraduationCap className="w-5 h-5 text-violet-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-white">Teaching Skills</h2>
                        </div>
                        <Button size="sm" onClick={() => setIsAddSkillOpen(true)}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                        </Button>
                    </div>

                    {(user.teachingSkills || []).length === 0 ? (
                        <div className="text-center py-8 bg-gray-800/30 rounded-xl">
                            <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">No teaching skills added yet</p>
                            <p className="text-gray-500 text-sm mt-1">Add skills to start earning credits</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {(user.teachingSkills || []).map((skill) => (
                                <div
                                    key={skill._id}
                                    className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-white">{skill.name}</span>
                                            <Badge>{skill.proficiency}</Badge>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                            <span>{skill.category}</span>
                                            <span>•</span>
                                            <span className="text-amber-400">{skill.hourlyRate} credits/hr</span>
                                        </div>
                                        {skill.description && (
                                            <p className="text-sm text-gray-400 mt-2">{skill.description}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRemoveSkill(skill._id)}
                                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Learning Interests */}
                <Card>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                            <BookOpen className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Learning Interests</h2>
                    </div>

                    {(user.learningInterests || []).length === 0 ? (
                        <div className="text-center py-8 bg-gray-800/30 rounded-xl">
                            <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">No learning interests added</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {(user.learningInterests || []).map((interest) => (
                                <div
                                    key={interest._id}
                                    className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300"
                                >
                                    {interest.name}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Add Skill Modal */}
            <Modal
                isOpen={isAddSkillOpen}
                onClose={() => setIsAddSkillOpen(false)}
                title="Add Teaching Skill"
            >
                <form onSubmit={handleAddSkill} className="space-y-5">
                    <Input
                        label="Skill Name"
                        placeholder="e.g., React, Python, Spanish..."
                        value={newSkill.name}
                        onChange={(e) => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                        required
                    />

                    <Select
                        label="Category"
                        value={newSkill.category}
                        onChange={(e) => setNewSkill(prev => ({ ...prev, category: e.target.value as any }))}
                        options={SKILL_CATEGORIES.map(c => ({ value: c, label: c }))}
                    />

                    <Select
                        label="Proficiency Level"
                        value={newSkill.proficiency}
                        onChange={(e) => setNewSkill(prev => ({ ...prev, proficiency: e.target.value as any }))}
                        options={PROFICIENCY_LEVELS.map(p => ({ value: p, label: p }))}
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Credits per Hour: {newSkill.hourlyRate}
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="5"
                            step="0.5"
                            value={newSkill.hourlyRate}
                            onChange={(e) => setNewSkill(prev => ({ ...prev, hourlyRate: Number(e.target.value) }))}
                            className="w-full accent-violet-500"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>1 credit</span>
                            <span>5 credits</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            value={newSkill.description}
                            onChange={(e) => setNewSkill(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Briefly describe your experience with this skill..."
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[80px] resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsAddSkillOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" isLoading={isLoading}>
                            Add Skill
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Profile Modal */}
            <Modal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                title="Edit Profile"
            >
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="First Name"
                            value={profileData.firstName}
                            onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                            required
                        />
                        <Input
                            label="Last Name"
                            value={profileData.lastName}
                            onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Bio
                        </label>
                        <textarea
                            value={profileData.bio}
                            onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="Tell others about yourself..."
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[100px] resize-none"
                            maxLength={500}
                        />
                        <p className="text-right text-xs text-gray-500 mt-1">
                            {profileData.bio.length}/500
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsEditProfileOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" isLoading={isLoading}>
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
