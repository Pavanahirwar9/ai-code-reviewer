'use client';

/**
 * Code Editor Page
 * Full-featured code editor with Monaco and inline issue highlighting
 */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
    ArrowLeft, 
    Save, 
    RotateCw, 
    AlertCircle,
    Loader2 
} from 'lucide-react';
import dynamic from 'next/dynamic';
import IssuesPanel from '@/components/editor/IssuesPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
            const response = await api.reanalyzeFile(fileId);

            if (response.success && response.data) {
                setIssues(response.data.issues);
                toast({
                    title: 'Success',
                    description: `Analysis complete. Found ${response.data.issueCount} issues`,
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

    const handleBackToResults = () => {
        if (hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
                return;
            }
        }
        router.back();
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
                                {fileData.language} • {issues.length} issues
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
                            disabled={isAnalyzing}
                        >
                            {isAnalyzing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RotateCw className="w-4 h-4 mr-2" />
                            )}
                            Re-Analyze
                        </Button>
                    </div>
                </div>
            </div>

            {/* Editor Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Monaco Editor */}
                <div className="flex-1 overflow-hidden">
                    <CodeEditor
                        code={currentCode}
                        language={fileData.language}
                        issues={issues}
                        onChange={handleCodeChange}
                        readOnly={false}
                    />
                </div>

                {/* Right: Issues Panel */}
                <div className="w-96 border-l overflow-hidden">
                    <IssuesPanel issues={issues} />
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
            `}</style>
        </div>
    );
}
