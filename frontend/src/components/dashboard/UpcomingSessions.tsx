'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Avatar, Badge, Button } from '@/components/ui';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { formatDate, formatTime, formatDuration, formatCredits } from '@/lib/utils';
import { Session } from '@/types';

interface UpcomingSessionsProps {
    sessions: Session[];
}

export function UpcomingSessions({ sessions }: UpcomingSessionsProps) {
    if (sessions.length === 0) {
        return (
            <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Upcoming Sessions</h3>
                <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 mb-4">No upcoming sessions</p>
                    <Link href="/marketplace">
                        <Button variant="outline" size="sm">
                            Browse Tutors
                        </Button>
                    </Link>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Upcoming Sessions</h3>
                <Link href="/sessions" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
                    View all <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="space-y-3">
                {sessions.slice(0, 3).map((session) => {
                    const otherUser = typeof session.tutor === 'object' ? session.tutor : session.student;
                    const isTutor = typeof session.student === 'object';

                    return (
                        <Link
                            key={session._id}
                            href={`/sessions/${session._id}`}
                            className="block p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600/50 transition-all"
                        >
                            <div className="flex items-start gap-3">
                                {typeof otherUser === 'object' && (
                                    <Avatar
                                        src={otherUser.avatar}
                                        firstName={otherUser.firstName}
                                        lastName={otherUser.lastName}
                                        size="md"
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-white truncate">
                                            {session.skill.name}
                                        </span>
                                        <Badge variant="status" status={session.status}>
                                            {session.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-400 truncate">
                                        {isTutor ? 'Teaching' : 'Learning from'}{' '}
                                        {typeof otherUser === 'object' && `${otherUser.firstName} ${otherUser.lastName}`}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatDate(session.scheduledAt)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatTime(session.scheduledAt)} · {formatDuration(session.duration)}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`font-semibold ${isTutor ? 'text-green-400' : 'text-red-400'}`}>
                                        {isTutor ? '+' : '-'}{formatCredits(session.creditCost)}
                                    </span>
                                    <p className="text-xs text-gray-500">credits</p>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </Card>
    );
}
