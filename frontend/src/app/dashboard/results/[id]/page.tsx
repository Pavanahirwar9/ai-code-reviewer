"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bug,
  Shield,
  Zap,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
  ArrowLeft,
  FileCode,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Code2,
  Edit,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type Severity = "critical" | "warning" | "info";

interface Issue {
  id: string;
  title: string;
  description: string;
  line: number;
  code: string;
  suggestion: string;
  severity: Severity;
}

const mockResults = {
  summary: {
    fileName: "calculateDiscount.js",
    language: "JavaScript",
    linesAnalyzed: 25,
    analysisTime: "2.3s",
    overallScore: 72,
  },
  bugs: [
    {
      id: "bug-1",
      title: "Off-by-one error in loop condition",
      description: "The loop iterates one extra time, causing an array index out of bounds error.",
      line: 3,
      code: "for (let i = 0; i <= items.length; i++)",
      suggestion: "for (let i = 0; i < items.length; i++)",
      severity: "critical" as Severity,
    },
    {
      id: "bug-2",
      title: "Type coercion issue with string input",
      description: "The price parameter is passed as a string instead of a number, leading to unexpected behavior.",
      line: 16,
      code: 'const price = "100";',
      suggestion: "const price = 100;",
      severity: "warning" as Severity,
    },
  ],
  security: [
    {
      id: "sec-1",
      title: "Hardcoded API key detected",
      description: "Sensitive API key is exposed in the source code. This is a critical security vulnerability.",
      line: 20,
      code: 'const apiKey = "sk_live_12345678901234567890";',
      suggestion: "const apiKey = process.env.API_KEY;",
      severity: "critical" as Severity,
    },
  ],
  performance: [
    {
      id: "perf-1",
      title: "Unnecessary variable declaration",
      description: "The discount variable can be inlined to improve performance and readability.",
      line: 3,
      code: "let discount = price * discountPercent / 100;",
      suggestion: "return price - (price * discountPercent / 100);",
      severity: "info" as Severity,
    },
    {
      id: "perf-2",
      title: "Missing input validation",
      description: "Add early return for invalid inputs to avoid unnecessary calculations.",
      line: 1,
      code: "function calculateDiscount(price, discountPercent)",
      suggestion: "if (typeof price !== 'number' || typeof discountPercent !== 'number') return null;",
      severity: "warning" as Severity,
    },
  ],
  suggestions: [
    {
      id: "sug-1",
      title: "Add TypeScript for better type safety",
      description: "Consider using TypeScript to catch type-related bugs at compile time.",
      line: 1,
      code: "function calculateDiscount(price, discountPercent)",
      suggestion: "function calculateDiscount(price: number, discountPercent: number): number",
      severity: "info" as Severity,
    },
    {
      id: "sug-2",
      title: "Use environment variables for sensitive data",
      description: "Store sensitive configuration in environment variables instead of hardcoding.",
      line: 20,
      code: 'const apiKey = "sk_live_..."',
      suggestion: "Use dotenv or similar to load from .env file",
      severity: "info" as Severity,
    },
  ],
};

const getSeverityColor = (severity: Severity) => {
  switch (severity) {
    case "critical":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "warning":
      return "bg-warning/10 text-warning border-warning/20";
    case "info":
      return "bg-primary/10 text-primary border-primary/20";
  }
};

const getSeverityIcon = (severity: Severity) => {
  switch (severity) {
    case "critical":
      return <XCircle className="h-4 w-4" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4" />;
    case "info":
      return <CheckCircle2 className="h-4 w-4" />;
  }
};

