import { Suspense } from 'react';
import VideoCallClient from './VideoCallClient';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function LoadingFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
    );
}

export default function VideoCallPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <VideoCallClient />
        </Suspense>
    );
}
