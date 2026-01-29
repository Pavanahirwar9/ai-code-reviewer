"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileCode,
  Bug,
  Shield,
  Zap,
  ArrowRight,
  Upload,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Activity,
} from "lucide-react";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return (
        <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20 animate-pulse">
          <Clock className="mr-1 h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return null;
  }
};

// Format relative time helper
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

export default function DashboardPage() {
  const { user } = useAuth();

  // Use custom hook for dashboard data management
  const {
    stats,
    recentReviews,
    isLoadingStats,
    isLoadingReviews,
    isRefreshing,
    lastUpdate,
    hasActiveReviews,
    refreshDashboard,
  } = useDashboardData();

  // Stats configuration for display
  const statsCards = [
    {
      title: "Total Reviews",
      value: stats.totalReviews.toString(),
      description: "All time code reviews",
      icon: FileCode,
      loading: isLoadingStats,
    },
    {
      title: "Bugs Found",
      value: stats.bugsFound.toString(),
      description: "Issues detected",
      icon: Bug,
      loading: isLoadingStats,
    },
    {
      title: "Security Issues",
      value: stats.securityIssues.toString(),
      description: "Vulnerabilities caught",
      icon: Shield,
      loading: isLoadingStats,
    },
    {
      title: "Performance Warnings",
      value: stats.performanceWarnings.toString(),
      description: "Optimization suggestions",
      icon: Zap,
      loading: isLoadingStats,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Live Update Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className={`h-4 w-4 ${hasActiveReviews ? "text-warning animate-pulse" : "text-success"}`} />
          <span>
            {hasActiveReviews ? "Live updates active" : "Auto-refresh enabled"}
          </span>
          <span className="text-xs">
            • Last updated {formatRelativeTime(lastUpdate.toISOString())}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refreshDashboard(true)}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Welcome Card */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <CardHeader className="relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-2xl text-card-foreground">
                  Welcome back, {user?.name || "User"}!
                </CardTitle>
                <CardDescription className="mt-1 text-base">
                  Upload your code to get started with AI-powered analysis.
                </CardDescription>
              </div>
              <Link href="/dashboard/review">
                <Button size="lg" className="gap-2">
                  <Upload className="h-5 w-5" />
                  New Review
                </Button>
              </Link>
            </div>
          </CardHeader>
        </div>
      </Card>

      {/* Stats Grid with Loading States */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                {stat.loading ? (
                  <div className="h-9 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <span className="text-3xl font-bold text-card-foreground transition-all duration-500">
                    {stat.value}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reviews with Loading and Empty States */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl text-card-foreground">Recent Reviews</CardTitle>
            <CardDescription>Your latest code analysis results</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingReviews ? (
            // Loading skeleton
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-10 w-48 bg-muted rounded" />
                  <div className="h-8 w-24 bg-muted rounded" />
                  <div className="h-8 w-32 bg-muted rounded" />
                  <div className="flex-1" />
                  <div className="h-8 w-20 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : recentReviews.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FileCode className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first file to get AI-powered code analysis
              </p>
              <Link href="/dashboard/review">
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Start Your First Review
                </Button>
              </Link>
            </div>
          ) : (
            // Reviews table with smooth transitions
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Bug className="h-4 w-4 text-destructive" />
                        Bugs
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Shield className="h-4 w-4 text-warning" />
                        Security
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="h-4 w-4 text-primary" />
                        Perf
                      </div>
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentReviews.map((review) => (
                    <TableRow
                      key={review.id}
                      className={`transition-colors ${review.isNew ? "bg-primary/5 animate-in fade-in duration-500" : ""
                        }`}
                    >
                      <TableCell className="font-medium text-foreground">
                        {review.fileName}
                        {review.isNew && (
                          <Badge variant="secondary" className="ml-2 text-xs bg-primary/10 text-primary">
                            New
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{review.language}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(review.status)}</TableCell>
                      <TableCell className="text-center">
                        <span className={review.bugs > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                          {review.bugs}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={review.security > 0 ? "text-warning font-medium" : "text-muted-foreground"}>
                          {review.security}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={review.performance > 0 ? "text-primary font-medium" : "text-muted-foreground"}>
                          {review.performance}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{review.date}</TableCell>
                      <TableCell>
                        {review.status === "completed" ? (
                          <Link href={`/dashboard/results/${review.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                              <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                          </Link>
                        ) : review.status === "processing" ? (
                          <Button variant="ghost" size="sm" disabled>
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                            Processing
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" disabled>
                            Failed
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border bg-card group hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/dashboard/review">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg text-card-foreground">Upload Code</CardTitle>
                  <CardDescription>Start a new code review</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="border-border bg-card group hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/dashboard/github">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted group-hover:bg-muted/80 transition-colors">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-lg text-card-foreground">Connect GitHub</CardTitle>
                  <CardDescription>Analyze your repositories</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>


      </div>
    </div>
  );
}
