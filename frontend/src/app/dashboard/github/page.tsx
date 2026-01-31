"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Github,
  Link2,
  GitBranch,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

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
          <AlertCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return null;
  }
};

export default function GitHubIntegrationPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [githubUsername, setGithubUsername] = useState("");
  const [repos, setRepos] = useState<any[]>([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [userRepoInput, setUserRepoInput] = useState("");
  const [userRepoBranch, setUserRepoBranch] = useState("");
  const [isAddingUserRepo, setIsAddingUserRepo] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollingScanId, setPollingScanId] = useState<string | null>(null);

  // Check GitHub connection status on load
  useEffect(() => {
    // Check for OAuth callback parameters
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const token = params.get('token');
    const error = params.get('error');

    if (connected === 'true') {
      // Store the JWT token if provided
      if (token) {
        localStorage.setItem('token', token);
      }
      toast.success('Successfully connected to GitHub!');
      setIsConnected(true);
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/github');
    } else if (error) {
      toast.error(`GitHub connection failed: ${error}`);
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/github');
    }

    checkGitHubStatus();
  }, []);

  // Fetch repos when connected
  useEffect(() => {
    if (isConnected) {
      fetchRepos();
      fetchRecentScans(); // Fetch scans when connected
    }
  }, [isConnected]);

  // Fetch branches when repo is selected
  useEffect(() => {
    if (selectedRepo) {
      fetchBranches();
    }
  }, [selectedRepo]);

  // Poll for scan status
  useEffect(() => {
    if (!pollingScanId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await api.getGitHubScan(pollingScanId);
        if (response.success && response.data) {
          const scan = response.data;

          // Update the scan in the list
          setRecentScans(prev =>
            prev.map(s => s.id === scan.id ? scan : s)
          );

          // Stop polling if completed or failed
          if (scan.status === 'completed' || scan.status === 'failed') {
            setPollingScanId(null);
            setIsAnalyzing(false);

            if (scan.status === 'completed') {
              toast.success('Analysis completed successfully!');
            } else {
              toast.error(`Analysis failed: ${scan.error || 'Unknown error'}`);
            }
          }
        }
      } catch (error) {
        console.error('Error polling scan status:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [pollingScanId]);

  const checkGitHubStatus = async () => {
    try {
      const response = await api.getGitHubStatus();
      if (response.success && response.data) {
        setIsConnected(response.data.connected);
        setGithubUsername(response.data.username || "");
      }
    } catch (error) {
      console.error('Failed to check GitHub status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRepos = async () => {
    try {
      const response = await api.getGitHubRepos();
      if (response.success && response.data) {
        setRepos(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch repos:', error);
      toast.error('Failed to fetch repositories');
    }
  };

  const fetchBranches = async () => {
    if (!selectedRepo) return;

    try {
      const [owner, repo] = selectedRepo.split('/');
      const response = await api.getGitHubRepoBranches(owner, repo);
      if (response.success && response.data) {
        setBranches(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      toast.error('Failed to fetch branches');
    }
  };

  const fetchRecentScans = async () => {
    try {
      const response = await api.getGitHubScans(1, 10);
      if (response.success && response.data) {
        setRecentScans(response.data.scans || []);
      }
    } catch (error) {
      console.error('Failed to fetch recent scans:', error);
    }
  };

  const handleRefreshScans = async () => {
    setIsRefreshing(true);
    try {
      await fetchRecentScans();
      toast.success('Scans refreshed');
    } catch (error) {
      toast.error('Failed to refresh scans');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await api.connectGitHub();
      if (response.success && response.data?.authUrl) {
        // Redirect to GitHub OAuth
        window.location.href = response.data.authUrl;
      } else {
        toast.error('Failed to initiate GitHub connection');
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('GitHub connection error:', error);
      toast.error('Failed to connect to GitHub');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await api.disconnectGitHub();
      if (response.success) {
        setIsConnected(false);
        setSelectedRepo("");
        setSelectedBranch("");
        setRepos([]);
        setBranches([]);
        setGithubUsername("");
        toast.success("Disconnected from GitHub");
      } else {
        toast.error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect from GitHub');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedRepo || !selectedBranch) {
      toast.error("Please select a repository and branch");
      return;
    }

    setIsAnalyzing(true);
    try {
      const [owner, repo] = selectedRepo.split('/');
      const response = await api.analyzeGitHubRepo(owner, repo, selectedBranch);

      if (response.success && response.data) {
        const analysisId = response.data.analysisId;

        if (!analysisId) {
          toast.error("Analysis started but ID not received");
          setIsAnalyzing(false);
          return;
        }

        toast.success("Analysis started! Status will update automatically.");

        // Create initial scan entry in the list
        const newScan = {
          id: analysisId,
          repo: `${owner}/${repo}`,
          branch: selectedBranch,
          status: 'in-progress',
          bugs: 0,
          security: 0,
          performance: 0,
          totalIssues: 0,
          overallScore: 0,
          progress: { totalFiles: 0, filesAnalyzed: 0, percentage: 0 },
          date: new Date().toISOString(),
        };

        setRecentScans(prev => [newScan, ...prev]);

        // Start polling for this scan
        setPollingScanId(analysisId);
      } else {
        toast.error(response.error || 'Analysis failed');
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to start analysis');
      setIsAnalyzing(false);
    }
  };

  const handleAddRepo = () => {
    if (!repoUrl) {
      toast.error("Please enter a repository URL");
      return;
    }
    toast.success("Repository added successfully!");
    setRepoUrl("");
  };

  const handleAddUserRepo = async () => {
    if (!userRepoInput) {
      toast.error("Please enter a repository name (e.g., owner/repo)");
      return;
    }

    // Validate format: owner/repo
    if (!userRepoInput.includes('/')) {
      toast.error("Please use the format: owner/repository");
      return;
    }

    setIsAddingUserRepo(true);
    try {
      const response = await api.addUserGitHubRepo(userRepoInput, userRepoBranch || undefined);

      if (response.success) {
        toast.success(`Repository "${userRepoInput}" added successfully!`);
        setUserRepoInput("");
        setUserRepoBranch("");
        
        // Refresh the repos list to include the newly added repo
        await fetchRepos();
      } else {
        toast.error(response.error || 'Failed to add repository');
      }
    } catch (error: any) {
      console.error('Add repo error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to add repository';
      toast.error(errorMessage);
    } finally {
      setIsAddingUserRepo(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedRepoData = repos.find(r => r.full_name === selectedRepo);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">GitHub Integration</h1>
        <p className="mt-2 text-muted-foreground">
          Connect your GitHub account to analyze repositories directly from your codebase.
        </p>
      </div>

      {/* Connection Status */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <Github className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl text-card-foreground">GitHub Account</CardTitle>
                <CardDescription>
                  {isConnected ? `Connected as @${githubUsername}` : "Connect your GitHub account to get started"}
                </CardDescription>
              </div>
            </div>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-success/10 text-success">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Connected
                </Badge>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnect} disabled={isConnecting} className="gap-2">
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Github className="h-4 w-4" />
                    Connect GitHub
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {isConnected && (
        <>
          {/* Analyze Repository */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-card-foreground">
                <Play className="h-5 w-5 text-primary" />
                Analyze Repository
              </CardTitle>
              <CardDescription>
                Select a repository and branch to run AI-powered code analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Repository Selector */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="repo" className="text-sm font-medium text-foreground">
                      Repository
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5">
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Select from your connected repositories</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select a repository..." />
                    </SelectTrigger>
                    <SelectContent>
                      {repos.map((repo) => (
                        <SelectItem key={repo.full_name} value={repo.full_name}>
                          <div className="flex items-center gap-2">
                            <Github className="h-4 w-4" />
                            {repo.full_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the repository you want to analyze.
                  </p>
                </div>

                {/* Branch Selector */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="branch" className="text-sm font-medium text-foreground">
                      Branch
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5">
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Select the branch to analyze</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!selectedRepo}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select a branch..." />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch} value={branch}>
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            {branch}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll analyze the latest commit on this branch.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!selectedRepo || !selectedBranch || isAnalyzing}
                className="gap-2"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Starting Analysis...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Analyze Repository
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Add Your Own GitHub Repository */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-card-foreground">
                <Github className="h-5 w-5 text-primary" />
                Add Your Own Repository
              </CardTitle>
              <CardDescription>
                Add any GitHub repository you own or collaborate on (public or private)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="userRepo" className="text-sm font-medium text-foreground">
                    Repository
                  </Label>
                  <Input
                    id="userRepo"
                    placeholder="owner/repository"
                    value={userRepoInput}
                    onChange={(e) => setUserRepoInput(e.target.value)}
                    className="h-12"
                    disabled={isAddingUserRepo}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the repository in owner/repo format (e.g., facebook/react)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userRepoBranch" className="text-sm font-medium text-foreground">
                    Branch (Optional)
                  </Label>
                  <Input
                    id="userRepoBranch"
                    placeholder="main"
                    value={userRepoBranch}
                    onChange={(e) => setUserRepoBranch(e.target.value)}
                    className="h-12"
                    disabled={isAddingUserRepo}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use the default branch
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleAddUserRepo} 
                disabled={!userRepoInput || isAddingUserRepo}
                className="gap-2"
                size="lg"
              >
                {isAddingUserRepo ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Adding Repository...
                  </>
                ) : (
                  <>
                    <Github className="h-5 w-5" />
                    Add Repository
                  </>
                )}
              </Button>
              <div className="rounded-lg bg-muted/50 p-4 border border-border">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Repository Access</p>
                    <p>
                      You can add any repository you have access to. For private repositories, 
                      make sure your GitHub OAuth connection has the necessary permissions. 
                      The repository will be verified against your GitHub account.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Repository by URL */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-card-foreground">
                <Link2 className="h-5 w-5 text-primary" />
                Add Repository by URL
              </CardTitle>
              <CardDescription>
                Add a public repository by entering its URL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="https://github.com/username/repository"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the full URL of a public GitHub repository.
                  </p>
                </div>
                <Button onClick={handleAddRepo} className="h-12 gap-2">
                  <Link2 className="h-4 w-4" />
                  Add Repository
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Repository Scans */}
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl text-card-foreground">Recent Repository Scans</CardTitle>
                <CardDescription>Your latest repository analysis results</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleRefreshScans} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Repository</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Issues</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentScans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No repository scans yet. Start by analyzing a repository above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentScans.map((scan) => (
                        <TableRow key={scan.id}>
                          <TableCell>
                            <div className="flex items-center gap-2 font-medium text-foreground">
                              <Github className="h-4 w-4 text-muted-foreground" />
                              {scan.repo}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <GitBranch className="h-3 w-3" />
                              {scan.branch}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(scan.status)}</TableCell>
                          <TableCell className="text-center">
                            {scan.status === "completed" ? (
                              <span className={scan.totalIssues > 0 ? "text-destructive font-medium" : "text-success"}>
                                {scan.totalIssues}
                              </span>
                            ) : scan.status === "in-progress" ? (
                              <span className="text-muted-foreground">
                                {scan.progress?.percentage || 0}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(scan.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>
                            {scan.status === "completed" && (
                              <Link href={`/dashboard/results/${scan.id}`}>
                                <Button variant="ghost" size="sm">
                                  View
                                  <ArrowRight className="ml-1 h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                            {scan.status === "in-progress" && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {scan.progress?.filesAnalyzed || 0}/{scan.progress?.totalFiles || 0}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Help Section */}
      {!isConnected && (
        <Card className="border-border bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Github className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Why connect GitHub?</h3>
                <p className="mt-2 text-muted-foreground max-w-md">
                  Connecting your GitHub account allows you to analyze entire repositories, get continuous code reviews on pull requests, and track code quality over time.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  Automatic PR reviews
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  Branch analysis
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  Code quality tracking
                </Badge>
              </div>
              <a
                href="https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
              >
                Learn more about GitHub OAuth
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
