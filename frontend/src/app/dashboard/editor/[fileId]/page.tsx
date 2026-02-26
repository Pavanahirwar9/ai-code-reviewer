'use client';

/**
 * Code Editor Page
 * Full-featured code editor with Monaco and inline issue highlighting
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft,
    Save,
    RotateCw,
    AlertCircle,
    Loader2,
    SendHorizonal,
    FileDown,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import IssuesPanel from '@/components/editor/IssuesPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CodeEditorHandle } from '@/components/editor/CodeEditor';

// Dynamically import Monaco Editor (client-side only)
const CodeEditor = dynamic(() => import('@/components/editor/CodeEditor'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-950">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
    ),
});

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

interface FileData {
    _id: string;
    code: string;
    originalCode: string;
    language: string;
    filePath: string;
    issues: Issue[];
    isEdited: boolean;
    editedAt?: string;
}

export default function EditorPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const fileId = params.fileId as string;

    const [fileData, setFileData] = useState<FileData | null>(null);
    const [currentCode, setCurrentCode] = useState<string>('');
    const [issues, setIssues] = useState<Issue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    /** Map of lineNumber → original (pre-fix) code for green diff highlights */
    const [fixedLines, setFixedLines] = useState<Map<number, string>>(new Map());
    /** Ref to Monaco editor — used for scroll-to-line and hover highlight */
    const codeEditorRef = useRef<CodeEditorHandle>(null);

    // Load file data
    useEffect(() => {
        loadFileData();
    }, [fileId]);

    // Warn before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const loadFileData = async () => {
        try {
            setIsLoading(true);
            const response = await api.getEditorFile(fileId);

            if (response.success && response.data) {
                setFileData(response.data);
                setCurrentCode(response.data.code);
                setIssues(response.data.issues);
                setHasUnsavedChanges(false);
            } else {
                toast({
                    title: 'Error',
                    description: response.error || 'Failed to load file',
                    variant: 'destructive',
                });
                router.push('/dashboard');
            }
        } catch (error) {
            console.error('Error loading file:', error);
            toast({
                title: 'Error',
                description: 'Failed to load file',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeChange = (value: string) => {
        setCurrentCode(value);
        setHasUnsavedChanges(value !== fileData?.code);
    };

    const handleSave = async () => {
        if (!hasUnsavedChanges || !fileData) return;

        try {
            setIsSaving(true);
            const response = await api.updateEditorFile(fileId, currentCode);

            if (response.success) {
                setFileData({ ...fileData, code: currentCode, isEdited: true });
                setHasUnsavedChanges(false);
                toast({
                    title: 'Success',
                    description: 'Changes saved successfully',
                });
            } else {
                toast({
                    title: 'Error',
                    description: response.error || 'Failed to save changes',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error saving file:', error);
            toast({
                title: 'Error',
                description: 'Failed to save changes',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReanalyze = async () => {
        try {
            setIsAnalyzing(true);

            // Always analyze the current editor content (not just what's saved in DB)
            const codeToAnalyze = currentCode;

            // Optimistically update fileData so UI stays in sync
            if (fileData && codeToAnalyze !== fileData.code) {
                setFileData(prev => prev ? { ...prev, code: codeToAnalyze, isEdited: true } : prev);
                setHasUnsavedChanges(false);
            }

            // Clear existing fixed-line highlights — they may no longer be valid
            setFixedLines(new Map());

            const response = await api.reanalyzeFile(fileId, codeToAnalyze);

            if (response.success && response.data) {
                // Replace issues with fresh analysis results
                setIssues(response.data.issues ?? []);
                toast({
                    title: 'Re-analysis complete',
                    description: `Found ${response.data.issueCount ?? response.data.issues?.length ?? 0} issue(s) in the current code`,
                });
            } else {
                toast({
                    title: 'Error',
                    description: response.error || 'Failed to re-analyze file',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error re-analyzing file:', error);
            toast({
                title: 'Error',
                description: 'Failed to re-analyze file',
                variant: 'destructive',
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    /**
     * Apply an AI-suggested fix using the most precise replacement strategy available:
     *
     * Strategy 1a — originalCode matches the full target line (trimmed):
     *   Replace the entire line, preserving original indentation.
     *
     * Strategy 1b — originalCode is a substring of the target line:
     *   Inline-replace only that portion, keeping surrounding code intact.
     *   e.g. replaces the literal value inside a declaration without losing 'const x ='.
     *
     * Strategy 1c — originalCode spans multiple lines (found anywhere in the file):
     *   Replace the entire multi-line block in the code string.
     *
     * Strategy 2 — no originalCode / no match found:
     *   Replace the entire line at issue.line with the suggestion.
     */
    const handleApplyFix = (issue: Issue, issueIndex: number) => {
        if (!issue.suggestion) return;

        const suggestion = issue.suggestion.trim();
        const lineIdx = issue.line - 1; // 0-based
        const lines = currentCode.split('\n');

        if (lineIdx < 0 || lineIdx >= lines.length) return;

        const targetLine = lines[lineIdx];
        const indent = targetLine.match(/^(\s*)/)?.[1] ?? '';
        let newCode: string;

        if (issue.originalCode) {
            const original = issue.originalCode.trim();

            if (targetLine.trim() === original) {
                // 1a: entire line is the bad code — replace the whole line
                lines[lineIdx] = suggestion.includes('\n')
                    ? suggestion
                    : `${indent}${suggestion}`;
                newCode = lines.join('\n');

            } else if (targetLine.includes(original)) {
                // 1b: bad code is a substring of the line (e.g. a value inside a declaration)
                //     replace only that substring so surrounding code is preserved
                lines[lineIdx] = targetLine.replace(original, suggestion);
                newCode = lines.join('\n');

            } else if (currentCode.includes(original)) {
                // 1c: multi-line block — replace the first occurrence in the full source
                newCode = currentCode.replace(original, suggestion);

            } else {
                // 1d: originalCode reported by AI doesn't match source exactly — fall back
                lines[lineIdx] = suggestion.includes('\n')
                    ? suggestion
                    : `${indent}${suggestion}`;
                newCode = lines.join('\n');
            }
        } else {
            // Strategy 2: no originalCode provided — replace the whole line
            lines[lineIdx] = suggestion.includes('\n')
                ? suggestion
                : `${indent}${suggestion}`;
            newCode = lines.join('\n');
        }

        // Update editor
        setCurrentCode(newCode);
        setHasUnsavedChanges(true);

        // Track the original line for green diff highlight
        setFixedLines(prev => {
            const next = new Map(prev);
            next.set(issue.line, targetLine);
            return next;
        });

        // Mark issue as fixed in the panel
        setIssues(prev =>
            prev.map((iss, idx) =>
                idx === issueIndex ? { ...iss, fixed: true } : iss
            )
        );

        toast({
            title: 'Fix applied',
            description: `Line ${issue.line} updated. Save when ready.`,
        });
    };

    const handleBackToResults = () => {
        if (hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
                return;
            }
        }
        router.back();
    };

    const handleDownloadPDF = async () => {
        if (!fileData) return;
        setIsDownloading(true);
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentW = pageW - margin * 2;
            let y = margin;

            const checkNewPage = (needed = 8) => {
                if (y + needed > pageH - margin) {
                    doc.addPage();
                    y = margin;
                }
            };

            const addLine = (text: string, fontSize: number, bold = false, color: [number, number, number] = [30, 30, 30]) => {
                checkNewPage(fontSize * 0.4 + 4);
                doc.setFontSize(fontSize);
                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.setTextColor(...color);
                const lines = doc.splitTextToSize(text, contentW);
                doc.text(lines, margin, y);
                y += (Array.isArray(lines) ? lines.length : 1) * (fontSize * 0.4) + 2;
            };

            const addRule = (color: [number, number, number] = [200, 200, 200]) => {
                checkNewPage(5);
                doc.setDrawColor(...color);
                doc.line(margin, y, pageW - margin, y);
                y += 4;
            };

            const addFilledRect = (h: number, color: [number, number, number]) => {
                checkNewPage(h + 2);
                doc.setFillColor(...color);
                doc.roundedRect(margin, y, contentW, h, 2, 2, 'F');
            };

            // ── Header ─────────────────────────────────────────────────────
            addFilledRect(22, [30, 64, 175]);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('Code Analysis Report', margin + 4, y + 8);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated: ${new Date().toLocaleString()}`, margin + 4, y + 15);
            y += 26;

            // ── File info ──────────────────────────────────────────────────
            addLine(`File: ${fileData.filePath}`, 11, true);
            addLine(`Language: ${fileData.language}`, 10);
            const openCount = issues.filter(i => !i.fixed).length;
            const fixedCount = issues.filter(i => i.fixed).length;
            addLine(`Issues: ${openCount} open  •  ${fixedCount} fixed  •  ${issues.length} total`, 10);
            y += 3;
            addRule();

            // ── Issues ─────────────────────────────────────────────────────
            addLine('ISSUES FOUND', 12, true, [30, 64, 175]);
            y += 2;

            if (issues.length === 0) {
                addLine('No issues found — code is clean!', 10);
            } else {
                const severityColor = (s: string): [number, number, number] => {
                    if (s === 'error') return [220, 38, 38];
                    if (s === 'security') return [234, 88, 12];
                    if (s === 'warning') return [202, 138, 4];
                    return [59, 130, 246];
                };

                issues.forEach((issue, idx) => {
                    checkNewPage(24);
                    const bgColor: [number, number, number] = issue.fixed ? [240, 253, 244] : [250, 250, 250];
                    addFilledRect(6, bgColor);
                    const sc = severityColor(issue.severity);
                    doc.setTextColor(...sc);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${idx + 1}. [${issue.severity.toUpperCase()}]${issue.fixed ? ' ✓ FIXED' : ''}  Line ${issue.line}`, margin + 3, y + 4);
                    y += 8;

                    addLine(issue.title || issue.message, 10, true, [20, 20, 20]);
                    if (issue.title && issue.message) addLine(issue.message, 9, false, [80, 80, 80]);

                    if (issue.originalCode) {
                        addLine('  Problem code:', 8, true, [180, 40, 40]);
                        const ocLines = doc.splitTextToSize(`  ${issue.originalCode}`, contentW - 6);
                        doc.setFontSize(8);
                        doc.setFont('courier', 'normal');
                        doc.setTextColor(180, 40, 40);
                        checkNewPage(ocLines.length * 4 + 3);
                        doc.text(ocLines, margin + 4, y);
                        y += ocLines.length * 4 + 2;
                    }

                    if (issue.suggestion) {
                        addLine('  Fix:', 8, true, [22, 163, 74]);
                        const sgLines = doc.splitTextToSize(`  ${issue.suggestion}`, contentW - 6);
                        doc.setFontSize(8);
                        doc.setFont('courier', 'normal');
                        doc.setTextColor(22, 163, 74);
                        checkNewPage(sgLines.length * 4 + 3);
                        doc.text(sgLines, margin + 4, y);
                        y += sgLines.length * 4 + 2;
                    }

                    if (Array.isArray(issue.howToFix) && issue.howToFix.length > 0) {
                        addLine('  Steps:', 8, true, [80, 80, 80]);
                        issue.howToFix.forEach(step => addLine(`    • ${step}`, 8, false, [80, 80, 80]));
                    }

                    y += 3;
                    addRule([220, 220, 220]);
                });
            }

            // ── Code ───────────────────────────────────────────────────────
            y += 2;
            addLine('CURRENT CODE', 12, true, [30, 64, 175]);
            y += 2;
            addRule();

            const codeLines = currentCode.split('\n');
            const lineNumW = String(codeLines.length).length * 2.5 + 3;
            doc.setFontSize(7.5);
            doc.setFont('courier', 'normal');

            codeLines.forEach((codeLine, i) => {
                checkNewPage(5);
                const lineNum = String(i + 1).padStart(String(codeLines.length).length, ' ');
                doc.setTextColor(150, 150, 150);
                doc.text(lineNum, margin, y);
                const isFixed = fixedLines.has(i + 1);
                doc.setTextColor(isFixed ? 22 : 30, isFixed ? 163 : 30, isFixed ? 74 : 30);
                const clipped = doc.splitTextToSize(codeLine || ' ', contentW - lineNumW);
                doc.text(clipped[0] ?? ' ', margin + lineNumW, y);
                y += 4;
            });

            // ── Footer on every page ───────────────────────────────────────
            const totalPages = doc.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `CodeLens AI  •  ${fileData.filePath}  •  Page ${p} of ${totalPages}`,
                    margin,
                    pageH - 8,
                );
            }

            const safeName = fileData.filePath.replace(/[^a-zA-Z0-9._-]/g, '_');
            doc.save(`analysis-${safeName}-${Date.now()}.pdf`);
            toast({ title: 'PDF downloaded', description: 'Report saved to your downloads folder.' });
        } catch (err) {
            console.error('PDF generation error:', err);
            toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSubmitForAnalysis = async () => {
        if (!fileData) return;
        setIsSubmitting(true);
        try {
            const response = await api.analyzeCodeAuth(
                currentCode,
                fileData.language,
                fileData.filePath,
            );
            if (response.success && response.data) {
                const reviewId =
                    response.data.metadata?.id ||
                    response.data._id ||
                    response.data.id;
                if (!reviewId) {
                    toast({ title: 'Error', description: 'Analysis completed but result ID not found.', variant: 'destructive' });
                    return;
                }
                toast({ title: 'Analysis complete', description: 'Redirecting to results…' });
                setTimeout(() => router.push(`/dashboard/results/${reviewId}`), 600);
            } else {
                toast({ title: 'Error', description: response.error || 'Analysis failed. Please try again.', variant: 'destructive' });
            }
        } catch (err) {
            console.error('Submit error:', err);
            toast({ title: 'Error', description: 'Analysis failed. Please try again.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!fileData) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>File not found</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Top Toolbar */}
            <div className="border-b bg-card px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBackToResults}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-lg font-semibold">{fileData.filePath}</h1>
                            <p className="text-sm text-muted-foreground">
                                {fileData.language} • {issues.filter(i => !i.fixed).length} open issues{fixedLines.size > 0 ? ` • ${fixedLines.size} fixed` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasUnsavedChanges && (
                            <span className="text-sm text-yellow-500 mr-2">
                                Unsaved changes
                            </span>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSave}
                            disabled={!hasUnsavedChanges || isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Changes
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleReanalyze}
                            disabled={isAnalyzing || isSubmitting}
                        >
                            {isAnalyzing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RotateCw className="w-4 h-4 mr-2" />
                            )}
                            Re-Analyze
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleSubmitForAnalysis}
                            disabled={isSubmitting || isAnalyzing}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <SendHorizonal className="w-4 h-4 mr-2" />
                            )}
                            {isSubmitting ? 'Submitting…' : 'Submit for Analysis'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                        >
                            {isDownloading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <FileDown className="w-4 h-4 mr-2" />
                            )}
                            {isDownloading ? 'Generating…' : 'Download PDF'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Editor Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Monaco Editor */}
                <div className="flex-1 overflow-hidden">
                    <CodeEditor
                        ref={codeEditorRef}
                        code={currentCode}
                        language={fileData.language}
                        issues={issues.filter(i => !i.fixed)}
                        onChange={handleCodeChange}
                        readOnly={false}
                        fixedLines={fixedLines}
                    />
                </div>

                {/* Right: Issues Panel */}
                <div className="w-96 overflow-hidden">
                    <IssuesPanel
                        issues={issues}
                        onIssueClick={(issue) => codeEditorRef.current?.scrollToLine(issue.line)}
                        onIssueHover={(issue) => {
                            if (issue) codeEditorRef.current?.highlightLine(issue.line);
                            else codeEditorRef.current?.clearHighlight();
                        }}
                        onApplyFix={handleApplyFix}
                    />
                </div>
            </div>

            {/* Global CSS for Monaco decorations */}
            <style jsx global>{`
                .editorError {
                    text-decoration: wavy underline;
                    text-decoration-color: #ef4444;
                    text-decoration-thickness: 2px;
                }
                .editorSecurity {
                    text-decoration: wavy underline;
                    text-decoration-color: #f97316;
                    text-decoration-thickness: 2px;
                }
                .editorWarning {
                    text-decoration: wavy underline;
                    text-decoration-color: #eab308;
                    text-decoration-thickness: 2px;
                }
                .editorInfo {
                    text-decoration: wavy underline;
                    text-decoration-color: #3b82f6;
                    text-decoration-thickness: 1px;
                }
                /* Diff: fixed line green background */
                .diffFixedLine {
                    background: rgba(34, 197, 94, 0.12) !important;
                    border-left: 3px solid #22c55e !important;
                }
                /* Trailing comment showing removed code */
                .diffRemovedComment {
                    color: #6b7280 !important;
                    font-style: italic;
                    opacity: 0.75;
                }
                /* Glyph for fixed line */
                .fixedGlyph::before {
                    content: '✅';
                    font-size: 11px;
                    margin-left: 2px;
                }
                /* Hover highlight from Issues Panel */
                .editorHoverHighlight {
                    background: rgba(99, 179, 237, 0.15) !important;
                    border-left: 3px solid #63b3ed !important;
                    transition: background 0.15s ease;
                }
                /* Click flash (scroll-to) highlight */
                .editorClickFlash {
                    background: rgba(251, 191, 36, 0.25) !important;
                    border-left: 3px solid #f59e0b !important;
                    animation: flashFade 1.2s ease forwards;
                }
                @keyframes flashFade {
                    0%   { background: rgba(251, 191, 36, 0.35); }
                    100% { background: rgba(251, 191, 36, 0); }
                }
                .clickFlashGlyph::before {
                    content: '→';
                    font-size: 12px;
                    color: #f59e0b;
                    margin-left: 2px;
                }
            `}</style>
        </div>
    );
}
