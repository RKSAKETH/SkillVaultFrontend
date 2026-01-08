'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { VideoCall } from '@/components/videocall';
import { Loader2, AlertCircle } from 'lucide-react';

export default function VideoCallClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { token, isAuthenticated, isLoading: authLoading } = useAuth();

    const sessionId = searchParams.get('sessionId');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (!sessionId) {
            setError('No session ID provided');
        }
    }, [sessionId]);

    const handleCallEnd = () => {
        router.push('/sessions');
    };

    const handleCallError = (errorMsg: string) => {
        setError(errorMsg);
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    if (error || !sessionId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <div className="text-center p-8">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Cannot Join Call</h2>
                    <p className="text-gray-400 mb-6">{error || 'Session ID is required'}</p>
                    <button
                        onClick={() => router.push('/sessions')}
                        className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                    >
                        Go to Sessions
                    </button>
                </div>
            </div>
        );
    }

    if (!token) {
        return null;
    }

    return (
        <VideoCall
            sessionId={sessionId}
            token={token}
            onEnd={handleCallEnd}
            onError={handleCallError}
        />
    );
}
