'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    connect: (token: string) => void;
    disconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    connect: () => { },
    disconnect: () => { }
});

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const connectingRef = useRef(false);

    const connect = useCallback((token: string) => {
        // Prevent multiple connection attempts
        if (connectingRef.current || socketRef.current?.connected) {
            console.log('[Socket] Already connected or connecting');
            return;
        }

        connectingRef.current = true;
        console.log('[Socket] Initiating connection...');

        const newSocket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected:', newSocket.id);
            setIsConnected(true);
            connectingRef.current = false;
        });

        newSocket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error.message);
            setIsConnected(false);
            connectingRef.current = false;
        });

        socketRef.current = newSocket;
        setSocket(newSocket);
    }, []);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            console.log('[Socket] Disconnecting...');
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
            setIsConnected(false);
            connectingRef.current = false;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected, connect, disconnect }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext);
}
