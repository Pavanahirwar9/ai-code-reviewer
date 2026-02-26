// contexts/AuthContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    githubUsername?: string;
    avatar?: string;
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password: string) => Promise<boolean>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (error) {
                console.error('Failed to parse user data:', error);
            }
        }

        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const response = await api.login(email, password);

            if (response.success && response.data) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                setUser(response.data.user);
                return true;
            }

            // Email not verified — throw special error so login page can show resend UI
            if (response.data?.emailNotVerified) {
                const err: any = new Error(response.error || 'Please verify your email before logging in.');
                err.emailNotVerified = true;
                err.email = response.data.email;
                throw err;
            }

            if (response.error) {
                throw new Error(response.error);
            }

            return false;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const register = async (name: string, email: string, password: string): Promise<boolean> => {
        try {
            const response = await api.register(name, email, password);

            if (response.success && response.data) {
                // If registration requires email verification, don't log in yet
                if (response.data.needsVerification) {
                    const err: any = new Error('Account created! Please verify your email.');
                    err.needsVerification = true;
                    err.email = response.data.email;
                    throw err;
                }
                // Direct login (e.g. admin or OAuth)
                if (response.data.token) {
                    localStorage.setItem('token', response.data.token);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                    setUser(response.data.user);
                }
                return true;
            }

            if (response.error) {
                throw new Error(response.error);
            }

            return false;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    };

    const logout = () => {
        // Call backend logout endpoint to destroy session
        api.logout().catch(err => {
            console.error('Logout API error:', err);
        });

        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('latestReview');

        // Clear auth state
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const response = await api.getMe();

            if (response.success && response.data) {
                localStorage.setItem('user', JSON.stringify(response.data));
                setUser(response.data);
            }
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
                refreshUser,
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
