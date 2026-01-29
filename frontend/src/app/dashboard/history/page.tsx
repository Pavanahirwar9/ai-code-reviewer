"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  FileCode,
  Bug,
  Shield,
  Zap,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Download,
} from "lucide-react";
import { toast } from "sonner";

const allReviews = [
  {
    id: "1",
    fileName: "auth-service.ts",
    language: "TypeScript",
    status: "completed",
    bugs: 2,
    security: 1,
    performance: 3,
    score: 72,
    date: "2 hours ago",
  },
  {
    id: "2",
    fileName: "api-handler.py",
    language: "Python",
    status: "completed",
    bugs: 0,
    security: 0,
    performance: 1,
    score: 95,
    date: "5 hours ago",
  },
  {
    id: "3",
    fileName: "database-utils.js",
    language: "JavaScript",
    status: "in-progress",
    bugs: 5,
    security: 2,
    performance: 4,
    score: 45,
    date: "1 day ago",
  },
  {
    id: "4",
    fileName: "payment-processor.java",
    language: "Java",
    status: "completed",
    bugs: 1,
    security: 0,
    performance: 2,
    score: 85,
    date: "2 days ago",
  },
  {
    id: "5",
    fileName: "user-controller.go",
    language: "Go",
    status: "failed",
    bugs: 0,
    security: 0,
    performance: 0,
    score: 0,
    date: "3 days ago",
  },
  {
    id: "6",
    fileName: "data-migration.sql",
    language: "SQL",
    status: "completed",
    bugs: 0,
    security: 3,
    performance: 0,
    score: 68,
    date: "4 days ago",
  },
  {
    id: "7",
    fileName: "config-loader.rs",
    language: "Rust",
    status: "completed",
    bugs: 0,
    security: 0,
    performance: 0,
    score: 100,
    date: "5 days ago",
  },
  {
    id: "8",
    fileName: "email-sender.php",
    language: "PHP",
    status: "completed",
    bugs: 3,
    security: 2,
    performance: 1,
    score: 58,
    date: "1 week ago",
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return (
        <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case "in-progress":
      return (
        <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
          <Clock className="mr-1 h-3 w-3" />
          In Progress
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

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
};

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, bugs: 0, security: 0, avgScore: 0 });

  // Fetch reviews from API
  const fetchReviews = async () => {
    try {
      const response = await api.getReviewHistory(1, 100); // Get up to 100 reviews
      if (response.success && response.data) {
        const reviewsData = response.data.reviews.map((review: any) => ({
          id: review.id,
          fileName: review.fileName,
          language: review.language,
          status: review.status,
          bugs: review.bugsCount || 0,
          security: review.securityCount || 0,
          performance: review.performanceCount || 0,
          score: review.overallScore || 0,
          date: new Date(review.createdAt).toLocaleString(),
          createdAt: review.createdAt,
        }));
        setReviews(reviewsData);

        // Calculate stats
        const totalBugs = reviewsData.reduce((sum: number, r: any) => sum + r.bugs, 0);
        const totalSecurity = reviewsData.reduce((sum: number, r: any) => sum + r.security, 0);
        const avgScore = reviewsData.length > 0
          ? Math.round(reviewsData.reduce((sum: number, r: any) => sum + r.score, 0) / reviewsData.length)
          : 0;

        setStats({
          total: reviewsData.length,
          bugs: totalBugs,
          security: totalSecurity,
          avgScore: avgScore,
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchReviews();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReviews();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch = review.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || review.status === statusFilter;
    const matchesLanguage = languageFilter === "all" || review.language === languageFilter;
    return matchesSearch && matchesStatus && matchesLanguage;
  });

  const languages = [...new Set(reviews.map((r) => r.language))];

  const handleExportHistory = () => {
    toast.success("History exported successfully!");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Review History</h1>
          <p className="mt-2 text-muted-foreground">
            View and manage all your past code reviews.
          </p>
        </div>
        <Button onClick={handleExportHistory} variant="outline" className="gap-2 bg-transparent">
          <Download className="h-4 w-4" />
          Export History
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileCode className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{loading ? "..." : stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <Bug className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {loading ? "..." : stats.bugs}
                </p>
                <p className="text-sm text-muted-foreground">Bugs Found</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Shield className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {loading ? "..." : stats.security}
                </p>
                <p className="text-sm text-muted-foreground">Security Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {loading ? "..." : stats.avgScore}
                </p>
                <p className="text-sm text-muted-foreground">Avg. Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
            <Filter className="h-5 w-5 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by file name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl text-card-foreground">All Reviews</CardTitle>
          <CardDescription>
            {filteredReviews.length} review{filteredReviews.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading reviews...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No reviews found</h3>
              <p className="text-muted-foreground mt-2">
                Try adjusting your filters or search query.
              </p>
              <Link href="/dashboard/review">
                <Button className="mt-4">Start New Review</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Bug className="h-4 w-4 text-destructive" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Shield className="h-4 w-4 text-warning" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="h-4 w-4 text-primary" />
                      </div>
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <FileCode className="h-4 w-4 text-muted-foreground" />
                          {review.fileName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{review.language}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(review.status)}</TableCell>
                      <TableCell className="text-center">
                        {review.status === "completed" ? (
                          <span className={`font-semibold ${getScoreColor(review.score)}`}>
                            {review.score}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
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
                        {review.status === "completed" && (
                          <Link href={`/dashboard/results/${review.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                              <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                          </Link>
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
    </div>
  );
}
