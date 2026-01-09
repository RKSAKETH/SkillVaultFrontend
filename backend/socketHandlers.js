const jwt = require('jsonwebtoken');
const videoRoomService = require('./services/VideoRoomService');

/**
 * Simple rate limiter for socket events to prevent DoS attacks
 */
class SocketRateLimiter {
    constructor(maxEvents = 50, windowMs = 1000) {
        this.maxEvents = maxEvents;
        this.windowMs = windowMs;
        this.events = new Map(); // socketId -> [timestamps]
    }

    isAllowed(socketId) {
        const now = Date.now();
        const userEvents = this.events.get(socketId) || [];
        
        // Remove old events outside the time window
        const recentEvents = userEvents.filter(timestamp => now - timestamp < this.windowMs);
        
        if (recentEvents.length >= this.maxEvents) {
            return false; // Rate limit exceeded
        }
        
        recentEvents.push(now);
        this.events.set(socketId, recentEvents);
        return true;
    }

    cleanup(socketId) {
        this.events.delete(socketId);
    }
}

/**
 * Input validation utilities
 */
const validation = {
    isValidSDP(sdp) {
        if (!sdp || typeof sdp !== 'string') return false;
        if (sdp.length > 50000) return false; // Max 50KB
        return sdp.includes('v=0') && sdp.includes('o='); // Basic SDP format
    },
    
    isValidCandidate(candidate) {
        if (!candidate || typeof candidate !== 'object') return false;
        const json = JSON.stringify(candidate);
        if (json.length > 5000) return false; // Max 5KB
        return true;
    },
    
    isValidMessage(message) {
        if (!message || typeof message !== 'string') return false;
        if (message.length > 5000) return false; // Max 5KB
        return true;
    },
    
    isValidSessionId(sessionId) {
        if (!sessionId || typeof sessionId !== 'string') return false;
        // MongoDB ObjectId format (24 hex chars) or UUID
        return /^[a-f0-9]{24}$/i.test(sessionId) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
    }
};

/**
 * Socket.IO handler for WebRTC signaling
 * Uses Perfect Negotiation pattern - broadcasts to room instead of targeted sends
 */
