'use client';

import React, { useState } from 'react';
import { Button, Input, Select, Modal, Card, Avatar, Badge } from '@/components/ui';
import { Calendar, Clock, MessageSquare, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { SKILL_CATEGORIES, SESSION_DURATIONS, TeachingSkill } from '@/types';
import { formatCredits } from '@/lib/utils';

interface Tutor {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    avatar: string | null;
    teachingSkills: TeachingSkill[];
}

interface BookSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    tutor: Tutor | null;
    onSuccess?: () => void;
}

export function BookSessionModal({ isOpen, onClose, tutor, onSuccess }: BookSessionModalProps) {
    const { token, user, updateBalance } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [selectedSkill, setSelectedSkill] = useState<TeachingSkill | null>(null);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [duration, setDuration] = useState(60);
    const [notes, setNotes] = useState('');

    const creditCost = selectedSkill ? (duration / 60) * selectedSkill.hourlyRate : 0;
    const hasEnoughCredits = user && user.creditBalance >= creditCost;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tutor || !selectedSkill || !token) return;

        setIsLoading(true);
        setError('');

        try {
            const scheduledAt = new Date(`${date}T${time}`).toISOString();

            const response = await api.bookSession(token, {
                tutorId: tutor.id,
                skillName: selectedSkill.name,
                skillCategory: selectedSkill.category,
                scheduledAt,
                duration,
                notes: notes || undefined,
                meetingType: 'video',
            });

            setSuccess(true);
            onSuccess?.();

            // Reset form after short delay
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to book session');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedSkill(null);
        setDate('');
        setTime('');
        setDuration(60);
        setNotes('');
        setError('');
        setSuccess(false);
        onClose();
    };

    if (!tutor) return null;

    // Get minimum date (today)
    const today = new Date();
    const minDateStr = today.toISOString().split('T')[0];

    // Check if selected date is today
    const isToday = date === minDateStr;

    // Get minimum time for today (current time + 5 minutes buffer)
    const getMinTimeForToday = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5); // Just 5 minutes from now
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const minTimeStr = isToday ? getMinTimeForToday() : '00:00';

    // Validate that the selected datetime is in the future
    const isValidDateTime = () => {
        if (!date || !time) return true; // Don't show error if not selected yet
        const selectedDateTime = new Date(`${date}T${time}`);
        const now = new Date();
        // Add just 2 minutes buffer for testing
        now.setMinutes(now.getMinutes() + 2);
        return selectedDateTime > now;
    };

    const dateTimeError = date && time && !isValidDateTime()
        ? 'Please select a time at least 2 minutes from now'
        : '';

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Book a Session" size="lg">
            {success ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Session Booked!</h3>
                    <p className="text-gray-400">
                        Your session request has been sent to {tutor.fullName}.
                        They will confirm soon.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    {/* Tutor Info */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-800/50 mb-6">
                        <Avatar
                            src={tutor.avatar}
                            firstName={tutor.firstName}
                            lastName={tutor.lastName}
                            size="lg"
                        />
                        <div>
                            <h4 className="font-semibold text-white">{tutor.fullName}</h4>
                            <p className="text-sm text-gray-400">
                                {tutor.teachingSkills.length} skills available
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
                            {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        {/* Skill Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Select Skill
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {tutor.teachingSkills.map((skill) => (
                                    <button
                                        key={skill._id}
                                        type="button"
                                        onClick={() => setSelectedSkill(skill)}
                                        className={`p-3 rounded-xl border text-left transition-all ${selectedSkill?._id === skill._id
                                            ? 'bg-violet-500/20 border-violet-500 text-white'
                                            : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                                            }`}
                                    >
                                        <p className="font-medium truncate">{skill.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {skill.hourlyRate} credits/hr · {skill.proficiency}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date and Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                type="date"
                                label="Date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                min={minDateStr}
                                required
                            />
                            <Input
                                type="time"
                                label="Time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                min={isToday ? minTimeStr : undefined}
                                required
                            />
                        </div>
                        {dateTimeError && (
                            <p className="text-sm text-amber-400 -mt-2">
                                ⚠️ {dateTimeError}
                            </p>
                        )}
                        {isToday && !dateTimeError && date && (
                            <p className="text-xs text-gray-500 -mt-2">
                                📅 Scheduling for today - earliest available time is {minTimeStr}
                            </p>
                        )}

                        {/* Duration */}
                        <Select
                            label="Duration"
                            value={String(duration)}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            options={SESSION_DURATIONS.map((d) => ({
                                value: String(d.value),
                                label: d.label,
                            }))}
                        />

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="What would you like to learn? Any specific topics?"
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[100px] resize-none"
                            />
                        </div>

                        {/* Cost Summary */}
                        {selectedSkill && (
                            <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-amber-400" />
                                        <span className="text-gray-300">Session Cost</span>
                                    </div>
                                    <span className="text-xl font-bold text-white">
                                        {formatCredits(creditCost)} credits
                                    </span>
                                </div>
                                {!hasEnoughCredits && (
                                    <p className="text-sm text-red-400 mt-2">
                                        Insufficient credits. You need {formatCredits(creditCost - (user?.creditBalance || 0))} more.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={handleClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            isLoading={isLoading}
                            disabled={!selectedSkill || !date || !time || !hasEnoughCredits || !!dateTimeError}
                        >
                            Book Session
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