function IssueCard({ issue }: { issue: Issue }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(issue.suggestion);
    setCopied(true);
    toast.success("Suggestion copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border bg-card overflow-hidden">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                  {getSeverityIcon(issue.severity)}
                  <span className="ml-1 capitalize">{issue.severity}</span>
                </Badge>
                <div className="text-left">
                  <CardTitle className="text-base text-card-foreground">{issue.title}</CardTitle>
                  <CardDescription className="mt-1">Line {issue.line}</CardDescription>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <p className="text-sm text-muted-foreground">{issue.description}</p>

            {/* Original Code */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Original Code</p>
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 font-mono text-sm overflow-x-auto">
                <code className="text-destructive">{issue.code}</code>
              </div>
            </div>

            {/* Suggested Fix */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suggested Fix</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={handleCopy}>
                        {copied ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy suggestion</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="rounded-lg bg-success/5 border border-success/20 p-3 font-mono text-sm overflow-x-auto">
                <code className="text-success">{issue.suggestion}</code>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [isCreatingEditor, setIsCreatingEditor] = useState(false);

  // Fetch review data from API
  useEffect(() => {
    const fetchReview = async () => {
      try {
        // First try to get from sessionStorage (for fresh reviews)
        if (typeof window !== 'undefined') {
          const storedResults = sessionStorage.getItem('latestReview');
          if (storedResults) {
            const data = JSON.parse(storedResults);
            console.log('Loaded from session:', data);
            setResults(data);
            setLoading(false);
            // Clear it after loading
            sessionStorage.removeItem('latestReview');
            return;
          }
        }

        // Otherwise fetch from API using the ID from URL
        if (params?.id && params.id !== 'undefined') {
          const response = await api.getReview(params.id as string);
          if (response.success && response.data) {
            console.log('Fetched from API:', response.data);
            setResults(response.data);
          } else {
            toast.error('Failed to load review');
          }
        } else {
          toast.error('Invalid review ID');
        }
      } catch (error) {
        console.error('Error loading review:', error);
        toast.error('Failed to load analysis results');
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [params?.id]);

  const handleDownloadPDF = async () => {
    if (!params?.id) return;

    setDownloading(true);
    try {
      const blob = await api.downloadReport(params.id as string);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `review-${params.id}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  const handleEditCode = async () => {
    if (!results) return;

    setIsCreatingEditor(true);
    try {
      // Collect all issues from results
      const allIssues = [
        ...(results.issues?.bugs || []),
        ...(results.issues?.security || []),
        ...(results.issues?.performance || []),
      ];

      const response = await api.createEditorFileFromScan(
        params.id as string,
        results.summary?.fileName || 'untitled',
        results.code || results.summary?.code || '',
        results.summary?.language || 'text',
        allIssues
      );

      if (response.success && response.data?.fileId) {
        router.push(`/dashboard/editor/${response.data.fileId}`);
      } else {
        toast.error(response.error || 'Failed to open editor');
      }
    } catch (error) {
      console.error('Error opening editor:', error);
      toast.error('Failed to open editor');
    } finally {
      setIsCreatingEditor(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Results Found</h2>
          <p className="text-muted-foreground mb-4">Unable to load analysis results</p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { summary, issues } = results;
  const bugs = issues?.bugs || [];
  const security = issues?.security || [];
  const performance = issues?.performance || [];
  const suggestions = issues?.suggestions || [];

  const totalIssues = bugs.length + security.length + performance.length;
  const criticalCount = [...bugs, ...security, ...performance].filter((i: any) => i.severity === "critical").length;
  const warningCount = [...bugs, ...security, ...performance].filter((i: any) => i.severity === "warning").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analysis Results</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <FileCode className="h-4 w-4" />
              {summary.fileName}
              <Badge variant="outline">{summary.language}</Badge>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleEditCode} 
            disabled={isCreatingEditor}
            variant="default"
            className="gap-2"
          >
            {isCreatingEditor ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Opening Editor...
              </>
            ) : (
              <>
                <Edit className="h-4 w-4" />
                Edit Code
              </>
            )}
          </Button>
          <Button onClick={handleDownloadPDF} disabled={downloading} className="gap-2" variant="outline">
            <Download className="h-4 w-4" />
            {downloading ? 'Downloading...' : 'Download Report (PDF)'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${summary.overallScore >= 80 ? "text-success" :
                summary.overallScore >= 60 ? "text-warning" : "text-destructive"
                }`}>
                {summary.overallScore}
              </span>
              <span className="text-muted-foreground">/100</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {summary.overallScore >= 80 ? "Good" : summary.overallScore >= 60 ? "Needs Improvement" : "Critical Issues"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-card-foreground">{totalIssues}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">
                {criticalCount} critical
              </Badge>
              <Badge variant="secondary" className="bg-warning/10 text-warning text-xs">
                {warningCount} warnings
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lines Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-card-foreground">{summary.linesAnalyzed}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">lines of code</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Analysis Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-primary" />
              <span className="text-4xl font-bold text-card-foreground">{summary.analysisTime}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Results Tabs */}
      <Card className="border-border bg-card">
        <Tabs defaultValue="summary" className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
              <TabsTrigger value="summary" className="gap-2">
                <Code2 className="h-4 w-4" />
                <span className="hidden sm:inline">Summary</span>
              </TabsTrigger>
              <TabsTrigger value="bugs" className="gap-2">
                <Bug className="h-4 w-4" />
                <span className="hidden sm:inline">Bugs</span>
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center bg-destructive/10 text-destructive">
                  {bugs.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center bg-warning/10 text-warning">
                  {security.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Performance</span>
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center bg-primary/10 text-primary">
                  {performance.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                <span className="hidden sm:inline">AI Tips</span>
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  {suggestions.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            <TabsContent value="summary" className="mt-0 space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Analysis Overview</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Bug className="h-4 w-4 text-destructive" />
                        Bugs Found
                      </span>
                      <span className="font-semibold text-foreground">{bugs.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Shield className="h-4 w-4 text-warning" />
                        Security Issues
                      </span>
                      <span className="font-semibold text-foreground">{security.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Zap className="h-4 w-4 text-primary" />
                        Performance Warnings
                      </span>
                      <span className="font-semibold text-foreground">{performance.length}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <XCircle className="h-4 w-4 text-destructive" />
                        Critical
                      </span>
                      <span className="font-semibold text-destructive">{criticalCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        Warnings
                      </span>
                      <span className="font-semibold text-warning">{warningCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        Passed Checks
                      </span>
                      <span className="font-semibold text-success">12</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Click on the tabs above to view detailed issues and AI-powered suggestions for each category.
              </p>
            </TabsContent>

            <TabsContent value="bugs" className="mt-0 space-y-4">
              {bugs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No bugs detected!</h3>
                  <p className="text-muted-foreground">Your code looks clean.</p>
                </div>
              ) : (
                bugs.map((bug) => <IssueCard key={bug.id} issue={bug} />)
              )}
            </TabsContent>

            <TabsContent value="security" className="mt-0 space-y-4">
              {security.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No security issues!</h3>
                  <p className="text-muted-foreground">Your code is secure.</p>
                </div>
              ) : (
                security.map((issue) => <IssueCard key={issue.id} issue={issue} />)
              )}
            </TabsContent>

            <TabsContent value="performance" className="mt-0 space-y-4">
              {performance.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">Great performance!</h3>
                  <p className="text-muted-foreground">No performance issues found.</p>
                </div>
              ) : (
                performance.map((issue) => <IssueCard key={issue.id} issue={issue} />)
              )}
            </TabsContent>

            <TabsContent value="suggestions" className="mt-0 space-y-4">
              {suggestions.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">All good!</h3>
                  <p className="text-muted-foreground">No additional suggestions.</p>
                </div>
              ) : (
                suggestions.map((suggestion) => <IssueCard key={suggestion.id} issue={suggestion} />)
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <Link href="/dashboard/review">
          <Button variant="outline" className="gap-2 bg-transparent">
            <ArrowLeft className="h-4 w-4" />
            New Review
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="gap-2 bg-transparent"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Downloading...' : 'Download Report'}
          </Button>
          <Link href="/dashboard">
            <Button className="gap-2">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
