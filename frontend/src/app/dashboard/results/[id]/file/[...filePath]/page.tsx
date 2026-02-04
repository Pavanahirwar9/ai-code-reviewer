"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import AnnotatedCodeViewer from "@/components/code-viewer/AnnotatedCodeViewer";
import IssueDetailPanel from "@/components/code-viewer/IssueDetailPanel";
import { ArrowLeft, FileCode, Loader2, AlertCircle, Edit } from "lucide-react";
import { toast } from "sonner";

interface CodeIssue {
  line: number;
  column: number;
  message: string;
  title: string;
  code?: string;
  suggestion?: string;
  severity: "critical" | "warning" | "info";
  type: "bug" | "security" | "performance";
}

interface FileData {
  code: string;
  filePath: string;
  language: string;
  issues: CodeIssue[];
  metadata: {
    scanId: string;
    repository?: string;
    branch?: string;
    fileName?: string;
    totalIssues: number;
  };
}

/**
 * Annotated Code Review Page
 * Displays source code with inline annotations for errors, warnings, and suggestions
 * Similar to VS Code / GitHub code review interface
 */
export default function AnnotatedCodeReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<CodeIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingEditor, setIsCreatingEditor] = useState(false);

  // Extract id and filePath from params
  const scanId = params?.id as string;
  const filePathArray = params?.filePath as string[];
  const filePath = filePathArray ? filePathArray.join("/") : "";

  useEffect(() => {
    const fetchFileData = async () => {
      if (!scanId || !filePath) {
        setError("Invalid scan ID or file path");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.getFileWithIssues(scanId, filePath);

        if (response.success && response.data) {
          setFileData(response.data);
          setError(null);
        } else {
          setError(response.error || "Failed to load file");
          toast.error("Failed to load file");
        }
      } catch (err: any) {
        console.error("Error loading file:", err);
        setError(err.message || "An error occurred");
        toast.error("Failed to load file content");
      } finally {
        setLoading(false);
      }
    };

    fetchFileData();
  }, [scanId, filePath]);

  // Handle Edit Code button
  const handleEditCode = async () => {
    if (!fileData) return;

    setIsCreatingEditor(true);
    try {
      const response = await api.createEditorFileFromScan(
        scanId,
        fileData.filePath,
        fileData.code,
        fileData.language,
        fileData.issues
      );

      if (response.success && response.data?.fileId) {
        // Navigate to editor
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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading code...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !fileData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to Load File</h2>
          <p className="text-muted-foreground mb-4">
            {error || "Unable to load file content"}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Link href={`/dashboard/results/${scanId}`}>
              <Button>View Results</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Get breadcrumb parts
  const pathParts = fileData.filePath.split("/");
  const fileName = pathParts[pathParts.length - 1];

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/results/${scanId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Code Review</h1>
          </div>

          {/* Breadcrumb Navigation */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/dashboard/results/${scanId}`}>
                  Results
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-mono text-sm">
                  {fileName}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* File Info */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <FileCode className="h-3 w-3" />
            {fileData.language}
          </Badge>
          <Badge
            variant={fileData.metadata.totalIssues > 0 ? "destructive" : "secondary"}
          >
            {fileData.metadata.totalIssues} issue
            {fileData.metadata.totalIssues !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Repository Info */}
      {fileData.metadata.repository && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <span className="font-medium">Repository:</span>{" "}
          {fileData.metadata.repository}
          {fileData.metadata.branch && (
            <>
              {" "}
              • <span className="font-medium">Branch:</span>{" "}
              {fileData.metadata.branch}
            </>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Code Viewer (takes 3 columns) */}
        <div className="xl:col-span-3">
          <AnnotatedCodeViewer
            code={fileData.code}
            issues={fileData.issues}
            onIssueClick={setSelectedIssue}
          />
        </div>

        {/* Issue Detail Panel (takes 1 column) */}
        <div className="xl:col-span-1">
          <div className="sticky top-4">
            {selectedIssue ? (
              <IssueDetailPanel
                issue={selectedIssue}
                onClose={() => setSelectedIssue(null)}
              />
            ) : (
              <div className="rounded-lg border border-border bg-card p-6 text-center">
                <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Click on an underlined section or select an issue to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Link href={`/dashboard/results/${scanId}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Results
          </Button>
        </Link>
      </div>
    </div>
  );
}
