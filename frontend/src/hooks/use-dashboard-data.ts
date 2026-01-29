// hooks/use-dashboard-data.ts
/**
 * Custom hook for managing dashboard data with auto-refresh
 * Implements polling strategy with adaptive frequency based on review status
 */

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";

interface DashboardStats {
    totalReviews: number;
    bugsFound: number;
    securityIssues: number;
    performanceWarnings: number;
    totalIssuesFound: number;
    averageScore: number;
    languagesAnalyzed: Record<string, number>;
}

interface Review {
    id: string;
    fileName: string;
    language: string;
    status: "completed" | "processing" | "failed";
    bugs: number;
    security: number;
    performance: number;
    date: string;
    createdAt: string;
    isNew?: boolean;
}

export function useDashboardData() {
    const [stats, setStats] = useState<DashboardStats>({
        totalReviews: 0,
        bugsFound: 0,
        securityIssues: 0,
        performanceWarnings: 0,
        totalIssuesFound: 0,
        averageScore: 0,
        languagesAnalyzed: {},
    });
    const [recentReviews, setRecentReviews] = useState<Review[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isLoadingReviews, setIsLoadingReviews] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [hasActiveReviews, setHasActiveReviews] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Format relative time helper
     */
    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return "Just now";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    /**
     * Fetch dashboard statistics
     */
    const fetchStats = useCallback(async (showToast = false) => {
        try {
            const response = await api.getStats();

            if (response.success && response.data) {
                const data = response.data;

                setStats({
                    totalReviews: data.totalReviews || 0,
                    bugsFound: data.bugsFound || 0,
                    securityIssues: data.securityIssues || 0,
                    performanceWarnings: data.performanceWarnings || 0,
                    totalIssuesFound: data.totalIssuesFound || 0,
                    averageScore: data.averageScore || 0,
                    languagesAnalyzed: data.languagesAnalyzed || {},
                });

                setError(null);
                if (showToast) {
                    toast.success("Dashboard updated");
                }
            } else {
                throw new Error(response.error || "Failed to fetch stats");
            }
        } catch (err: any) {
            console.error("Failed to fetch stats:", err);
            setError(err.message || "Failed to load statistics");
            if (showToast) {
                toast.error("Failed to update dashboard");
            }
        } finally {
            setIsLoadingStats(false);
        }
    }, []);

    /**
     * Fetch recent reviews
     */
    const fetchRecentReviews = useCallback(async () => {
        try {
            const response = await api.getReviewHistory(1, 5);

            if (response.success && response.data) {
                const reviewsData = response.data.reviews || response.data || [];

                const formattedReviews: Review[] = reviewsData.map((review: any) => ({
                    id: review.id || review._id,
                    fileName: review.fileName || "Untitled",
                    language: review.language || "Unknown",
                    status: review.status === "processing" ? "processing" :
                        review.status === "failed" ? "failed" : "completed",
                    bugs: review.bugsCount || 0,
                    security: review.securityCount || 0,
                    performance: review.performanceCount || 0,
                    date: formatRelativeTime(review.createdAt),
                    createdAt: review.createdAt,
                }));

                // Check for processing reviews
                const hasProcessing = formattedReviews.some(r => r.status === "processing");
                setHasActiveReviews(hasProcessing);

                // Mark new reviews
                const now = new Date().getTime();
                formattedReviews.forEach(review => {
                    const reviewTime = new Date(review.createdAt).getTime();
                    review.isNew = (now - reviewTime) < 10000;
                });

                setRecentReviews(formattedReviews);
                setError(null);
            } else {
                throw new Error(response.error || "Failed to fetch reviews");
            }
        } catch (err: any) {
            console.error("Failed to fetch reviews:", err);
            setError(err.message || "Failed to load reviews");
        } finally {
            setIsLoadingReviews(false);
        }
    }, []);

    /**
     * Refresh all dashboard data
     */
    const refreshDashboard = useCallback(async (showToast = false) => {
        setIsRefreshing(true);
        await Promise.all([
            fetchStats(showToast),
            fetchRecentReviews(),
        ]);
        setLastUpdate(new Date());
        setIsRefreshing(false);
    }, [fetchStats, fetchRecentReviews]);

    /**
     * Initial load on mount
     */
    useEffect(() => {
        refreshDashboard();
    }, [refreshDashboard]);

    /**
     * Polling with adaptive frequency
     * 5s when processing reviews exist, 30s otherwise
     */
    useEffect(() => {
        const pollInterval = hasActiveReviews ? 5000 : 30000;

        const interval = setInterval(() => {
            if (document.visibilityState === "visible") {
                refreshDashboard();
            }
        }, pollInterval);

        return () => clearInterval(interval);
    }, [refreshDashboard, hasActiveReviews]);

    /**
     * Refresh on page focus
     */
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                refreshDashboard();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [refreshDashboard]);

    return {
        stats,
        recentReviews,
        isLoadingStats,
        isLoadingReviews,
        isRefreshing,
        lastUpdate,
        hasActiveReviews,
        error,
        refreshDashboard,
    };
}
