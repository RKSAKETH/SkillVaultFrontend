'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { SessionList } from '@/components/sessions';
import { Button, Card, Select } from '@/components/ui';
import { Calendar, Clock, BookOpen, GraduationCap } from 'lucide-react';

type TabType = 'upcoming' | 'past' | 'teaching' | 'learning';

export default function SessionsPage() {
    const router = useRouter();
    const { user, token, isLoading: authLoading, isAuthenticated, refreshUser } = useAuth();

    const [sessions, setSessions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('upcoming');
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (token) {
            fetchSessions();
        }
    }, [token, activeTab]);

    const fetchSessions = async () => {
        if (!token) return;

        setIsLoading(true);
        try {
            let params: any = { limit: 20 };

            switch (activeTab) {
                case 'upcoming':
                    params.upcoming = true;
                    break;
                case 'past':
                    params.status = 'completed';
                    break;
                case 'teaching':
                    params.role = 'tutor';
                    break;
                case 'learning':
                    params.role = 'student';
                    break;
            }

            const response = await api.getMySessions(token, params);
            setSessions(response.data.sessions);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async (sessionId: string) => {
        if (!token) return;

        try {
            await api.confirmSession(token, sessionId);
            fetchSessions();
        } catch (error: any) {
            alert(error.message || 'Failed to confirm session');
        }
    };

    const handleComplete = async (sessionId: string) => {
        if (!token) return;

        try {
            await api.completeSession(token, sessionId);
            fetchSessions();
            refreshUser();
        } catch (error: any) {
            alert(error.message || 'Failed to complete session');
        }
    };

    const handleCancel = async (sessionId: string) => {
        if (!token) return;

        const reason = prompt('Please provide a reason for cancellation (optional):');

        try {
            await api.cancelSession(token, sessionId, reason || undefined);
            fetchSessions();
        } catch (error: any) {
            alert(error.message || 'Failed to cancel session');
        }
    };

    const tabs = [
        { id: 'upcoming', label: 'Upcoming', icon: Calendar },
        { id: 'past', label: 'Completed', icon: Clock },
        { id: 'teaching', label: 'As Tutor', icon: GraduationCap },
        { id: 'learning', label: 'As Student', icon: BookOpen },
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Sessions</h1>
                <p className="text-gray-400 mt-1">
                    View and manage your tutoring sessions.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Sessions List */}
            <SessionList
                sessions={sessions}
                currentUserId={user?.id || ''}
                onConfirm={handleConfirm}
                onComplete={handleComplete}
                onCancel={handleCancel}
                isLoading={isLoading}
                emptyMessage={`No ${activeTab} sessions found`}
            />

            {/* Pagination info */}
            {!isLoading && sessions.length > 0 && (
                <p className="text-center text-gray-500 mt-6 text-sm">
                    Showing {sessions.length} of {pagination.total} sessions
                </p>
            )}
        </div>
    );
}
