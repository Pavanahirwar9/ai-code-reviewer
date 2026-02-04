'use client';

/**
 * Issues Panel Component
 * Displays all code issues with severity indicators
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Shield, AlertTriangle, Info } from 'lucide-react';

interface Issue {
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning' | 'security' | 'info';
    rule?: string;
    source?: string;
}

interface IssuesPanelProps {
    issues: Issue[];
    onIssueClick?: (issue: Issue) => void;
}

export default function IssuesPanel({ issues, onIssueClick }: IssuesPanelProps) {
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const securityCount = issues.filter(i => i.severity === 'security').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Issues</span>
                    <span className="text-sm font-normal text-muted-foreground">
                        {issues.length} total
                    </span>
                </CardTitle>
                <div className="flex gap-2 mt-2">
                    {errorCount > 0 && (
                        <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errorCount} Errors
                        </Badge>
                    )}
                    {securityCount > 0 && (
                        <Badge variant="destructive" className="gap-1 bg-orange-600">
                            <Shield className="w-3 h-3" />
                            {securityCount} Security
                        </Badge>
                    )}
                    {warningCount > 0 && (
                        <Badge variant="secondary" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {warningCount} Warnings
                        </Badge>
                    )}
                    {infoCount > 0 && (
                        <Badge variant="outline" className="gap-1">
                            <Info className="w-3 h-3" />
                            {infoCount} Info
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-2">
                        {issues.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Info className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>No issues found</p>
                            </div>
                        ) : (
                            issues.map((issue, index) => (
                                <IssueCard
                                    key={index}
                                    issue={issue}
                                    onClick={() => onIssueClick?.(issue)}
                                />
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function IssueCard({ issue, onClick }: { issue: Issue; onClick: () => void }) {
    const getIcon = () => {
        switch (issue.severity) {
            case 'error':
                return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'security':
                return <Shield className="w-4 h-4 text-orange-500" />;
            case 'warning':
                return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            default:
                return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const getSeverityColor = () => {
        switch (issue.severity) {
            case 'error':
                return 'border-l-red-500';
            case 'security':
                return 'border-l-orange-500';
            case 'warning':
                return 'border-l-yellow-500';
            default:
                return 'border-l-blue-500';
        }
    };

    return (
        <div
            onClick={onClick}
            className={`border-l-4 ${getSeverityColor()} bg-card p-3 rounded cursor-pointer hover:bg-accent transition-colors`}
        >
            <div className="flex items-start gap-2">
                <div className="mt-0.5">{getIcon()}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                            Line {issue.line}
                        </Badge>
                        {issue.rule && (
                            <span className="text-xs text-muted-foreground">
                                {issue.rule}
                            </span>
                        )}
                    </div>
                    <p className="text-sm break-words">{issue.message}</p>
                    {issue.source && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Source: {issue.source}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
