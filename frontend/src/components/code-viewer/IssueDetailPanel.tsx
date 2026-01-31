"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bug, Shield, Zap, Copy, Check, XCircle, AlertTriangle, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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

interface IssueDetailPanelProps {
  issue: CodeIssue | null;
  onClose?: () => void;
}

/**
 * Issue Detail Panel Component
 * Shows detailed information about a selected issue
 */
export default function IssueDetailPanel({ issue, onClose }: IssueDetailPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!issue) return null;

  const handleCopy = () => {
    if (issue.suggestion) {
      navigator.clipboard.writeText(issue.suggestion);
      setCopied(true);
      toast.success("Suggestion copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getIcon = () => {
    switch (issue.type) {
      case "bug":
        return <Bug className="h-5 w-5 text-destructive" />;
      case "security":
        return <Shield className="h-5 w-5 text-warning" />;
      case "performance":
        return <Zap className="h-5 w-5 text-primary" />;
      default:
        return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getSeverityIcon = () => {
    switch (issue.severity) {
      case "critical":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "info":
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {getIcon()}
            <div>
              <CardTitle className="text-base">{issue.title}</CardTitle>
              <CardDescription className="mt-1">
                Line {issue.line} {issue.column > 0 && `• Column ${issue.column}`}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              issue.severity === "critical" && "border-destructive text-destructive",
              issue.severity === "warning" && "border-warning text-warning",
              issue.severity === "info" && "border-primary text-primary"
            )}
          >
            {getSeverityIcon()}
            <span className="ml-1 capitalize">{issue.severity}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        <div>
          <p className="text-sm text-muted-foreground">{issue.message}</p>
        </div>

        {/* Original Code */}
        {issue.code && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Problematic Code
            </p>
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 font-mono text-sm overflow-x-auto">
              <code className="text-destructive">{issue.code}</code>
            </div>
          </div>
        )}

        {/* Suggested Fix */}
        {issue.suggestion && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Suggested Fix
              </p>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="rounded-lg bg-success/5 border border-success/20 p-3 font-mono text-sm overflow-x-auto">
              <code className="text-success">{issue.suggestion}</code>
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <p>
            <strong>Type:</strong> {issue.type.charAt(0).toUpperCase() + issue.type.slice(1)}
          </p>
          <p className="mt-1">
            <strong>Severity:</strong> {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
