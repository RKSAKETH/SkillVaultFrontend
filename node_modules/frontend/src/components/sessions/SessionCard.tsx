'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Avatar, Badge, Button } from '@/components/ui';
import { Calendar, Clock, Video, MapPin, MessageSquare, ArrowRight, Phone } from 'lucide-react';
import { formatDate, formatTime, formatDuration, formatCredits } from '@/lib/utils';
import { Session, SessionStatus } from '@/types';

interface SessionCardProps {
    session: Session;
    currentUserId: string;
    onConfirm?: (sessionId: string) => void;
    onComplete?: (sessionId: string) => void;
    onCancel?: (sessionId: string) => void;
}

export function SessionCard({
    session,
    currentUserId,
    onConfirm,
    onComplete,
    onCancel,
}: SessionCardProps) {
    const router = useRouter();

    const isTutor = typeof session.tutor === 'object'
        ? session.tutor.id === currentUserId
        : session.tutor === currentUserId;

    const otherUser = isTutor
        ? (typeof session.student === 'object' ? session.student : null)
        : (typeof session.tutor === 'object' ? session.tutor : null);

    const now = new Date();
    const scheduledAt = new Date(session.scheduledAt);
    const sessionEnd = new Date(scheduledAt.getTime() + session.duration * 60000);
    const earlyJoinWindow = new Date(scheduledAt.getTime() - 5 * 60000); // 5 min before

    const isPast = scheduledAt < now;
    const canConfirm = isTutor && session.status === 'pending';
    const canComplete = (session.status === 'confirmed' || session.status === 'in_progress') && isPast;
    const canCancel = session.status === 'pending' || session.status === 'confirmed';

    // Check if this is a video session that's confirmed/in_progress
    const isVideoSession = (session.status === 'confirmed' || session.status === 'in_progress') &&
        (session.meetingDetails?.type === 'video' || !session.meetingDetails?.type);

    // Can join if within time window (5 min before start to session end)
    const isWithinTimeWindow = now >= earlyJoinWindow && now < sessionEnd;

    // Show Join Call button for all confirmed video sessions (for easier testing)
    // In production, you may want to restrict to isWithinTimeWindow
    const canJoinCall = isVideoSession;

    // Show countdown/status for when call is available
    const getCallStatus = () => {
        if (!isVideoSession) return null;
        if (now < earlyJoinWindow) {
            const minutesUntil = Math.ceil((earlyJoinWindow.getTime() - now.getTime()) / 60000);
            return `Call available in ${minutesUntil} min`;
        }
        if (now >= sessionEnd) return 'Session ended';
        return 'Call available now';
    };

    const handleJoinCall = () => {
        router.push(`/sessions/call?sessionId=${session._id}`);
    };

    const getMeetingIcon = () => {
        switch (session.meetingDetails?.type) {
            case 'video':
                return <Video className="w-4 h-4" />;
            case 'in-person':
                return <MapPin className="w-4 h-4" />;
            default:
                return <MessageSquare className="w-4 h-4" />;
        }
    };

    return (
        <Card className="hover:border-gray-600/50 transition-all">
            <div className="flex items-start gap-4">
                {otherUser && (
                    <Avatar
                        src={otherUser.avatar}
                        firstName={otherUser.firstName}
                        lastName={otherUser.lastName}
                        size="lg"
                    />
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">
                            {session.skill.name}
                        </h3>
                        <Badge variant="status" status={session.status}>
                            {session.status.replace('_', ' ')}
                        </Badge>
                    </div>

                    <p className="text-sm text-gray-400 mb-2">
                        {isTutor ? 'Teaching' : 'Learning from'}{' '}
                        {otherUser && (
                            <span className="text-white">
                                {otherUser.firstName} {otherUser.lastName}
                            </span>
                        )}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {formatDate(session.scheduledAt)}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {formatTime(session.scheduledAt)} · {formatDuration(session.duration)}
                        </span>
                        <span className="flex items-center gap-1.5">
                            {getMeetingIcon()}
                            {session.meetingDetails?.type || 'Video'}
                        </span>
                    </div>
                </div>

                <div className="text-right">
                    <p className={`text-lg font-bold ${isTutor ? 'text-green-400' : 'text-red-400'}`}>
                        {isTutor ? '+' : '-'}{formatCredits(session.creditCost)}
                    </p>
                    <p className="text-xs text-gray-500">credits</p>
                </div>
            </div>

            {/* Actions */}
            {(canConfirm || canComplete || canCancel || canJoinCall) && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700/50">
                    {canJoinCall && (
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                onClick={handleJoinCall}
                                className={`${isWithinTimeWindow
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-gray-600 hover:bg-gray-700'
                                    } text-white`}
                            >
                                <Phone className="w-4 h-4 mr-1" />
                                Join Call
                            </Button>
                            {getCallStatus() && (
                                <span className={`text-xs ${isWithinTimeWindow ? 'text-green-400' : 'text-gray-500'
                                    }`}>
                                    {getCallStatus()}
                                </span>
                            )}
                        </div>
                    )}
                    {canConfirm && (
                        <Button size="sm" onClick={() => onConfirm?.(session._id)}>
                            Confirm
                        </Button>
                    )}
                    {canComplete && (
                        <Button size="sm" onClick={() => onComplete?.(session._id)}>
                            Mark Complete
                        </Button>
                    )}
                    {canCancel && (
                        <Button size="sm" variant="outline" onClick={() => onCancel?.(session._id)}>
                            Cancel
                        </Button>
                    )}
                    <Link href={`/sessions/${session._id}`} className="ml-auto">
                        <Button size="sm" variant="ghost">
                            Details <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </Link>
                </div>
            )}
        </Card>
    );
}

interface SessionListProps {
    sessions: Session[];
    currentUserId: string;
    onConfirm?: (sessionId: string) => void;
    onComplete?: (sessionId: string) => void;
    onCancel?: (sessionId: string) => void;
    isLoading?: boolean;
    emptyMessage?: string;
}

export function SessionList({
    sessions,
    currentUserId,
    onConfirm,
    onComplete,
    onCancel,
    isLoading,
    emptyMessage = 'No sessions found',
}: SessionListProps) {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-gray-700" />
                            <div className="flex-1">
                                <div className="h-5 bg-gray-700 rounded w-1/3 mb-2" />
                                <div className="h-4 bg-gray-700 rounded w-1/2 mb-3" />
                                <div className="h-4 bg-gray-700 rounded w-2/3" />
                            </div>
                            <div className="w-16">
                                <div className="h-6 bg-gray-700 rounded mb-1" />
                                <div className="h-3 bg-gray-700 rounded w-1/2 ml-auto" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <Card className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">{emptyMessage}</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {sessions.map((session) => (
                <SessionCard
                    key={session._id}
                    session={session}
                    currentUserId={currentUserId}
                    onConfirm={onConfirm}
                    onComplete={onComplete}
                    onCancel={onCancel}
                />
            ))}
        </div>
    );
}
