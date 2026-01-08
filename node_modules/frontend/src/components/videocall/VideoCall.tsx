'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useWebRTC } from '@/lib/useWebRTC';
import {
    Video, VideoOff, Mic, MicOff, Phone, PhoneOff,
    Maximize2, Minimize2, MessageSquare, Users, Clock,
    AlertCircle, Loader2
} from 'lucide-react';

interface VideoCallProps {
    sessionId: string;
    token: string;
    onEnd?: () => void;
    onError?: (error: string) => void;
}

interface SessionInfo {
    id: string;
    skill: { name: string; category: string };
    duration: number;
    tutor: { id: string; name: string; avatar?: string };
    student: { id: string; name: string; avatar?: string };
}

type CallState = 'connecting' | 'waiting' | 'active' | 'ended' | 'error';

export default function VideoCall({ sessionId, token, onEnd, onError }: VideoCallProps) {
    const { socket, isConnected, connect, disconnect } = useSocket();

    const [callState, setCallState] = useState<CallState>('connecting');
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [remainingTime, setRemainingTime] = useState<number>(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState<Array<{
        senderId: string;
        message: string;
        timestamp: string;
        isOwn: boolean;
    }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [myRole, setMyRole] = useState<'tutor' | 'student' | null>(null);
    const [isPolite, setIsPolite] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [hasJoined, setHasJoined] = useState(false);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const {
        localStream,
        remoteStream,
        isVideoEnabled,
        isAudioEnabled,
        connectionState,
        error: webrtcError,
        getLocalStream,
        initializeConnection,
        toggleVideo,
        toggleAudio,
        endCall: endWebRTCCall
    } = useWebRTC({
        socket,
        roomId: sessionId,
        isPolite
    });

    // Connect socket on mount - only once
    useEffect(() => {
        if (!isConnected && token) {
            connect(token);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]); // Only depend on token, connect is stable

    // Update call state based on connection state
    useEffect(() => {
        if (connectionState === 'connected') {
            setCallState('active');
        } else if (connectionState === 'failed') {
            if (callState !== 'error') {
                setErrorMessage('Connection failed. Please try again.');
            }
        }
    }, [connectionState, callState]);

    // Join room when socket is connected
    useEffect(() => {
        if (!socket || !isConnected || !sessionId || hasJoined) return;

        const joinRoom = async () => {
            try {
                // Join the socket room first
                socket.emit('join-room', { sessionId }, async (response: any) => {
                    if (response.error) {
                        setErrorMessage(response.error);
                        setCallState('error');
                        onError?.(response.error);
                        return;
                    }

                    console.log('[VideoCall] Joined room:', response);
                    setHasJoined(true);
                    setSessionInfo(response.session);
                    setMyRole(response.role);
                    setRemainingTime(response.remainingTime);

                    // The second person to join is "polite" (yields during collisions)
                    const amIPolite = !response.isInitiator;
                    setIsPolite(amIPolite);
                    console.log('[VideoCall] Am I polite?', amIPolite);

                    // Initialize WebRTC connection
                    try {
                        await initializeConnection();
                    } catch (err) {
                        console.error('[VideoCall] Failed to initialize connection:', err);
                    }

                    if (response.participants?.length > 1) {
                        // Other participant already in room
                        setCallState('active');
                    } else {
                        setCallState('waiting');
                    }
                });
            } catch (err: any) {
                setErrorMessage(err.message || 'Failed to join call');
                setCallState('error');
            }
        };

        joinRoom();
    }, [socket, isConnected, sessionId, hasJoined, initializeConnection, onError]);

    // Handle socket events
    useEffect(() => {
        if (!socket) return;

        const handleUserJoined = async (data: { odId: string; role: string; socketId: string }) => {
            console.log('[VideoCall] User joined:', data);
            setCallState('active');
        };

        const handleSessionEnded = (data: { reason: string }) => {
            console.log('[VideoCall] Session ended:', data.reason);
            setCallState('ended');
        };

        const handleChatMessage = (data: { senderId: string; message: string; timestamp: string }) => {
            setChatMessages(prev => [...prev, { ...data, isOwn: false }]);
        };

        socket.on('user-joined', handleUserJoined);
        socket.on('session-ended', handleSessionEnded);
        socket.on('chat-message', handleChatMessage);
        socket.on('user-left', () => {
            console.log('[VideoCall] User left');
            setCallState('waiting');
        });

        return () => {
            socket.off('user-joined', handleUserJoined);
            socket.off('session-ended', handleSessionEnded);
            socket.off('chat-message', handleChatMessage);
            socket.off('user-left');
        };
    }, [socket]);

    // Update local video element
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Update remote video element
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            console.log('[VideoCall] Setting remote video stream');
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Timer for remaining time
    useEffect(() => {
        if (remainingTime > 0 && callState === 'active') {
            timerRef.current = setInterval(() => {
                setRemainingTime(prev => {
                    if (prev <= 1000) {
                        setCallState('ended');
                        return 0;
                    }
                    return prev - 1000;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [remainingTime, callState]);

    // Handle end call
    const handleEndCall = useCallback(() => {
        endWebRTCCall();
        disconnect();
        setCallState('ended');
        onEnd?.();
    }, [endWebRTCCall, disconnect, onEnd]);

    // Handle fullscreen toggle
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    // Handle send chat message
    const sendChatMessage = useCallback(() => {
        if (!chatInput.trim() || !socket) return;

        socket.emit('chat-message', { message: chatInput });
        setChatMessages(prev => [...prev, {
            senderId: 'me',
            message: chatInput,
            timestamp: new Date().toISOString(),
            isOwn: true
        }]);
        setChatInput('');
    }, [chatInput, socket]);

    // Format time
    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Render based on call state
    if (callState === 'error') {
        return (
            <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center z-50">
                <div className="text-center p-8">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Unable to Join Call</h2>
                    <p className="text-gray-400 mb-6">{errorMessage || webrtcError}</p>
                    <button
                        onClick={onEnd}
                        className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (callState === 'ended') {
        return (
            <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center z-50">
                <div className="text-center p-8">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Phone className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Session Ended</h2>
                    <p className="text-gray-400 mb-6">Your tutoring session has ended.</p>
                    <button
                        onClick={onEnd}
                        className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 bg-[#0a0a0f] z-50 flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-sm border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${callState === 'active' ? 'bg-green-500 animate-pulse' :
                            callState === 'waiting' ? 'bg-yellow-500' :
                                'bg-gray-500'
                            }`} />
                        <span className="text-white font-medium">
                            {sessionInfo?.skill.name || 'Video Call'}
                        </span>
                    </div>
                    {callState === 'waiting' && (
                        <span className="text-gray-400 text-sm">Waiting for {myRole === 'tutor' ? 'student' : 'tutor'} to join...</span>
                    )}
                    {callState === 'active' && connectionState !== 'connected' && (
                        <span className="text-yellow-400 text-sm flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Establishing connection...
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-6">
                    {remainingTime > 0 && (
                        <div className="flex items-center gap-2 text-gray-300">
                            <Clock className="w-4 h-4" />
                            <span className="font-mono">{formatTime(remainingTime)}</span>
                        </div>
                    )}
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        {isFullscreen ? <Minimize2 className="w-5 h-5 text-white" /> : <Maximize2 className="w-5 h-5 text-white" />}
                    </button>
                </div>
            </div>

            {/* Main Video Area */}
            <div className="flex-1 relative">
                {/* Remote Video (Large) */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                    {remoteStream ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-center">
                            {callState === 'waiting' ? (
                                <>
                                    <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-400">Waiting for participant...</p>
                                </>
                            ) : callState === 'connecting' ? (
                                <>
                                    <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-400">Connecting...</p>
                                </>
                            ) : (
                                <>
                                    <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-400">Establishing peer connection...</p>
                                    <p className="text-gray-500 text-sm mt-2">Connection: {connectionState}</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Local Video (PiP) */}
                <div className="absolute bottom-6 right-6 w-64 h-48 bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-white/10">
                    {localStream && (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                        />
                    )}
                    {(!localStream || !isVideoEnabled) && (
                        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                            <VideoOff className="w-8 h-8 text-gray-500" />
                        </div>
                    )}
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white">
                        You ({myRole})
                    </div>
                </div>

                {/* Chat Panel */}
                {showChat && (
                    <div className="absolute top-0 right-0 bottom-0 w-80 bg-black/80 backdrop-blur-sm border-l border-white/10 flex flex-col">
                        <div className="p-4 border-b border-white/10">
                            <h3 className="text-white font-medium">Chat</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] px-3 py-2 rounded-lg ${msg.isOwn ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-100'
                                        }`}>
                                        <p className="text-sm">{msg.message}</p>
                                        <span className="text-xs opacity-60">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-white/10">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                                <button
                                    onClick={sendChatMessage}
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 py-6 bg-black/50 backdrop-blur-sm border-t border-white/10">
                <button
                    onClick={toggleAudio}
                    className={`p-4 rounded-full transition-all ${isAudioEnabled
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                    title={isAudioEnabled ? 'Mute' : 'Unmute'}
                >
                    {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </button>

                <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full transition-all ${isVideoEnabled
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                    title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                    {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </button>

                <button
                    onClick={() => setShowChat(!showChat)}
                    className={`p-4 rounded-full transition-all ${showChat
                        ? 'bg-violet-600 hover:bg-violet-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                    title="Chat"
                >
                    <MessageSquare className="w-6 h-6" />
                </button>

                <button
                    onClick={handleEndCall}
                    className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all"
                    title="End call"
                >
                    <PhoneOff className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}
