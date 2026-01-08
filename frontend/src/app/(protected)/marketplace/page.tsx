'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { TutorList, BookSessionModal } from '@/components/marketplace';
import { Input, Select, Card } from '@/components/ui';
import { Search, SlidersHorizontal, Mic, MicOff, Loader2 } from 'lucide-react';
import { SKILL_CATEGORIES, PROFICIENCY_LEVELS } from '@/types';
import { useSecureRecording } from '@/hooks/useSecureRecording';

export default function MarketplacePage() {
    const router = useRouter();
    const { token, isLoading: authLoading, isAuthenticated } = useAuth();

    const [tutors, setTutors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState('');
    const [sortBy, setSortBy] = useState('rating');

    const [selectedTutor, setSelectedTutor] = useState(null);
    const [isBookingOpen, setIsBookingOpen] = useState(false);

    // Voice search hook
    const {
        startRecording,
        stopRecording,
        isRecording,
        isProcessing,
        transcriptionText,
        error: voiceError
    } = useSecureRecording();

    // Auto-fill search and trigger when transcription completes
    useEffect(() => {
        if (transcriptionText) {
            setSearchTerm(transcriptionText);
            // Auto-trigger search after voice input
            fetchTutors();
        }
    }, [transcriptionText]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        fetchTutors();
    }, [token, category, sortBy]);

    const fetchTutors = async () => {
        setIsLoading(true);
        try {
            const response = await api.searchTutors({
                skill: searchTerm || undefined,
                category: category || undefined,
                sortBy,
                limit: 20,
            }, token);
            setTutors(response.data.tutors);
        } catch (error) {
            console.error('Failed to fetch tutors:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchTutors();
    };

    const handleBook = (tutor: any) => {
        setSelectedTutor(tutor);
        setIsBookingOpen(true);
    };

    const handleVoiceSearch = async () => {
        if (isRecording) {
            stopRecording();
        } else {
            await startRecording();
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Marketplace</h1>
                <p className="text-gray-400 mt-1">
                    Find tutors and book sessions to learn new skills.
                </p>
            </div>

            {/* Search & Filters */}
            <Card className="mb-8">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 flex gap-2">
                        <div className="flex-1">
                            <Input
                                type="text"
                                placeholder="Search skills (e.g., React, Calculus, Spanish...)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                icon={<Search className="w-5 h-5" />}
                            />
                        </div>
                        {/* Voice Search Button */}
                        <button
                            type="button"
                            onClick={handleVoiceSearch}
                            disabled={isProcessing}
                            className={`
                                flex items-center justify-center w-12 h-12 rounded-lg
                                transition-all duration-200 
                                ${isRecording
                                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                                    : isProcessing
                                        ? 'bg-gray-600 cursor-wait'
                                        : 'bg-purple-600 hover:bg-purple-700'
                                }
                            `}
                            title={isRecording ? 'Stop recording' : 'Voice search'}
                        >
                            {isProcessing ? (
                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                            ) : isRecording ? (
                                <MicOff className="w-5 h-5 text-white" />
                            ) : (
                                <Mic className="w-5 h-5 text-white" />
                            )}
                        </button>
                    </div>

                    <div className="flex gap-4">
                        <Select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            options={[
                                { value: '', label: 'All Categories' },
                                ...SKILL_CATEGORIES.map((c) => ({ value: c, label: c })),
                            ]}
                        />

                        <Select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            options={[
                                { value: 'rating', label: 'Top Rated' },
                                { value: 'sessions', label: 'Most Sessions' },
                                { value: 'newest', label: 'Newest' },
                            ]}
                        />
                    </div>
                </form>

                {/* Voice Error Message */}
                {voiceError && (
                    <p className="mt-3 text-sm text-red-400">{voiceError}</p>
                )}

                {/* Recording Indicator */}
                {isRecording && (
                    <p className="mt-3 text-sm text-purple-400 animate-pulse">
                        🎙️ Listening... Click the mic button to stop and search.
                    </p>
                )}

                {/* Processing Indicator */}
                {isProcessing && (
                    <p className="mt-3 text-sm text-gray-400">
                        ⏳ Processing your voice...
                    </p>
                )}
            </Card>

            {/* Results */}
            <TutorList
                tutors={tutors}
                onBook={handleBook}
                isLoading={isLoading}
            />

            {/* Booking Modal */}
            <BookSessionModal
                isOpen={isBookingOpen}
                onClose={() => setIsBookingOpen(false)}
                tutor={selectedTutor}
                onSuccess={fetchTutors}
            />
        </div>
    );
}
