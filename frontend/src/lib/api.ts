// lib/api.ts
/**
 * API client for backend communication
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ai-code-reviewer-backend-wbf1.onrender.com';

interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

class ApiClient {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    private getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    }

    private getHeaders(includeAuth = false, skipContentType = false): HeadersInit {
        const headers: HeadersInit = {};

        if (!skipContentType) {
            headers['Content-Type'] = 'application/json';
        }

        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    async request<T = any>(
        endpoint: string,
        options: RequestInit = {},
        includeAuth = false,
        skipContentType = false
    ): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers: {
                    ...this.getHeaders(includeAuth, skipContentType),
                    ...options.headers,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'An error occurred');
            }

            return data;
        } catch (error: any) {
            console.error('API Error:', error);
            return {
                success: false,
                error: error.message || 'Network error occurred',
            };
        }
    }

    // Auth endpoints
    async register(name: string, email: string, password: string) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
        });
    }

    async login(email: string, password: string) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    async logout() {
        return this.request('/auth/logout', {
            method: 'POST',
        }, true);
    }

    async getMe() {
        return this.request('/auth/me', {
            method: 'GET',
        }, true);
    }

    async updateProfile(data: { name?: string; email?: string }) {
        return this.request('/auth/update', {
            method: 'PUT',
            body: JSON.stringify(data),
        }, true);
    }

    async uploadAvatar(file: File) {
        const formData = new FormData();
        formData.append('avatar', file);

        return this.request('/user/avatar', {
            method: 'POST',
            body: formData,
            headers: {
                // Let browser set Content-Type with boundary for multipart/form-data
            },
        }, true, true); // skipContentType = true
    }

    async deleteAvatar() {
        return this.request('/user/avatar', {
            method: 'DELETE',
        }, true);
    }

    async updatePassword(currentPassword: string, newPassword: string) {
        return this.request('/auth/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword }),
        }, true);
    }

    // Code Review endpoints (public - no auth required for testing)
    async analyzeCode(code: string, language: string, fileName?: string) {
        return this.request('/public/review/analyze', {
            method: 'POST',
            body: JSON.stringify({ code, language, fileName }),
        });
    }

    // Code Review endpoints (authenticated)
    async analyzeCodeAuth(code: string, language: string, fileName?: string) {
        return this.request('/review/text', {
            method: 'POST',
            body: JSON.stringify({ code, language, fileName }),
        }, true);
    }

    async getReviewHistory(page = 1, limit = 10) {
        return this.request(`/review/history?page=${page}&limit=${limit}`, {
            method: 'GET',
        }, true);
    }

    async getReview(id: string) {
        return this.request(`/review/${id}`, {
            method: 'GET',
        }, true);
    }

    async deleteReview(id: string) {
        return this.request(`/review/${id}`, {
            method: 'DELETE',
        }, true);
    }

    async getStats() {
        return this.request('/review/stats', {
            method: 'GET',
        }, true);
    }

    // GitHub endpoints
    async connectGitHub() {
        return this.request('/github/auth', {
            method: 'GET',
        }, true);
    }

    async getGitHubRepos() {
        return this.request('/github/repos', {
            method: 'GET',
        }, true);
    }

    async getGitHubRepoBranches(owner: string, repo: string) {
        return this.request(`/github/repos/${owner}/${repo}/branches`, {
            method: 'GET',
        }, true);
    }

    async analyzeGitHubRepo(owner: string, repo: string, branch: string) {
        return this.request('/github/analyze', {
            method: 'POST',
            body: JSON.stringify({ owner, repo, branch }),
        }, true);
    }

    async disconnectGitHub() {
        return this.request('/github/disconnect', {
            method: 'POST',
        }, true);
    }

    async getGitHubStatus() {
        return this.request('/github/status', {
            method: 'GET',
        }, true);
    }

    async getGitHubScans(page = 1, limit = 10) {
        return this.request(`/github/scans?page=${page}&limit=${limit}`, {
            method: 'GET',
        }, true);
    }

    async getGitHubScan(scanId: string) {
        return this.request(`/github/scan/${scanId}`, {
            method: 'GET',
        }, true);
    }
}

export const api = new ApiClient(API_URL);
export default api;
