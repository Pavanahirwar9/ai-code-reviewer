"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Save,
  RotateCcw,
  PlayCircle,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  GitCommit,
  Code2,
} from "lucide-react";

type Issue = {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info";
  type: string;
};

type FileData = {
  scanId: string;
  filePath: string;
  fileName: string;
  language: string;
  code: string;
  issues: Issue[];
  isEdited: boolean;
  canCommit: boolean;
};

export default function CodeEditorPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.scanId as string;
  const filePathArray = params.filePath as string[];
  const filePath = filePathArray.join("/");

  const [fileData, setFileData] = useState<FileData | null>(null);
  const [code, setCode] = useState<string>("");
  const [originalCode, setOriginalCode] = useState<string>("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [decorations, setDecorations] = useState<any[]>([]);
  
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Load file data
  useEffect(() => {
    loadFileData();
  }, [scanId, filePath]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(code !== originalCode);
  }, [code, originalCode]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadFileData = async () => {
    setIsLoading(true);
    try {
      const response = await api.getFileForEdit(scanId, filePath);
      
      if (response.success && response.data) {
        const data: FileData = response.data;
        setFileData(data);
        setCode(data.code);
        setOriginalCode(data.code);
        setIssues(data.issues);
      } else {
        toast.error(response.error || "Failed to load file");
        router.push(`/dashboard/results/${scanId}`);
      }
    } catch (error: any) {
      console.error("Error loading file:", error);
      toast.error("Failed to load file");
      router.push(`/dashboard/results/${scanId}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Monaco editor mount
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    updateDecorations(editor, issues);
  };

  // Update issue decorations in editor
  const updateDecorations = (editor: monaco.editor.IStandaloneCodeEditor, issuesList: Issue[]) => {
    if (!editor) return;

    const newDecorations = issuesList.map((issue) => {
      let className = "";
      let inlineClassName = "";

      switch (issue.severity) {
        case "error":
          className = "monaco-error-line";
          inlineClassName = "squiggly-error";
          break;
        case "warning":
          className = "monaco-warning-line";
          inlineClassName = "squiggly-warning";
          break;
        case "info":
          className = "monaco-info-line";
          inlineClassName = "squiggly-info";
          break;
      }

      return {
        range: new monaco.Range(issue.line, 1, issue.line, 1000),
        options: {
          isWholeLine: false,
          className,
          glyphMarginClassName: `glyph-${issue.severity}`,
          hoverMessage: { value: `**${issue.type.toUpperCase()}**: ${issue.message}` },
          inlineClassName,
        },
      };
    });

    const decorationIds = editor.deltaDecorations(decorations, newDecorations);
    setDecorations(decorationIds);
  };

  // Update decorations when issues change
  useEffect(() => {
    if (editorRef.current) {
      updateDecorations(editorRef.current, issues);
    }
  }, [issues]);

  const handleSave = async () => {
    if (!hasUnsavedChanges) {
      toast.info("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.updateFileContent(scanId, filePath, code);

      if (response.success) {
        toast.success("Changes saved successfully");
        setOriginalCode(code);
        setHasUnsavedChanges(false);
        
        // Update edited status
        if (fileData) {
          setFileData({ ...fileData, isEdited: true });
        }
      } else {
        toast.error(response.error || "Failed to save changes");
      }
    } catch (error: any) {
      console.error("Error saving file:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!hasUnsavedChanges) {
      toast.info("No changes to discard");
      return;
    }

    if (confirm("Are you sure you want to discard all changes?")) {
      setCode(originalCode);
      toast.success("Changes discarded");
    }
  };

  const handleReanalyze = async () => {
    // Save first if there are unsaved changes
    if (hasUnsavedChanges) {
      const shouldSave = confirm("You have unsaved changes. Save before re-analyzing?");
      if (shouldSave) {
        await handleSave();
      }
    }

    setIsReanalyzing(true);
    try {
      const response = await api.reanalyzeFile(scanId, filePath);

      if (response.success && response.data) {
        toast.success(`Re-analysis complete: ${response.data.totalIssues} issues found`);
        setIssues(response.data.issues);
      } else {
        toast.error(response.error || "Failed to re-analyze file");
      }
    } catch (error: any) {
      console.error("Error re-analyzing file:", error);
      toast.error("Failed to re-analyze file");
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleCommitToGitHub = async () => {
    if (!fileData?.canCommit) {
      toast.error("This file cannot be committed (not from GitHub repository)");
      return;
    }

    if (hasUnsavedChanges) {
      toast.error("Please save changes before committing");
      return;
    }

    const commitMessage = prompt(
      "Enter commit message:",
      `Fix issues via AI Code Review - ${fileData.fileName}`
    );

    if (!commitMessage) return;

    setIsCommitting(true);
    try {
      const response = await api.commitToGitHub(scanId, filePath, commitMessage);

      if (response.success && response.data) {
        toast.success("Successfully committed to GitHub!");
        
        if (response.data.commitUrl) {
          setTimeout(() => {
            window.open(response.data.commitUrl, "_blank");
          }, 1000);
        }
      } else {
        toast.error(response.error || "Failed to commit to GitHub");
      }
    } catch (error: any) {
      console.error("Error committing to GitHub:", error);
      toast.error(error.response?.data?.error || "Failed to commit to GitHub");
    } finally {
      setIsCommitting(false);
    }
  };

  const getLanguageForMonaco = (lang: string): string => {
    const languageMap: { [key: string]: string } = {
      javascript: "javascript",
      typescript: "typescript",
      python: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      csharp: "csharp",
      go: "go",
      rust: "rust",
      ruby: "ruby",
      php: "php",
      html: "html",
      css: "css",
      json: "json",
      xml: "xml",
      yaml: "yaml",
      markdown: "markdown",
      sql: "sql",
      shell: "shell",
      bash: "shell",
    };

    return languageMap[lang.toLowerCase()] || "plaintext";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">File not found</p>
        <Button onClick={() => router.push(`/dashboard/results/${scanId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Results
        </Button>
      </div>
    );
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/results/${scanId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">{fileData.fileName}</h1>
              {fileData.isEdited && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Edited
                </Badge>
              )}
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="bg-warning/10 text-warning">
                  Unsaved Changes
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{filePath}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="h-3 w-3 text-destructive" />
            {errorCount} Errors
          </Badge>
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="h-3 w-3 text-warning" />
            {warningCount} Warnings
          </Badge>
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="h-3 w-3 text-info" />
            {infoCount} Info
          </Badge>
        </div>
      </div>

      {/* Action Buttons */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>

            <Button
              onClick={handleDiscard}
              variant="outline"
              disabled={!hasUnsavedChanges}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Discard Changes
            </Button>

            <Button
              onClick={handleReanalyze}
              variant="outline"
              disabled={isReanalyzing}
              className="gap-2"
            >
              {isReanalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              Re-Analyze File
            </Button>

            {fileData.canCommit && (
              <>
                <Separator orientation="vertical" className="h-8" />
                <Button
                  onClick={handleCommitToGitHub}
                  variant="default"
                  disabled={hasUnsavedChanges || isCommitting}
                  className="gap-2"
                >
                  {isCommitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GitCommit className="h-4 w-4" />
                  )}
                  Commit to GitHub
                </Button>
              </>
            )}
          </div>

          {hasUnsavedChanges && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning">Unsaved Changes</p>
                <p className="text-muted-foreground">
                  Don&apos;t forget to save your changes before leaving this page.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monaco Editor */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Code Editor
          </CardTitle>
          <CardDescription>
            Edit your code and fix issues. Changes are highlighted with colored underlines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg overflow-hidden border border-border">
            <Editor
              height="600px"
              language={getLanguageForMonaco(fileData.language)}
              value={code}
              onChange={(value) => setCode(value || "")}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: "on",
                renderWhitespace: "selection",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: "on",
                glyphMargin: true,
                folding: true,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 4,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      {issues.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Issues Found ({issues.length})</CardTitle>
            <CardDescription>
              Click on an issue to navigate to the line in the editor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    if (editorRef.current) {
                      editorRef.current.revealLineInCenter(issue.line);
                      editorRef.current.setPosition({ lineNumber: issue.line, column: issue.column });
                      editorRef.current.focus();
                    }
                  }}
                >
                  <AlertCircle
                    className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                      issue.severity === "error"
                        ? "text-destructive"
                        : issue.severity === "warning"
                        ? "text-warning"
                        : "text-info"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={
                          issue.severity === "error"
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : issue.severity === "warning"
                            ? "bg-warning/10 text-warning border-warning/20"
                            : "bg-info/10 text-info border-info/20"
                        }
                      >
                        {issue.severity}
                      </Badge>
                      <Badge variant="secondary">{issue.type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        Line {issue.line}:{issue.column}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{issue.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Issue Highlighting Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-destructive rounded"></div>
              <span className="text-muted-foreground">Error</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-warning rounded"></div>
              <span className="text-muted-foreground">Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-info rounded"></div>
              <span className="text-muted-foreground">Info</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <style jsx global>{`
        .squiggly-error {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 3' enable-background='new 0 0 6 3' height='3' width='6'%3E%3Cg fill='%23ff0000'%3E%3Cpolygon points='5.5,0 2.5,3 1.1,3 4.1,0'/%3E%3Cpolygon points='4,0 6,2 6,0.6 5.4,0'/%3E%3Cpolygon points='0,2 1,3 2.4,3 0,0.6'/%3E%3C/g%3E%3C/svg%3E") bottom repeat-x;
          text-decoration: none;
        }

        .squiggly-warning {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 3' enable-background='new 0 0 6 3' height='3' width='6'%3E%3Cg fill='%23ffa500'%3E%3Cpolygon points='5.5,0 2.5,3 1.1,3 4.1,0'/%3E%3Cpolygon points='4,0 6,2 6,0.6 5.4,0'/%3E%3Cpolygon points='0,2 1,3 2.4,3 0,0.6'/%3E%3C/g%3E%3C/svg%3E") bottom repeat-x;
          text-decoration: none;
        }

        .squiggly-info {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 3' enable-background='new 0 0 6 3' height='3' width='6'%3E%3Cg fill='%230ea5e9'%3E%3Cpolygon points='5.5,0 2.5,3 1.1,3 4.1,0'/%3E%3Cpolygon points='4,0 6,2 6,0.6 5.4,0'/%3E%3Cpolygon points='0,2 1,3 2.4,3 0,0.6'/%3E%3C/g%3E%3C/svg%3E") bottom repeat-x;
          text-decoration: none;
        }

        .glyph-error::before {
          content: "●";
          color: #ff0000;
        }

        .glyph-warning::before {
          content: "●";
          color: #ffa500;
        }

        .glyph-info::before {
          content: "●";
          color: #0ea5e9;
        }
      `}</style>
    </div>
  );
}
