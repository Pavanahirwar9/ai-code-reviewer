'use client';

/**
 * Monaco Code Editor Component
 * Provides syntax highlighting and inline issue decorations
 */

import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

interface Issue {
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning' | 'security' | 'info';
    rule?: string;
    source?: string;
}

interface CodeEditorProps {
    code: string;
    language: string;
    issues: Issue[];
    onChange?: (value: string) => void;
    readOnly?: boolean;
}

export default function CodeEditor({ 
    code, 
    language, 
    issues, 
    onChange, 
    readOnly = false 
}: CodeEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const [isEditorReady, setIsEditorReady] = useState(false);

    // Initialize Monaco Editor
    useEffect(() => {
        if (!editorRef.current) return;

        // Create editor instance
        const editor = monaco.editor.create(editorRef.current, {
            value: code,
            language: getMonacoLanguage(language),
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            readOnly,
            glyphMargin: true,
            folding: true,
            renderLineHighlight: 'all',
        });

        monacoEditorRef.current = editor;
        setIsEditorReady(true);

        // Listen for content changes
        if (onChange) {
            editor.onDidChangeModelContent(() => {
                const value = editor.getValue();
                onChange(value);
            });
        }

        // Cleanup
        return () => {
            editor.dispose();
        };
    }, []);

    // Update code when it changes externally
    useEffect(() => {
        if (monacoEditorRef.current && isEditorReady) {
            const currentValue = monacoEditorRef.current.getValue();
            if (currentValue !== code) {
                monacoEditorRef.current.setValue(code);
            }
        }
    }, [code, isEditorReady]);

    // Apply decorations for issues (inline highlighting)
    useEffect(() => {
        if (!monacoEditorRef.current || !isEditorReady) return;

        const editor = monacoEditorRef.current;
        const model = editor.getModel();
        if (!model) return;

        // Create decorations for each issue
        const decorations: monaco.editor.IModelDeltaDecoration[] = [];
        const markers: monaco.editor.IMarkerData[] = [];

        issues.forEach((issue) => {
            const line = Math.max(1, issue.line);
            const column = Math.max(1, issue.column || 1);

            // Get line content to determine the end column
            const lineContent = model.getLineContent(line);
            const endColumn = lineContent.length + 1;

            // Determine severity class and marker severity
            let inlineClassName = '';
            let markerSeverity = monaco.MarkerSeverity.Warning;

            switch (issue.severity) {
                case 'error':
                    inlineClassName = 'editorError';
                    markerSeverity = monaco.MarkerSeverity.Error;
                    break;
                case 'security':
                    inlineClassName = 'editorSecurity';
                    markerSeverity = monaco.MarkerSeverity.Error;
                    break;
                case 'warning':
                    inlineClassName = 'editorWarning';
                    markerSeverity = monaco.MarkerSeverity.Warning;
                    break;
                case 'info':
                    inlineClassName = 'editorInfo';
                    markerSeverity = monaco.MarkerSeverity.Info;
                    break;
            }

            // Add decoration (visual underline)
            decorations.push({
                range: new monaco.Range(line, column, line, endColumn),
                options: {
                    inlineClassName,
                    hoverMessage: { value: `**${issue.severity.toUpperCase()}**: ${issue.message}` },
                    glyphMarginClassName: getGlyphMarginClass(issue.severity),
                },
            });

            // Add marker (shows in problems panel and on hover)
            markers.push({
                severity: markerSeverity,
                startLineNumber: line,
                startColumn: column,
                endLineNumber: line,
                endColumn: endColumn,
                message: issue.message,
                source: issue.source || 'analysis',
                code: issue.rule,
            });
        });

        // Apply decorations
        editor.deltaDecorations([], decorations);

        // Set markers
        monaco.editor.setModelMarkers(model, 'analysis', markers);

    }, [issues, isEditorReady]);

    return (
        <div ref={editorRef} className="w-full h-full" />
    );
}

/**
 * Map language names to Monaco language IDs
 */
function getMonacoLanguage(language: string): string {
    const languageMap: Record<string, string> = {
        javascript: 'javascript',
        typescript: 'typescript',
        jsx: 'javascript',
        tsx: 'typescript',
        python: 'python',
        java: 'java',
        cpp: 'cpp',
        c: 'c',
        csharp: 'csharp',
        ruby: 'ruby',
        php: 'php',
        go: 'go',
        rust: 'rust',
        swift: 'swift',
        kotlin: 'kotlin',
        scala: 'scala',
        html: 'html',
        css: 'css',
        json: 'json',
        xml: 'xml',
        markdown: 'markdown',
        text: 'plaintext',
    };

    return languageMap[language.toLowerCase()] || 'plaintext';
}

/**
 * Get glyph margin class for issue severity
 */
function getGlyphMarginClass(severity: string): string {
    switch (severity) {
        case 'error':
            return 'errorGlyph';
        case 'security':
            return 'securityGlyph';
        case 'warning':
            return 'warningGlyph';
        default:
            return 'infoGlyph';
    }
}
