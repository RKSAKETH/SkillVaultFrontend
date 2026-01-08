const { Session } = require('../models');
const { SESSION_STATUS } = require('../config/constants');

/**
 * VideoRoomService manages video call rooms with session-scoped authorization.
 * Ensures only booked users can join and handles time-bound calls.
 */
class VideoRoomService {
    constructor() {
        // Map of active rooms: roomId -> { sessionId, participants, startTime, endTime, status }
        this.activeRooms = new Map();
        // Map of socket connections: socketId -> { roomId, userId, role }
        this.connections = new Map();
        // Lock map for preventing race conditions: sessionId -> lockPromise
        this.locks = new Map();
    }

    /**
     * Acquire a lock for a session to prevent race conditions
     */
    async acquireLock(sessionId) {
        const existingLock = this.locks.get(sessionId);
        if (existingLock) {
            await existingLock;
        }

        let releaseLock;
        const lockPromise = new Promise((resolve) => {
            releaseLock = resolve;
        });

        this.locks.set(sessionId, lockPromise);
        return releaseLock;
    }

    /**
     * Generate a unique room ID for a session
     */
    generateRoomId(sessionId) {
        return `room_${sessionId}`;
    }

    /**
     * Validate if a user can join a video call for a session
     * Returns session data if authorized
     */
    async validateAccess(sessionId, userId) {
        const session = await Session.findById(sessionId)
            .populate('tutor', 'firstName lastName avatar')
            .populate('student', 'firstName lastName avatar');

        if (!session) {
            throw new Error('Session not found');
        }

        const isTutor = session.tutor._id.toString() === userId.toString();
        const isStudent = session.student._id.toString() === userId.toString();

        if (!isTutor && !isStudent) {
            throw new Error('You are not authorized to join this call');
        }

        // Check session status - must be confirmed or in_progress
        const validStatuses = [SESSION_STATUS.CONFIRMED, SESSION_STATUS.IN_PROGRESS];
        if (!validStatuses.includes(session.status)) {
            throw new Error(`Session is not available for video call. Status: ${session.status}`);
        }

        // Check time window - allow joining 5 minutes before scheduled time
        const now = new Date();
        const scheduledAt = new Date(session.scheduledAt);
        const sessionEnd = new Date(scheduledAt.getTime() + session.duration * 60000);
        const earlyJoinWindow = new Date(scheduledAt.getTime() - 5 * 60000); // 5 min before

        if (now < earlyJoinWindow) {
            const waitMinutes = Math.ceil((earlyJoinWindow - now) / 60000);
            throw new Error(`Session hasn't started yet. You can join in ${waitMinutes} minutes.`);
        }

        if (now > sessionEnd) {
            throw new Error('Session time has ended');
        }

        return {
            session,
            role: isTutor ? 'tutor' : 'student',
            remainingTime: Math.max(0, sessionEnd - now)
        };
    }

    /**
     * Join or create a video room
     */
    async joinRoom(sessionId, userId, socketId) {
        const releaseLock = await this.acquireLock(sessionId);

        try {
            const { session, role, remainingTime } = await this.validateAccess(sessionId, userId);
            const roomId = this.generateRoomId(sessionId);

            // Check if room exists
            let room = this.activeRooms.get(roomId);

            if (!room) {
                // Create new room
                room = {
                    sessionId: sessionId,
                    roomId: roomId,
                    participants: new Map(),
                    startTime: new Date(),
                    endTime: new Date(new Date(session.scheduledAt).getTime() + session.duration * 60000),
                    status: 'waiting',
                    session: {
                        id: session._id,
                        skill: session.skill,
                        duration: session.duration,
                        tutor: {
                            id: session.tutor._id,
                            name: `${session.tutor.firstName} ${session.tutor.lastName}`,
                            avatar: session.tutor.avatar
                        },
                        student: {
                            id: session.student._id,
                            name: `${session.student.firstName} ${session.student.lastName}`,
                            avatar: session.student.avatar
                        }
                    }
                };
                this.activeRooms.set(roomId, room);

                // Update session status to in_progress if not already
                if (session.status === SESSION_STATUS.CONFIRMED) {
                    await Session.findByIdAndUpdate(sessionId, {
                        status: SESSION_STATUS.IN_PROGRESS,
                        $push: {
                            statusHistory: {
                                status: SESSION_STATUS.IN_PROGRESS,
                                changedAt: new Date(),
                                changedBy: userId,
                                reason: 'Video call started'
                            }
                        }
                    });
                }
            }

            // Add participant to room
            const participant = {
                odId: userId,
                socketId: socketId,
                role: role,
                joinedAt: new Date(),
                videoEnabled: false,
                audioEnabled: false
            };

            room.participants.set(userId, participant);

            // Track connection
            this.connections.set(socketId, {
                roomId: roomId,
                odId: userId,
                role: role
            });

            // Update room status if both participants joined
            if (room.participants.size === 2) {
                room.status = 'active';
            }

            return {
                roomId,
                role,
                remainingTime,
                session: room.session,
                participants: Array.from(room.participants.values()).map(p => ({
                    odId: p.odId,
                    role: p.role,
                    joinedAt: p.joinedAt
                })),
                isInitiator: room.participants.size === 1
            };
        } finally {
            releaseLock();
        }
    }

    /**
     * Leave a video room
     */
    async leaveRoom(socketId) {
        const connection = this.connections.get(socketId);
        if (!connection) return null;

        const { roomId, odId } = connection;
        const room = this.activeRooms.get(roomId);

        if (room) {
            room.participants.delete(odId);

            // If no participants left, clean up room
            if (room.participants.size === 0) {
                this.activeRooms.delete(roomId);
            }
        }

        this.connections.delete(socketId);

        return { roomId, odId };
    }

    /**
     * Get room info
     */
    getRoom(roomId) {
        return this.activeRooms.get(roomId);
    }

    /**
     * Get participant's socket ID by userId in a room
     */
    getParticipantSocket(roomId, odId) {
        const room = this.activeRooms.get(roomId);
        if (!room) return null;

        const participant = room.participants.get(odId);
        return participant?.socketId;
    }

    /**
     * Get all participants in a room except the given socketId
     */
    getOtherParticipants(roomId, excludeSocketId) {
        const room = this.activeRooms.get(roomId);
        if (!room) return [];

        return Array.from(room.participants.values())
            .filter(p => p.socketId !== excludeSocketId)
            .map(p => ({
                odId: p.odId,
                socketId: p.socketId,
                role: p.role
            }));
    }

    /**
     * Update participant media state
     */
    updateMediaState(socketId, videoEnabled, audioEnabled) {
        const connection = this.connections.get(socketId);
        if (!connection) return null;

        const room = this.activeRooms.get(connection.roomId);
        if (!room) return null;

        const participant = room.participants.get(connection.odId);
        if (participant) {
            participant.videoEnabled = videoEnabled;
            participant.audioEnabled = audioEnabled;
        }

        return {
            roomId: connection.roomId,
            odId: connection.odId,
            videoEnabled,
            audioEnabled
        };
    }

    /**
     * Check if a room's time has expired
     */
    isRoomExpired(roomId) {
        const room = this.activeRooms.get(roomId);
        if (!room) return true;

        return new Date() > room.endTime;
    }

    /**
     * Get connection info by socket ID
     */
    getConnection(socketId) {
        return this.connections.get(socketId);
    }
}

// Singleton instance
const videoRoomService = new VideoRoomService();

module.exports = videoRoomService;
