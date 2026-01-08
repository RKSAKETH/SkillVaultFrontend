const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface FetchOptions extends RequestInit {
    token?: string | null;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: FetchOptions = {}
    ): Promise<T> {
        const { token, ...fetchOptions } = options;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
        };

        if (token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...fetchOptions,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'An error occurred');
        }

        return data;
    }

    // Auth endpoints
    async register(userData: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }) {
        return this.request<{ success: boolean; data: { user: any; token: string } }>(
            '/auth/register',
            {
                method: 'POST',
                body: JSON.stringify(userData),
            }
        );
    }

    async login(credentials: { email: string; password: string }) {
        return this.request<{ success: boolean; data: { user: any; token: string } }>(
            '/auth/login',
            {
                method: 'POST',
                body: JSON.stringify(credentials),
            }
        );
    }

    async getMe(token: string) {
        return this.request<{ success: boolean; data: { user: any } }>('/auth/me', {
            token,
        });
    }

    async updateProfile(token: string, updates: any) {
        return this.request<{ success: boolean; data: { user: any } }>('/auth/me', {
            method: 'PUT',
            body: JSON.stringify(updates),
            token,
        });
    }

    // User/Marketplace endpoints
    async searchTutors(params: {
        skill?: string;
        category?: string;
        proficiency?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
    }, token?: string | null) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                searchParams.append(key, String(value));
            }
        });

        return this.request<{
            success: boolean;
            data: {
                tutors: any[];
                pagination: { page: number; limit: number; total: number; pages: number };
            };
        }>(`/users/search?${searchParams.toString()}`, { token });
    }

    async getUserProfile(userId: string) {
        return this.request<{ success: boolean; data: { user: any } }>(
            `/users/${userId}`
        );
    }

    async getSkillOptions() {
        return this.request<{
            success: boolean;
            data: { categories: string[]; proficiencyLevels: string[] };
        }>('/users/skills/options');
    }

    async addTeachingSkill(token: string, skill: any) {
        return this.request<{ success: boolean; data: { teachingSkills: any[] } }>(
            '/users/skills/teaching',
            {
                method: 'POST',
                body: JSON.stringify(skill),
                token,
            }
        );
    }

    async removeTeachingSkill(token: string, skillId: string) {
        return this.request<{ success: boolean }>(`/users/skills/teaching/${skillId}`, {
            method: 'DELETE',
            token,
        });
    }

    async addLearningInterest(token: string, interest: { name: string; category: string }) {
        return this.request<{ success: boolean; data: { learningInterests: any[] } }>(
            '/users/skills/learning',
            {
                method: 'POST',
                body: JSON.stringify(interest),
                token,
            }
        );
    }

    // Session endpoints
    async bookSession(token: string, sessionData: any) {
        return this.request<{ success: boolean; data: { session: any; creditCost: number } }>(
            '/sessions',
            {
                method: 'POST',
                body: JSON.stringify(sessionData),
                token,
            }
        );
    }

    async getMySessions(token: string, params: {
        role?: string;
        status?: string;
        page?: number;
        limit?: number;
        upcoming?: boolean;
    } = {}) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                searchParams.append(key, String(value));
            }
        });

        return this.request<{
            success: boolean;
            data: {
                sessions: any[];
                pagination: { page: number; limit: number; total: number; pages: number };
            };
        }>(`/sessions?${searchParams.toString()}`, { token });
    }

    async getSession(token: string, sessionId: string) {
        return this.request<{ success: boolean; data: { session: any } }>(
            `/sessions/${sessionId}`,
            { token }
        );
    }

    async confirmSession(token: string, sessionId: string) {
        return this.request<{ success: boolean; data: { session: any } }>(
            `/sessions/${sessionId}/confirm`,
            { method: 'PUT', token }
        );
    }

    async completeSession(token: string, sessionId: string) {
        return this.request<{ success: boolean; data: { session: any; creditsTransferred: number } }>(
            `/sessions/${sessionId}/complete`,
            { method: 'PUT', token }
        );
    }

    async cancelSession(token: string, sessionId: string, reason?: string) {
        return this.request<{ success: boolean; data: { session: any } }>(
            `/sessions/${sessionId}/cancel`,
            {
                method: 'PUT',
                body: JSON.stringify({ reason }),
                token,
            }
        );
    }

    async addReview(token: string, sessionId: string, rating: number, comment?: string) {
        return this.request<{ success: boolean; data: { session: any } }>(
            `/sessions/${sessionId}/review`,
            {
                method: 'POST',
                body: JSON.stringify({ rating, comment }),
                token,
            }
        );
    }

    // Wallet endpoints
    async getWallet(token: string) {
        return this.request<{ success: boolean; data: { wallet: any } }>('/wallet', {
            token,
        });
    }

    async getTransactions(token: string, params: {
        page?: number;
        limit?: number;
        type?: string;
        startDate?: string;
        endDate?: string;
    } = {}) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                searchParams.append(key, String(value));
            }
        });

        return this.request<{
            success: boolean;
            data: {
                transactions: any[];
                pagination: { page: number; limit: number; total: number; pages: number };
            };
        }>(`/wallet/transactions?${searchParams.toString()}`, { token });
    }
}

export const api = new ApiClient(API_URL);
