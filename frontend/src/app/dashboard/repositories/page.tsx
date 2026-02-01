"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Github, 
  Link2, 
  Trash2, 
  ExternalLink, 
  Search,
  FolderGit2,
  GitBranch,
  Star,
  Eye,
  GitFork,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Repository {
  _id: string;
  repoId?: string;
  name: string;
  full_name: string;
  description?: string;
  language?: string;
  default_branch: string;
  source: 'github' | 'public-url';
  html_url?: string;
  stargazers_count?: number;
  watchers_count?: number;
  forks_count?: number;
  private?: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<'all' | 'github' | 'public-url'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState<Repository | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchRepos();
  }, []);

  useEffect(() => {
    filterRepositories();
  }, [repos, searchQuery, filterSource]);

  const fetchRepos = async () => {
    setIsLoading(true);
    try {
      const response = await api.getGitHubRepos();
      if (response.success && response.data) {
        setRepos(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch repos:', error);
      toast.error('Failed to fetch repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const filterRepositories = () => {
    let filtered = repos;

    // Filter by source
    if (filterSource !== 'all') {
      filtered = filtered.filter(repo => repo.source === filterSource);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(repo =>
        repo.full_name.toLowerCase().includes(query) ||
        repo.name.toLowerCase().includes(query) ||
        (repo.description && repo.description.toLowerCase().includes(query)) ||
        (repo.language && repo.language.toLowerCase().includes(query))
      );
    }

    setFilteredRepos(filtered);
  };

  const handleDeleteClick = (repo: Repository) => {
    setRepoToDelete(repo);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!repoToDelete) return;

    setIsDeleting(true);
    try {
      // Call delete API (you'll need to implement this endpoint)
      const response = await api.request(`/github/repos/${repoToDelete._id}`, {
        method: 'DELETE',
      }, true);

      if (response.success) {
        toast.success('Repository removed successfully');
        setRepos(repos.filter(r => r._id !== repoToDelete._id));
      }
    } catch (error: any) {
      console.error('Failed to delete repo:', error);
      toast.error(error.response?.data?.message || 'Failed to remove repository');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setRepoToDelete(null);
    }
  };

  const getSourceBadge = (source: string) => {
    if (source === 'github') {
      return (
        <Badge variant="default" className="gap-1">
          <Github className="h-3 w-3" />
          OAuth
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="gap-1">
          <Link2 className="h-3 w-3" />
          URL
        </Badge>
      );
    }
  };

  const statsDisplay = (repo: Repository) => {
    if (repo.source === 'github' && (repo.stargazers_count !== undefined || repo.forks_count !== undefined)) {
      return (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {repo.stargazers_count !== undefined && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {repo.stargazers_count}
            </div>
          )}
          {repo.forks_count !== undefined && (
            <div className="flex items-center gap-1">
              <GitFork className="h-3 w-3" />
              {repo.forks_count}
            </div>
          )}
          {repo.watchers_count !== undefined && (
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {repo.watchers_count}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
        <p className="text-muted-foreground mt-2">
          Manage all your connected and added repositories
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Repositories</CardTitle>
            <FolderGit2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OAuth Connected</CardTitle>
            <Github className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {repos.filter(r => r.source === 'github').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Added by URL</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {repos.filter(r => r.source === 'public-url').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search repositories by name, description, or language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Source Filter */}
            <div className="flex gap-2">
              <Button
                variant={filterSource === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterSource('all')}
              >
                All
              </Button>
              <Button
                variant={filterSource === 'github' ? 'default' : 'outline'}
                onClick={() => setFilterSource('github')}
                className="gap-2"
              >
                <Github className="h-4 w-4" />
                OAuth
              </Button>
              <Button
                variant={filterSource === 'public-url' ? 'default' : 'outline'}
                onClick={() => setFilterSource('public-url')}
                className="gap-2"
              >
                <Link2 className="h-4 w-4" />
                URL
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Repository List */}
      {filteredRepos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No repositories found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {searchQuery || filterSource !== 'all'
                ? "Try adjusting your search or filters"
                : "Connect your GitHub account or add repositories by URL to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRepos.map((repo) => (
            <Card key={repo._id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FolderGit2 className="h-5 w-5 text-primary" />
                        {repo.full_name}
                      </h3>
                      {getSourceBadge(repo.source)}
                      {repo.private && (
                        <Badge variant="outline">Private</Badge>
                      )}
                      {repo.language && (
                        <Badge variant="outline" className="gap-1">
                          {repo.language}
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    {repo.description && (
                      <p className="text-sm text-muted-foreground">
                        {repo.description}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <GitBranch className="h-4 w-4" />
                        {repo.default_branch}
                      </div>
                      {statsDisplay(repo)}
                      <div className="text-xs text-muted-foreground">
                        Added {new Date(repo.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {repo.html_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(repo.html_url, '_blank')}
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View on GitHub
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(repo)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Repository</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{repoToDelete?.full_name}</strong>?
              This will remove the repository from your list. Analysis history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
