'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Card, Avatar, Badge } from '@/components/ui';
import {
    Sparkles,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Filter
} from 'lucide-react';
import { formatCredits, formatDateTime, getTransactionTypeColor, getTransactionSign } from '@/lib/utils';
import { Transaction } from '@/types';

export default function WalletPage() {
    const router = useRouter();
    const { user, token, isLoading: authLoading, isAuthenticated } = useAuth();

    const [walletData, setWalletData] = useState({ currentBalance: 0, totalEarned: 0, totalSpent: 0 });
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token, filter]);

    const fetchData = async () => {
        if (!token) return;

        setIsLoading(true);
        try {
            const [walletRes, transactionsRes] = await Promise.all([
                api.getWallet(token),
                api.getTransactions(token, { type: filter || undefined, limit: 50 }),
            ]);

            setWalletData(walletRes.data.wallet);
            setTransactions(transactionsRes.data.transactions);
        } catch (error) {
            console.error('Failed to fetch wallet data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filterOptions = [
        { value: '', label: 'All Transactions' },
        { value: 'credit', label: 'Credits Received' },
        { value: 'debit', label: 'Credits Spent' },
        { value: 'initial', label: 'Welcome Bonus' },
        { value: 'refund', label: 'Refunds' },
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Wallet</h1>
                <p className="text-gray-400 mt-1">
                    Manage your credits and view transaction history.
                </p>
            </div>

            {/* Balance Overview */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-gray-400 text-sm">Current Balance</span>
                        </div>
                        <p className="text-4xl font-bold text-white">
                            {formatCredits(user?.creditBalance || 0)}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">Time Credits</p>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-green-500/20">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                        <span className="text-gray-400 text-sm">Total Earned</span>
                    </div>
                    <p className="text-3xl font-bold text-green-400">
                        +{formatCredits(walletData.totalEarned)}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">From teaching sessions</p>
                </Card>

                <Card>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-red-500/20">
                            <TrendingDown className="w-5 h-5 text-red-400" />
                        </div>
                        <span className="text-gray-400 text-sm">Total Spent</span>
                    </div>
                    <p className="text-3xl font-bold text-red-400">
                        -{formatCredits(walletData.totalSpent)}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">On learning sessions</p>
                </Card>
            </div>

            {/* Transaction History */}
            <Card>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Transaction History</h2>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            {filterOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-800/30 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-gray-700" />
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-700 rounded w-1/3 mb-2" />
                                    <div className="h-3 bg-gray-700 rounded w-1/2" />
                                </div>
                                <div className="h-5 bg-gray-700 rounded w-16" />
                            </div>
                        ))}
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-12">
                        <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No transactions yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {transactions.map((tx) => (
                            <div
                                key={tx._id}
                                className="flex items-center gap-4 p-4 rounded-xl bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                            >
                                <div className={`p-2.5 rounded-full ${tx.type === 'credit' || tx.type === 'initial' || tx.type === 'bonus' || tx.type === 'refund'
                                        ? 'bg-green-500/20'
                                        : 'bg-red-500/20'
                                    }`}>
                                    {tx.type === 'credit' || tx.type === 'initial' || tx.type === 'bonus' || tx.type === 'refund' ? (
                                        <ArrowDownRight className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <ArrowUpRight className="w-5 h-5 text-red-400" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{tx.description}</p>
                                    <p className="text-sm text-gray-500">{formatDateTime(tx.createdAt)}</p>
                                </div>

                                {tx.counterparty && typeof tx.counterparty === 'object' && (
                                    <Avatar
                                        src={tx.counterparty.avatar}
                                        firstName={tx.counterparty.firstName}
                                        lastName={tx.counterparty.lastName}
                                        size="sm"
                                    />
                                )}

                                <div className="text-right">
                                    <p className={`text-lg font-semibold ${getTransactionTypeColor(tx.type)}`}>
                                        {getTransactionSign(tx.type)}{formatCredits(tx.amount)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Balance: {formatCredits(tx.balanceAfter)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
