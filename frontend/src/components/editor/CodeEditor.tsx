'use client';

/**
 * Monaco Code Editor Component
 * Provides syntax highlighting, inline issue decorations, diff highlighting,
 * and imperative scroll/highlight methods (via forwardRef).
 */

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
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
    fixedLines?: Map<number, string>;
}

/** Methods exposed to the parent via ref */
export interface CodeEditorHandle {
    /** Scroll editor to a line and briefly flash it (on click) */
    scrollToLine: (line: number) => void;
    /** Temporarily highlight a line without scrolling (on hover) */
    highlightLine: (line: number) => void;
    /** Remove temporary hover highlight */
    clearHighlight: () => void;
}

const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
    { code, language, issues, onChange, readOnly = false, fixedLines },
    ref,
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const diffDecorationsRef = useRef<string[]>([]);
    const hoverDecorationsRef = useRef<string[]>([]);
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isEditorReady, setIsEditorReady] = useState(false);

    // Expose scroll/highlight API to parent
    useImperativeHandle(ref, () => ({
        scrollToLine(line: number) {
            const editor = monacoEditorRef.current;
            if (!editor) return;
            const model = editor.getModel();
            if (!model) return;
            const safeLine = Math.min(Math.max(1, line), model.getLineCount());

            // Scroll to center
            editor.revealLineInCenter(safeLine, monaco.editor.ScrollType.Smooth);

            // Flash the line with a bright highlight then fade back to issue underline
            const lineContent = model.getLineContent(safeLine);
            const endCol = lineContent.length + 1;

            hoverDecorationsRef.current = editor.deltaDecorations(
                hoverDecorationsRef.current,
                [{
                    range: new monaco.Range(safeLine, 1, safeLine, endCol),
                    options: {
                        isWholeLine: true,
                        className: 'editorClickFlash',
                        glyphMarginClassName: 'clickFlashGlyph',
                    },
                }],
            );

            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = setTimeout(() => {
                hoverDecorationsRef.current = editor.deltaDecorations(
                    hoverDecorationsRef.current, [],
                );
            }, 1200);
        },

        highlightLine(line: number) {
            const editor = monacoEditorRef.current;
            if (!editor) return;
            const model = editor.getModel();
            if (!model) return;
            const safeLine = Math.min(Math.max(1, line), model.getLineCount());
            const lineContent = model.getLineContent(safeLine);
            const endCol = lineContent.length + 1;

            hoverDecorationsRef.current = editor.deltaDecorations(
                hoverDecorationsRef.current,
                [{
                    range: new monaco.Range(safeLine, 1, safeLine, endCol),
                    options: {
                        isWholeLine: true,
                        className: 'editorHoverHighlight',
                    },
                }],
            );
        },

        clearHighlight() {
            const editor = monacoEditorRef.current;
            if (!editor) return;
            hoverDecorationsRef.current = editor.deltaDecorations(
                hoverDecorationsRef.current, [],
            );
        },
    }), [isEditorReady]);

    // Initialize Monaco Editor
    useEffect(() => {
        if (!containerRef.current) return;

        const editor = monaco.editor.create(containerRef.current, {
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

        if (onChange) {
            editor.onDidChangeModelContent(() => {
                onChange(editor.getValue());
            });
        }

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

    // Apply issue decorations (underlines + markers)
    useEffect(() => {
        if (!monacoEditorRef.current || !isEditorReady) return;

        const editor = monacoEditorRef.current;
        const model = editor.getModel();
        if (!model) return;

        const decorations: monaco.editor.IModelDeltaDecoration[] = [];
        const markers: monaco.editor.IMarkerData[] = [];

        issues.forEach((issue) => {
            const line = Math.max(1, issue.line);
            const column = Math.max(1, issue.column || 1);
            const lineContent = model.getLineContent(line);
            const endColumn = lineContent.length + 1;

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

            decorations.push({
                range: new monaco.Range(line, column, line, endColumn),
                options: {
                    inlineClassName,
                    hoverMessage: { value: `**${issue.severity.toUpperCase()}**: ${issue.message}` },
                    glyphMarginClassName: getGlyphMarginClass(issue.severity),
                },
            });

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

        editor.deltaDecorations([], decorations);
        monaco.editor.setModelMarkers(model, 'analysis', markers);
    }, [issues, isEditorReady]);

    // Apply green diff decorations for fixed lines
    useEffect(() => {
        if (!monacoEditorRef.current || !isEditorReady) return;

        const editor = monacoEditorRef.current;
        const model = editor.getModel();
        if (!model) return;

        const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

        if (fixedLines && fixedLines.size > 0) {
            fixedLines.forEach((originalCode, lineNumber) => {
                const lineCount = model.getLineCount();
                if (lineNumber < 1 || lineNumber > lineCount) return;

                const lineContent = model.getLineContent(lineNumber);
                const endCol = lineContent.length + 1;

                newDecorations.push({
                    range: new monaco.Range(lineNumber, 1, lineNumber, endCol),
                    options: {
                        isWholeLine: true,
                        className: 'diffFixedLine',
                        glyphMarginClassName: 'fixedGlyph',
                        hoverMessage: {
                            value: `**✅ Fixed** — was:\n\`\`\`\n${originalCode.trim()}\n\`\`\``,
                        },
                        after: {
                            content: `  // ← was: ${originalCode.trim().slice(0, 60)}${originalCode.trim().length > 60 ? '…' : ''}`,
                            inlineClassName: 'diffRemovedComment',
                        },
                    },
                });
            });
        }

        diffDecorationsRef.current = editor.deltaDecorations(
            diffDecorationsRef.current,
            newDecorations,
        );
    }, [fixedLines, isEditorReady]);

    return (
        <div ref={containerRef} className="w-full h-full" />
    );
});

export default CodeEditor;

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

function getGlyphMarginClass(severity: string): string {
    switch (severity) {
        case 'error': return 'errorGlyph';
        case 'security': return 'securityGlyph';
        case 'warning': return 'warningGlyph';
        default: return 'infoGlyph';
    }
}
