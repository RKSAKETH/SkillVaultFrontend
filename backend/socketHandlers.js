const jwt = require('jsonwebtoken');
const videoRoomService = require('./services/VideoRoomService');

/**
 * Socket.IO handler for WebRTC signaling
 * Uses Perfect Negotiation pattern - broadcasts to room instead of targeted sends
 */
function initializeSocketHandlers(io) {
    // Middleware for authentication
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

                if (!sessionId) {
                    return callback({ error: 'Session ID required' });
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
                    odId: socket.userId,
                    role: result.role,
                    socketId: socket.id
                });

                // Set up auto-end timer
                if (result.remainingTime > 0) {
                    socket.roomEndTimer = setTimeout(() => {
                        io.to(result.roomId).emit('session-ended', {
                            reason: 'Session time completed'
                        });
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
            const { sdp } = data;
            const roomId = socket.roomId;

            if (!roomId) {
                console.log(`[Socket] No roomId for offer from ${socket.id}`);
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
            const { sdp } = data;
            const roomId = socket.roomId;

            if (!roomId) {
                console.log(`[Socket] No roomId for answer from ${socket.id}`);
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
            const { candidate } = data;
            const roomId = socket.roomId;

            if (!roomId) {
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
            const roomId = socket.roomId;

            if (roomId) {
                socket.to(roomId).emit('chat-message', {
                    senderId: socket.userId,
                    message: data.message,
                    timestamp: new Date().toISOString()
                });
            }
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
            }

            const roomId = socket.roomId;

            // Leave the room
            const result = await videoRoomService.leaveRoom(socket.id);

            if (result && roomId) {
                // Notify other participants
                socket.to(roomId).emit('user-left', {
                    odId: result.odId,
                    socketId: socket.id
                });
            }
        });

        /**
         * Explicit leave room request
         */
        socket.on('leave-room', async (callback) => {
            // Clear any timers
            if (socket.roomEndTimer) {
                clearTimeout(socket.roomEndTimer);
            }

            const roomId = socket.roomId;
            const result = await videoRoomService.leaveRoom(socket.id);

            if (result && roomId) {
                socket.leave(roomId);
                socket.to(roomId).emit('user-left', {
                    odId: result.odId,
                    socketId: socket.id
                });
            }

            socket.roomId = null;
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
