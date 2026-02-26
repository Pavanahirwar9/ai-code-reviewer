'use client';

/**
 * Issues Panel Component
 * Displays all code issues with severity indicators, "How to Fix" guide, and Apply Fix support
 */

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Shield, AlertTriangle, Info, Wrench, CheckCircle2, ChevronDown, ChevronUp, Minus, Plus, ListChecks } from 'lucide-react';

interface Issue {
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning' | 'security' | 'info';
    rule?: string;
    source?: string;
    // Apply Fix / How-To fields
    title?: string;
    suggestion?: string;
    originalCode?: string;
    howToFix?: string[];
    fixed?: boolean;
}

interface IssuesPanelProps {
    issues: Issue[];
    onIssueClick?: (issue: Issue) => void;
    onIssueHover?: (issue: Issue | null) => void;
    onApplyFix?: (issue: Issue, index: number) => void;
}

export default function IssuesPanel({ issues, onIssueClick, onIssueHover, onApplyFix }: IssuesPanelProps) {
    const openCount = issues.filter(i => !i.fixed).length;
    const fixedCount = issues.filter(i => i.fixed).length;
    const errorCount = issues.filter(i => !i.fixed && i.severity === 'error').length;
    const secCount = issues.filter(i => !i.fixed && i.severity === 'security').length;
    const warnCount = issues.filter(i => !i.fixed && i.severity === 'warning').length;
    const infoCount = issues.filter(i => !i.fixed && i.severity === 'info').length;

    return (
        <Card className="h-full flex flex-col rounded-none border-0 border-l">
            <CardHeader className="pb-2 border-b">
                <CardTitle className="flex items-center justify-between text-sm font-semibold">
                    <span>Issues</span>
                    <div className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                        {fixedCount > 0 && (
                            <span className="text-green-500 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> {fixedCount} fixed
                            </span>
                        )}
                        <span>{openCount} open</span>
                    </div>
                </CardTitle>
                <div className="flex flex-wrap gap-1 mt-1">
                    {errorCount > 0 && (
                        <Badge variant="destructive" className="gap-1 text-xs py-0">
                            <AlertCircle className="w-3 h-3" />{errorCount}
                        </Badge>
                    )}
                    {secCount > 0 && (
                        <Badge className="gap-1 text-xs py-0 bg-orange-600 hover:bg-orange-600">
                            <Shield className="w-3 h-3" />{secCount}
                        </Badge>
                    )}
                    {warnCount > 0 && (
                        <Badge variant="secondary" className="gap-1 text-xs py-0">
                            <AlertTriangle className="w-3 h-3" />{warnCount}
                        </Badge>
                    )}
                    {infoCount > 0 && (
                        <Badge variant="outline" className="gap-1 text-xs py-0">
                            <Info className="w-3 h-3" />{infoCount}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                    <div className="p-3 space-y-2">
                        {issues.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-60" />
                                <p className="text-sm">No issues found</p>
                            </div>
                        ) : (
                            issues.map((issue, index) => (
                                <IssueCard
                                    key={index}
                                    issue={issue}
                                    onClick={() => onIssueClick?.(issue)}
                                    onHover={(hovered) => onIssueHover?.(hovered ? issue : null)}
                                    onApplyFix={onApplyFix ? () => onApplyFix(issue, index) : undefined}
                                />
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function IssueCard({
    issue,
    onClick,
    onHover,
    onApplyFix,
}: {
    issue: Issue;
    onClick: () => void;
    onHover?: (hovered: boolean) => void;
    onApplyFix?: () => void;
}) {
    const [expanded, setExpanded] = useState(false);

    const getIcon = () => {
        if (issue.fixed) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
        switch (issue.severity) {
            case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'security': return <Shield className="w-4 h-4 text-orange-500" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const getBorderColor = () => {
        if (issue.fixed) return 'border-l-green-500';
        switch (issue.severity) {
            case 'error': return 'border-l-red-500';
            case 'security': return 'border-l-orange-500';
            case 'warning': return 'border-l-yellow-500';
            default: return 'border-l-blue-500';
        }
    };

    // Show details if there's anything to expand
    const hasDetails = !issue.fixed && (
        !!issue.suggestion ||
        (Array.isArray(issue.howToFix) && issue.howToFix.length > 0) ||
        !!issue.message
    );
    const hasFix = !!issue.suggestion && !issue.fixed;

    return (
        <div className={`border-l-4 ${getBorderColor()} ${issue.fixed ? 'opacity-60' : ''} bg-card rounded overflow-hidden`}>
            {/* Header Row */}
            <div
                className="flex items-start gap-2 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => { onClick(); if (hasDetails) setExpanded(e => !e); }}
                onMouseEnter={() => onHover?.(true)}
                onMouseLeave={() => onHover?.(false)}
            >
                <div className="mt-0.5 shrink-0">{getIcon()}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <Badge variant="outline" className="text-xs py-0 h-4">
                            Line {issue.line}
                        </Badge>
                        {issue.fixed && (
                            <Badge className="text-xs py-0 h-4 bg-green-600 hover:bg-green-600">Fixed</Badge>
                        )}
                        {issue.rule && (
                            <span className="text-xs text-muted-foreground truncate">{issue.rule}</span>
                        )}
                    </div>
                    {/* Title (bold) + message (detail) */}
                    <p className="text-xs font-medium leading-snug break-words">
                        {issue.title || issue.message}
                    </p>
                    {issue.title && (
                        <p className="text-xs text-muted-foreground mt-0.5 break-words leading-snug">{issue.message}</p>
                    )}
                </div>
                {hasDetails && (
                    <div className="shrink-0 mt-0.5">
                        {expanded
                            ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                            : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                    </div>
                )}
            </div>

            {/* Expanded: How to Fix steps + diff + Apply Fix button */}
            {expanded && hasDetails && (
                <div className="px-3 pb-3 space-y-3 border-t border-border/40 pt-2">

                    {/* Step-by-step How to Fix */}
                    {Array.isArray(issue.howToFix) && issue.howToFix.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                                <ListChecks className="w-3.5 h-3.5 text-blue-400" />
                                How to Fix
                            </p>
                            <ol className="space-y-1">
                                {issue.howToFix.map((step, i) => (
                                    <li key={i} className="text-xs text-muted-foreground leading-snug pl-2 border-l border-blue-500/30">
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* Code diff — original (red) vs fixed (green) */}
                    {(issue.originalCode || issue.suggestion) && (
                        <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                                <Minus className="w-3 h-3 text-red-400" /><Plus className="w-3 h-3 text-green-400" />
                                Code Change
                            </p>
                            {issue.originalCode && (
                                <div>
                                    <p className="text-xs text-red-400 mb-0.5 flex items-center gap-1">
                                        <Minus className="w-2.5 h-2.5" /> Remove
                                    </p>
                                    <pre className="text-xs rounded bg-red-500/10 border border-red-500/20 text-red-400 p-2 overflow-x-auto whitespace-pre-wrap break-all">
                                        {issue.originalCode}
                                    </pre>
                                </div>
                            )}
                            {issue.suggestion && (
                                <div>
                                    <p className="text-xs text-green-400 mb-0.5 flex items-center gap-1">
                                        <Plus className="w-2.5 h-2.5" /> Replace with
                                    </p>
                                    <pre className="text-xs rounded bg-green-500/10 border border-green-500/20 text-green-400 p-2 overflow-x-auto whitespace-pre-wrap break-all">
                                        {issue.suggestion}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Apply Fix button — only when there's a suggestion */}
                    {hasFix && onApplyFix && (
                        <Button
                            size="sm"
                            className="w-full h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                            onClick={(e) => { e.stopPropagation(); onApplyFix(); setExpanded(false); }}
                        >
                            <Wrench className="w-3 h-3" />
                            Apply Fix to Editor
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
