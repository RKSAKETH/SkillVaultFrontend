'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { WalletCard, StatsCard, UpcomingSessions } from '@/components/dashboard';
import { Card, Button, Badge } from '@/components/ui';
import { Plus, BookOpen, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
    const router = useRouter();
    const { user, token, isLoading: authLoading, isAuthenticated } = useAuth();

    const [walletData, setWalletData] = useState({ currentBalance: 0, totalEarned: 0, totalSpent: 0 });
    const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (token) {
            fetchDashboardData();
        }
    }, [token]);

    const fetchDashboardData = async () => {
        if (!token) return;

        setIsLoading(true);
        try {
            const [walletRes, sessionsRes] = await Promise.all([
                api.getWallet(token),
                api.getMySessions(token, { upcoming: true, limit: 5 }),
            ]);

            setWalletData(walletRes.data.wallet);
            setUpcomingSessions(sessionsRes.data.sessions);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">
                    Welcome back, {user.firstName}!
                </h1>
                <p className="text-gray-400 mt-1">
                    Here's an overview of your SkillVault activity.
                </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 mb-8">
                <Link href="/marketplace">
                    <Button>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Find a Tutor
                    </Button>
                </Link>
                <Link href="/profile">
                    <Button variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Skills
                    </Button>
                </Link>
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column - Wallet & Stats */}
                <div className="lg:col-span-1 space-y-6">
                    <WalletCard
                        balance={user.creditBalance}
                        totalEarned={walletData.totalEarned}
                        totalSpent={walletData.totalSpent}
                    />

                    <StatsCard
                        sessionsTaught={user.stats?.totalSessionsTaught || 0}
                        sessionsLearned={user.stats?.totalSessionsLearned || 0}
                        hoursTaught={user.stats?.totalHoursTaught || 0}
                        hoursLearned={user.stats?.totalHoursLearned || 0}
                        averageRating={user.stats?.averageRating || 0}
                        totalRatings={user.stats?.totalRatings || 0}
                    />
                </div>

                {/* Right Column - Sessions & Skills */}
                <div className="lg:col-span-2 space-y-6">
                    <UpcomingSessions sessions={upcomingSessions} />

                    {/* Teaching Skills */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Your Teaching Skills</h3>
                            <Link href="/profile" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
                                Manage <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {(user.teachingSkills || []).length === 0 ? (
                            <div className="text-center py-8">
                                <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400 mb-4">You haven't listed any teaching skills yet.</p>
                                <Link href="/profile">
                                    <Button variant="outline" size="sm">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Your First Skill
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {(user.teachingSkills || []).map((skill) => (
                                    <div
                                        key={skill._id}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50"
                                    >
                                        <span className="text-white font-medium">{skill.name}</span>
                                        <Badge className="text-xs">{skill.proficiency}</Badge>
                                        <span className="text-sm text-amber-400">{skill.hourlyRate} cr/hr</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
