'use client';

import React from 'react';
import { Card } from '@/components/ui';
import { Sparkles, TrendingUp, TrendingDown, Clock, Star } from 'lucide-react';
import { formatCredits } from '@/lib/utils';

interface WalletCardProps {
    balance: number;
    totalEarned: number;
    totalSpent: number;
}

export function WalletCard({ balance, totalEarned, totalSpent }: WalletCardProps) {
    return (
        <Card className="relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-indigo-600/10 to-transparent" />

            <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Available Balance</p>
                        <p className="text-3xl font-bold text-white">
                            {formatCredits(balance)} <span className="text-lg text-gray-400">Credits</span>
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <div>
                            <p className="text-xs text-gray-400">Total Earned</p>
                            <p className="text-lg font-semibold text-green-400">+{formatCredits(totalEarned)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <TrendingDown className="w-5 h-5 text-red-400" />
                        <div>
                            <p className="text-xs text-gray-400">Total Spent</p>
                            <p className="text-lg font-semibold text-red-400">-{formatCredits(totalSpent)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}

interface StatsCardProps {
    sessionsTaught: number;
    sessionsLearned: number;
    hoursTaught: number;
    hoursLearned: number;
    averageRating: number;
    totalRatings: number;
}

export function StatsCard({
    sessionsTaught,
    sessionsLearned,
    hoursTaught,
    hoursLearned,
    averageRating,
    totalRatings,
}: StatsCardProps) {
    return (
        <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Your Stats</h3>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/20">
                            <Clock className="w-4 h-4 text-violet-400" />
                        </div>
                        <span className="text-gray-300">Hours Taught</span>
                    </div>
                    <span className="text-lg font-semibold text-white">{hoursTaught.toFixed(1)}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                            <Clock className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-gray-300">Hours Learned</span>
                    </div>
                    <span className="text-lg font-semibold text-white">{hoursLearned.toFixed(1)}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                            <Star className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-gray-300">Average Rating</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-lg font-semibold text-white">
                            {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
                        </span>
                        {totalRatings > 0 && (
                            <span className="text-sm text-gray-500">({totalRatings})</span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="text-center p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20">
                        <p className="text-2xl font-bold text-white">{sessionsTaught}</p>
                        <p className="text-xs text-gray-400">Sessions Taught</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                        <p className="text-2xl font-bold text-white">{sessionsLearned}</p>
                        <p className="text-xs text-gray-400">Sessions Learned</p>
                    </div>
                </div>
            </div>
        </Card>
    );
}
