'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { User } from '@/types';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    updateBalance: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem('skillvault_token');
        if (storedToken) {
            setToken(storedToken);
            fetchUser(storedToken);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchUser = async (authToken: string) => {
        try {
            const response = await api.getMe(authToken);
            setUser(response.data.user);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            localStorage.removeItem('skillvault_token');
            setToken(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        const response = await api.login({ email, password });
        const { user: userData, token: authToken } = response.data;

        localStorage.setItem('skillvault_token', authToken);
        setToken(authToken);
        setUser(userData);
    };

    const register = async (data: { email: string; password: string; firstName: string; lastName: string }) => {
        const response = await api.register(data);
        const { user: userData, token: authToken } = response.data;

        localStorage.setItem('skillvault_token', authToken);
        setToken(authToken);
        setUser(userData);
    };

    const logout = useCallback(() => {
        localStorage.removeItem('skillvault_token');
        setToken(null);
        setUser(null);
    }, []);

    const refreshUser = useCallback(async () => {
        if (token) {
            await fetchUser(token);
        }
    }, [token]);

    const updateBalance = useCallback((newBalance: number) => {
        setUser(prev => prev ? { ...prev, creditBalance: newBalance } : null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                isAuthenticated: !!user && !!token,
                login,
                register,
                logout,
                refreshUser,
                updateBalance,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
