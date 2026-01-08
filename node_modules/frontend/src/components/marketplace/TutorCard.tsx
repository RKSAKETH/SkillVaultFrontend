'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Avatar, Badge, Button } from '@/components/ui';
import { Star, Clock, BookOpen } from 'lucide-react';
import { TeachingSkill, UserStats } from '@/types';

interface Tutor {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    avatar: string | null;
    bio: string;
    teachingSkills: TeachingSkill[];
    stats: UserStats;
}

interface TutorCardProps {
    tutor: Tutor;
    onBook?: (tutor: Tutor) => void;
}

export function TutorCard({ tutor, onBook }: TutorCardProps) {
    return (
        <Card className="h-full flex flex-col" hover>
            <div className="flex items-start gap-4 mb-4">
                <Avatar
                    src={tutor.avatar}
                    firstName={tutor.firstName}
                    lastName={tutor.lastName}
                    size="lg"
                />
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">
                        {tutor.fullName}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            {tutor.stats.averageRating > 0 ? tutor.stats.averageRating.toFixed(1) : 'New'}
                            {tutor.stats.totalRatings > 0 && (
                                <span className="text-gray-500">({tutor.stats.totalRatings})</span>
                            )}
                        </span>
                        <span className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            {tutor.stats.totalSessionsTaught} sessions
                        </span>
                    </div>
                </div>
            </div>

            {tutor.bio && (
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {tutor.bio}
                </p>
            )}

            <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Teaching Skills</p>
                <div className="flex flex-wrap gap-2">
                    {tutor.teachingSkills.slice(0, 4).map((skill) => (
                        <Badge key={skill._id}>
                            {skill.name}
                        </Badge>
                    ))}
                    {tutor.teachingSkills.length > 4 && (
                        <Badge className="bg-gray-700/50 text-gray-400 border-gray-600">
                            +{tutor.teachingSkills.length - 4} more
                        </Badge>
                    )}
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-400">
                        From{' '}
                        <span className="text-amber-400 font-semibold">
                            {Math.min(...tutor.teachingSkills.map(s => s.hourlyRate))}
                        </span>{' '}
                        credits/hr
                    </span>
                </div>
                <Button size="sm" onClick={() => onBook?.(tutor)}>
                    Book
                </Button>
            </div>
        </Card>
    );
}

interface TutorListProps {
    tutors: Tutor[];
    onBook?: (tutor: Tutor) => void;
    isLoading?: boolean;
}

export function TutorList({ tutors, onBook, isLoading }: TutorListProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-gray-700" />
                            <div className="flex-1">
                                <div className="h-5 bg-gray-700 rounded w-3/4 mb-2" />
                                <div className="h-4 bg-gray-700 rounded w-1/2" />
                            </div>
                        </div>
                        <div className="h-12 bg-gray-700 rounded mb-4" />
                        <div className="flex gap-2 mb-4">
                            <div className="h-6 bg-gray-700 rounded w-20" />
                            <div className="h-6 bg-gray-700 rounded w-24" />
                        </div>
                        <div className="h-10 bg-gray-700 rounded" />
                    </Card>
                ))}
            </div>
        );
    }

    if (tutors.length === 0) {
        return (
            <Card className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No tutors found</h3>
                <p className="text-gray-400 mb-6">
                    Try adjusting your search filters or check back later.
                </p>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutors.map((tutor) => (
                <TutorCard key={tutor.id} tutor={tutor} onBook={onBook} />
            ))}
        </div>
    );
}
