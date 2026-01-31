"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  Bug,
  Shield,
  Zap,
  Info,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface AnnotatedCodeViewerProps {
  code: string;
  issues: CodeIssue[];
  language: string;
  filePath: string;
  onIssueClick?: (issue: CodeIssue) => void;
}

/**
 * Annotated Code Viewer Component
 * Displays source code with inline error/warning annotations
 * Similar to VS Code / GitHub code review experience
 */
export default function AnnotatedCodeViewer({
  code,
  issues,
  language,
  filePath,
  onIssueClick,
}: AnnotatedCodeViewerProps) {
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  // Parse code into lines
  const lines = useMemo(() => code.split("\n"), [code]);

  // Group issues by line number for quick lookup
  const issuesByLine = useMemo(() => {
    const map = new Map<number, CodeIssue[]>();
    issues.forEach((issue) => {
      const lineIssues = map.get(issue.line) || [];
      lineIssues.push(issue);
      map.set(issue.line, lineIssues);
    });
    return map;
  }, [issues]);

  // Get severity color classes
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-l-destructive bg-destructive/5";
      case "warning":
        return "border-l-warning bg-warning/5";
      case "info":
        return "border-l-primary bg-primary/5";
      default:
        return "border-l-muted";
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: string, type: string) => {
    if (severity === "critical")
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    if (type === "security")
      return <Shield className="h-3.5 w-3.5 text-warning" />;
    if (type === "bug") return <Bug className="h-3.5 w-3.5 text-destructive" />;
    if (type === "performance")
      return <Zap className="h-3.5 w-3.5 text-primary" />;
    return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  // Get underline style for severity
  const getUnderlineClass = (severity: string) => {
    switch (severity) {
      case "critical":
        return "decoration-destructive decoration-wavy decoration-2";
      case "warning":
        return "decoration-warning decoration-wavy decoration-2";
      case "info":
        return "decoration-primary decoration-wavy decoration-2";
      default:
        return "";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Code Editor View */}
      <div className="lg:col-span-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono text-muted-foreground">
                {filePath}
              </CardTitle>
              <Badge variant="outline">{language}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="font-mono text-sm">
                {lines.map((line, index) => {
                  const lineNumber = index + 1;
                  const lineIssues = issuesByLine.get(lineNumber) || [];
                  const hasIssues = lineIssues.length > 0;
                  const highestSeverity = hasIssues
                    ? lineIssues.reduce((prev, curr) =>
                        curr.severity === "critical"
                          ? curr
                          : prev.severity === "critical"
                          ? prev
                          : curr.severity === "warning"
                          ? curr
                          : prev
                      )
                    : null;

                  return (
                    <div
                      key={lineNumber}
                      className={cn(
                        "group flex border-l-2 transition-colors",
                        hasIssues
                          ? getSeverityColor(highestSeverity!.severity)
                          : "border-l-transparent hover:bg-muted/30",
                        selectedLine === lineNumber && "bg-accent"
                      )}
                      onClick={() => {
                        setSelectedLine(lineNumber);
                        if (hasIssues && onIssueClick) {
                          onIssueClick(lineIssues[0]);
                        }
                      }}
                    >
                      {/* Line Number */}
                      <div
                        className={cn(
                          "w-16 flex-shrink-0 select-none px-4 py-1.5 text-right text-muted-foreground",
                          hasIssues && "font-semibold"
                        )}
                      >
                        {lineNumber}
                      </div>

                      {/* Code Content */}
                      <div className="flex-1 px-4 py-1.5 overflow-x-auto">
                        {hasIssues ? (
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={cn(
                                    "underline cursor-pointer",
                                    getUnderlineClass(highestSeverity!.severity)
                                  )}
                                >
                                  {line || " "}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="max-w-md p-3"
                              >
                                <div className="space-y-2">
                                  {lineIssues.map((issue, idx) => (
                                    <div
                                      key={idx}
                                      className="flex gap-2 items-start"
                                    >
                                      {getSeverityIcon(
                                        issue.severity,
                                        issue.type
                                      )}
                                      <div className="text-xs">
                                        <p className="font-semibold">
                                          {issue.title}
                                        </p>
                                        <p className="text-muted-foreground">
                                          {issue.message}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-foreground">{line || " "}</span>
                        )}
                      </div>

                      {/* Issue Indicator */}
                      {hasIssues && (
                        <div className="flex-shrink-0 px-2 py-1.5">
                          <div className="flex gap-1">
                            {lineIssues.map((issue, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  issue.severity === "critical" &&
                                    "bg-destructive",
                                  issue.severity === "warning" && "bg-warning",
                                  issue.severity === "info" && "bg-primary"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Issues Panel */}
      <div className="lg:col-span-1">
        <Card className="border-border bg-card sticky top-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Issues Found ({issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-3">
                {issues.map((issue, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedLine(issue.line);
                      if (onIssueClick) onIssueClick(issue);
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm",
                      selectedLine === issue.line
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(issue.severity, issue.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">
                            Line {issue.line}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              issue.severity === "critical" &&
                                "border-destructive text-destructive",
                              issue.severity === "warning" &&
                                "border-warning text-warning",
                              issue.severity === "info" &&
                                "border-primary text-primary"
                            )}
                          >
                            {issue.severity}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground line-clamp-2">
                          {issue.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {issue.message}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </button>
                ))}

                {issues.length === 0 && (
                  <div className="text-center py-8">
                    <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No issues found in this file
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