function initializeSocketHandlers(io) {
    // Create rate limiters for different event types
    const signalingLimiter = new SocketRateLimiter(50, 1000); // 50 events per second for signaling
    const messageLimiter = new SocketRateLimiter(10, 1000); // 10 messages per second for chat
    // Middleware for authentication
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
            socket.userId = decoded.id;
            socket.userEmail = decoded.email;
            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] User connected: ${socket.userId}, Socket: ${socket.id}`);

        /**
         * Join a video room
         * Validates session access and sets up the room
         */
        socket.on('join-room', async (data, callback) => {
            try {
                const { sessionId } = data;

                // Input validation
                if (!sessionId) {
                    return callback({ error: 'Session ID is required' });
                }

                if (!validation.isValidSessionId(sessionId)) {
                    return callback({ error: 'Invalid session ID format' });
                }

                // Clean up previous room if exists
                if (socket.roomId) {
                    // Clear old timer
                    if (socket.roomEndTimer) {
                        clearTimeout(socket.roomEndTimer);
                        socket.roomEndTimer = null;
                    }
                    
                    // Leave old room
                    socket.leave(socket.roomId);
                    
                    // Notify old room participants
                    socket.to(socket.roomId).emit('user-left', {
                        userId: socket.userId,
                        socketId: socket.id
                    });
                    
                    console.log(`[Socket] User ${socket.userId} left previous room ${socket.roomId}`);
                }

                const result = await videoRoomService.joinRoom(
                    sessionId,
                    socket.userId,
                    socket.id
                );

                // Store room ID on socket for easy access
                socket.roomId = result.roomId;

                // Join the socket room
                socket.join(result.roomId);

                // Notify other participants
                socket.to(result.roomId).emit('user-joined', {
                    userId: socket.userId,
                    role: result.role,
                    socketId: socket.id
                });

                // Set up auto-end timer
                if (result.remainingTime > 0) {
                    socket.roomEndTimer = setTimeout(() => {
                        io.to(result.roomId).emit('session-ended', {
                            reason: 'Session time completed'
                        });
                        socket.roomEndTimer = null;
                    }, result.remainingTime);
                }

                callback({
                    success: true,
                    ...result
                });

                console.log(`[Socket] User ${socket.userId} joined room ${result.roomId}, isInitiator: ${result.isInitiator}`);
            } catch (error) {
                console.error('[Socket] Join room error:', error.message);
                callback({ error: error.message });
            }
        });

        /**
         * WebRTC Signaling: Broadcast SDP offer to other peers in the room
         * Using Perfect Negotiation - no targeted sends
         */
        socket.on('offer', (data) => {
            // Rate limiting
            if (!signalingLimiter.isAllowed(socket.id)) {
                console.warn(`[Socket] Rate limit exceeded for offer from ${socket.id}`);
                return;
            }

            const { sdp } = data;
            const roomId = socket.roomId;

            if (!roomId) {
                console.log(`[Socket] No roomId for offer from ${socket.id}`);
                return;
            }

            // Input validation
            if (!validation.isValidSDP(sdp)) {
                console.warn(`[Socket] Invalid SDP in offer from ${socket.id}`);
                return;
            }

            console.log(`[Socket] Broadcasting offer from ${socket.id} to room ${roomId}`);

            // Broadcast to all others in the room
            socket.to(roomId).emit('offer', {
                sdp,
                senderSocketId: socket.id,
                senderId: socket.userId
            });
        });

        /**
         * WebRTC Signaling: Broadcast SDP answer to other peers in the room
         */
        socket.on('answer', (data) => {
            // Rate limiting
            if (!signalingLimiter.isAllowed(socket.id)) {
                console.warn(`[Socket] Rate limit exceeded for answer from ${socket.id}`);
                return;
            }

            const { sdp } = data;
            const roomId = socket.roomId;

            if (!roomId) {
                console.log(`[Socket] No roomId for answer from ${socket.id}`);
                return;
            }

            // Input validation
            if (!validation.isValidSDP(sdp)) {
                console.warn(`[Socket] Invalid SDP in answer from ${socket.id}`);
                return;
            }

            console.log(`[Socket] Broadcasting answer from ${socket.id} to room ${roomId}`);

            // Broadcast to all others in the room
            socket.to(roomId).emit('answer', {
                sdp,
                senderSocketId: socket.id,
                senderId: socket.userId
            });
        });

        /**
         * WebRTC Signaling: Broadcast ICE candidates to other peers
         */
        socket.on('ice-candidate', (data) => {
            // Rate limiting
            if (!signalingLimiter.isAllowed(socket.id)) {
                return; // Silently drop to avoid log spam
            }

            const { candidate } = data;
            const roomId = socket.roomId;

            if (!roomId) {
                return;
            }

            // Input validation
            if (!validation.isValidCandidate(candidate)) {
                console.warn(`[Socket] Invalid ICE candidate from ${socket.id}`);
                return;
            }

            // Broadcast to all others in the room
            socket.to(roomId).emit('ice-candidate', {
                candidate,
                senderSocketId: socket.id,
                senderId: socket.userId
            });
        });

        /**
         * Media state changes (mute/unmute)
         */
        socket.on('media-state-change', (data) => {
            const { videoEnabled, audioEnabled } = data;
            const roomId = socket.roomId;

            if (roomId) {
                videoRoomService.updateMediaState(socket.id, videoEnabled, audioEnabled);

                socket.to(roomId).emit('participant-media-change', {
                    odId: socket.userId,
                    videoEnabled,
                    audioEnabled
                });
            }
        });

        /**
         * Chat message within the call
         */
        socket.on('chat-message', (data) => {
            // Rate limiting
            if (!messageLimiter.isAllowed(socket.id)) {
                console.warn(`[Socket] Rate limit exceeded for chat from ${socket.id}`);
                socket.emit('error', { message: 'You are sending messages too quickly. Please slow down.' });
                return;
            }

            const roomId = socket.roomId;

            if (!roomId) {
                return;
            }

            // Input validation
            if (!validation.isValidMessage(data.message)) {
                console.warn(`[Socket] Invalid message from ${socket.id}`);
                socket.emit('error', { message: 'Invalid message format or too large.' });
                return;
            }

            socket.to(roomId).emit('chat-message', {
                senderId: socket.userId,
                message: data.message,
                timestamp: new Date().toISOString()
            });
        });

        /**
         * Request to get current participants in the room
         */
        socket.on('get-participants', (callback) => {
            const connection = videoRoomService.getConnection(socket.id);

            if (!connection) {
                return callback({ error: 'Not in a room' });
            }

            const others = videoRoomService.getOtherParticipants(
                connection.roomId,
                socket.id
            );

            callback({ success: true, participants: others });
        });

        /**
         * Handle disconnect
         */
        socket.on('disconnect', async () => {
            console.log(`[Socket] User disconnected: ${socket.userId}, Socket: ${socket.id}`);

            // Clear any timers
            if (socket.roomEndTimer) {
                clearTimeout(socket.roomEndTimer);
                socket.roomEndTimer = null;
            }

            // Clean up rate limiters
            signalingLimiter.cleanup(socket.id);
            messageLimiter.cleanup(socket.id);

            const roomId = socket.roomId;

            if (roomId) {
                // Leave the room
                const result = await videoRoomService.leaveRoom(socket.id);

                if (result) {
                    // Notify other participants in the correct room
                    socket.to(roomId).emit('user-left', {
                        userId: result.userId,
                        socketId: socket.id
                    });
                }
                
                // Clean up socket state
                socket.roomId = null;
            }
        });

        /**
         * Explicit leave room request
         */
        socket.on('leave-room', async (callback) => {
            // Clear any timers
            if (socket.roomEndTimer) {
                clearTimeout(socket.roomEndTimer);
                socket.roomEndTimer = null;
            }

            const roomId = socket.roomId;
            
            if (roomId) {
                const result = await videoRoomService.leaveRoom(socket.id);

                if (result) {
                    socket.leave(roomId);
                    socket.to(roomId).emit('user-left', {
                        userId: result.userId,
                        socketId: socket.id
                    });
                }

                socket.roomId = null;
            }
            
            if (callback) callback({ success: true });
        });
    });

    // Periodic cleanup of expired rooms
    setInterval(() => {
        const now = new Date();
        for (const [roomId, room] of videoRoomService.activeRooms) {
            if (now > room.endTime) {
                io.to(roomId).emit('session-ended', {
                    reason: 'Session time completed'
                });

                // Give clients time to handle the event before cleanup
                setTimeout(() => {
                    videoRoomService.activeRooms.delete(roomId);
                }, 5000);
            }
        }
    }, 30000); // Check every 30 seconds

    console.log('[Socket.IO] Handlers initialized');
}

module.exports = { initializeSocketHandlers };
