'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface UseWebRTCOptions {
    socket: Socket | null;
    roomId: string | null;
    isPolite: boolean;
}

// ICE servers configuration
const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
};

export function useWebRTC({ socket, roomId, isPolite }: UseWebRTCOptions) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
    const [error, setError] = useState<string | null>(null);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    const hasCreatedOfferRef = useRef(false);

    // Get user media
    const getLocalStream = useCallback(async () => {
        try {
            console.log('[WebRTC] Getting user media');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    facingMode: 'user',
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            localStreamRef.current = stream;
            setLocalStream(stream);
            setError(null);
            console.log('[WebRTC] Got local stream with', stream.getTracks().length, 'tracks');
            return stream;
        } catch (err: any) {
            console.error('[WebRTC] Error getting user media:', err);
            setError(err.message || 'Failed to access camera/microphone');
            throw err;
        }
    }, []);

    // Create and setup peer connection
    const createPeerConnection = useCallback(() => {
        if (pcRef.current) {
            console.log('[WebRTC] Closing existing peer connection');
            pcRef.current.close();
        }

        console.log('[WebRTC] Creating new peer connection');
        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Handle ICE candidates
        pc.onicecandidate = ({ candidate }) => {
            if (candidate && socket) {
                console.log('[WebRTC] Sending ICE candidate');
                socket.emit('ice-candidate', { candidate: candidate.toJSON() });
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state:', pc.connectionState);
            setConnectionState(pc.connectionState);
        };

        // Handle ICE connection state
        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'failed') {
                console.log('[WebRTC] ICE failed, restarting');
                pc.restartIce();
            }
        };

        // Handle ICE gathering state
        pc.onicegatheringstatechange = () => {
            console.log('[WebRTC] ICE gathering state:', pc.iceGatheringState);
        };

        // Handle remote track
        pc.ontrack = ({ track, streams }) => {
            console.log('[WebRTC] Remote track received:', track.kind, 'streams:', streams.length);
            if (streams[0]) {
                console.log('[WebRTC] Setting remote stream');
                setRemoteStream(streams[0]);
            } else {
                // Create a new MediaStream if no stream is provided
                const newStream = new MediaStream([track]);
                setRemoteStream(prev => {
                    if (prev) {
                        prev.addTrack(track);
                        return prev;
                    }
                    return newStream;
                });
            }
        };

        pcRef.current = pc;
        return pc;
    }, [socket]);

    // Add local tracks to peer connection
    const addTracksToPC = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
        console.log('[WebRTC] Adding', stream.getTracks().length, 'tracks to peer connection');
        stream.getTracks().forEach((track) => {
            console.log('[WebRTC] Adding track:', track.kind);
            pc.addTrack(track, stream);
        });
    }, []);

    // Create and send offer
    const createOffer = useCallback(async () => {
        const pc = pcRef.current;
        if (!pc || !socket) {
            console.log('[WebRTC] Cannot create offer - no PC or socket');
            return;
        }

        if (hasCreatedOfferRef.current) {
            console.log('[WebRTC] Already created an offer');
            return;
        }

        try {
            console.log('[WebRTC] Creating offer');
            hasCreatedOfferRef.current = true;

            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });

            console.log('[WebRTC] Setting local description (offer)');
            await pc.setLocalDescription(offer);

            console.log('[WebRTC] Sending offer via socket');
            socket.emit('offer', { sdp: pc.localDescription });
        } catch (err) {
            console.error('[WebRTC] Error creating offer:', err);
            hasCreatedOfferRef.current = false;
        }
    }, [socket]);

    // Handle incoming offer
    const handleOffer = useCallback(async (data: { sdp: RTCSessionDescriptionInit }) => {
        console.log('[WebRTC] Received offer');

        let pc = pcRef.current;

        // Create PC if it doesn't exist
        if (!pc) {
            console.log('[WebRTC] Creating PC for incoming offer');
            pc = createPeerConnection();

            // Add local tracks if we have them
            if (localStreamRef.current) {
                addTracksToPC(pc, localStreamRef.current);
            }
        }

        try {
            // Set remote description
            console.log('[WebRTC] Setting remote description (offer)');
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

            // Add any pending ICE candidates
            for (const candidate of pendingCandidatesRef.current) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error('[WebRTC] Error adding pending ICE candidate:', e);
                }
            }
            pendingCandidatesRef.current = [];

            // Create answer
            console.log('[WebRTC] Creating answer');
            const answer = await pc.createAnswer();

            console.log('[WebRTC] Setting local description (answer)');
            await pc.setLocalDescription(answer);

            console.log('[WebRTC] Sending answer via socket');
            socket?.emit('answer', { sdp: pc.localDescription });
        } catch (err) {
            console.error('[WebRTC] Error handling offer:', err);
        }
    }, [socket, createPeerConnection, addTracksToPC]);

    // Handle incoming answer
    const handleAnswer = useCallback(async (data: { sdp: RTCSessionDescriptionInit }) => {
        console.log('[WebRTC] Received answer');

        const pc = pcRef.current;
        if (!pc) {
            console.error('[WebRTC] No peer connection for answer');
            return;
        }

        try {
            console.log('[WebRTC] Setting remote description (answer)');
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

            // Add any pending ICE candidates
            for (const candidate of pendingCandidatesRef.current) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error('[WebRTC] Error adding pending ICE candidate:', e);
                }
            }
            pendingCandidatesRef.current = [];

            console.log('[WebRTC] Answer handled successfully');
        } catch (err) {
            console.error('[WebRTC] Error handling answer:', err);
        }
    }, []);

    // Handle ICE candidate
    const handleIceCandidate = useCallback(async (data: { candidate: RTCIceCandidateInit }) => {
        const pc = pcRef.current;

        if (!pc || !pc.remoteDescription) {
            console.log('[WebRTC] Queuing ICE candidate - no remote description yet');
            pendingCandidatesRef.current.push(data.candidate);
            return;
        }

        try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log('[WebRTC] Added ICE candidate');
        } catch (err) {
            console.error('[WebRTC] Error adding ICE candidate:', err);
        }
    }, []);

    // Initialize connection (called by VideoCall component)
    const initializeConnection = useCallback(async () => {
        console.log('[WebRTC] Initializing connection, isPolite:', isPolite);

        try {
            // Get local stream if we don't have it
            const stream = localStreamRef.current || await getLocalStream();

            // Create peer connection
            const pc = createPeerConnection();

            // Add local tracks
            addTracksToPC(pc, stream);

            // If we're the initiator (impolite/first to join), create an offer
            // after a short delay to let the other peer join
            if (!isPolite) {
                console.log('[WebRTC] We are initiator, will create offer');
                // Don't create offer immediately - wait for user-joined event
            } else {
                console.log('[WebRTC] We are responder, waiting for offer');
            }

            return pc;
        } catch (err: any) {
            console.error('[WebRTC] Error initializing connection:', err);
            setError(err.message);
            throw err;
        }
    }, [getLocalStream, createPeerConnection, addTracksToPC, isPolite]);

    // Start call (create offer) - called when we know another user is in the room
    const startCall = useCallback(() => {
        console.log('[WebRTC] Starting call - creating offer');
        createOffer();
    }, [createOffer]);

    // Toggle video
    const toggleVideo = useCallback(() => {
        const stream = localStreamRef.current;
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);

                socket?.emit('media-state-change', {
                    videoEnabled: videoTrack.enabled,
                    audioEnabled: isAudioEnabled,
                });
            }
        }
    }, [socket, isAudioEnabled]);

    // Toggle audio
    const toggleAudio = useCallback(() => {
        const stream = localStreamRef.current;
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);

                socket?.emit('media-state-change', {
                    videoEnabled: isVideoEnabled,
                    audioEnabled: audioTrack.enabled,
                });
            }
        }
    }, [socket, isVideoEnabled]);

    // End call
    const endCall = useCallback(() => {
        console.log('[WebRTC] Ending call');

        // Stop local stream tracks
        localStreamRef.current?.getTracks().forEach((track) => {
            track.stop();
        });

        // Close peer connection
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }

        // Leave socket room
        socket?.emit('leave-room');

        localStreamRef.current = null;
        setLocalStream(null);
        setRemoteStream(null);
        setConnectionState('closed');
        hasCreatedOfferRef.current = false;
        pendingCandidatesRef.current = [];
    }, [socket]);

    // Set up socket listeners
    useEffect(() => {
        if (!socket) return;

        console.log('[WebRTC] Setting up socket listeners');

        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', handleIceCandidate);

        socket.on('user-joined', (data: any) => {
            console.log('[WebRTC] User joined event received:', data);
            // If we're the initiator (not polite), create an offer when another user joins
            if (!isPolite && pcRef.current) {
                console.log('[WebRTC] Creating offer for newly joined user');
                setTimeout(() => createOffer(), 500); // Small delay to ensure other peer is ready
            }
        });

        socket.on('user-left', () => {
            console.log('[WebRTC] Remote user left');
            setRemoteStream(null);
        });

        return () => {
            console.log('[WebRTC] Cleaning up socket listeners');
            socket.off('offer', handleOffer);
            socket.off('answer', handleAnswer);
            socket.off('ice-candidate', handleIceCandidate);
            socket.off('user-joined');
            socket.off('user-left');
        };
    }, [socket, handleOffer, handleAnswer, handleIceCandidate, isPolite, createOffer]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log('[WebRTC] Component unmounting, cleaning up');
            localStreamRef.current?.getTracks().forEach(track => track.stop());
            pcRef.current?.close();
        };
    }, []);

    return {
        localStream,
        remoteStream,
        isVideoEnabled,
        isAudioEnabled,
        connectionState,
        error,
        getLocalStream,
        initializeConnection,
        startCall,
        toggleVideo,
        toggleAudio,
        endCall,
    };
}
