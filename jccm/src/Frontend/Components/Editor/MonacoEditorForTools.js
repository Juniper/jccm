// MonacoEditorForTools.js
import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { configureMonacoYaml } from 'monaco-yaml';
import { bootstrapMonacoWorkers } from './monacoWorkers.js';

const { electronAPI } = window;
bootstrapMonacoWorkers();

// Configure monaco-yaml ONCE at module load.
// (No schemas yet; we'll push them via .update() when the component mounts.)
const yamlApi = configureMonacoYaml(monaco, {
    validate: true,
    enableSchemaRequest: false,
    hover: true,
    completion: true,
    format: true,
});

export const MonacoEditorForTools = ({
    id = '',
    text = '',
    defaultFontSize = 12,
    onDidChangeCursorPosition,
    onDidChangeModelContent,
    onEditorReady,
    onDidChangeMarkers,
    tabSize = 2,
    focus = true,
    theme = 'vs-dark',
    language = 'yaml',
    automaticLayout = true,
    readOnly = false,
    enableKeyHooks = true,
    contextmenu = true,
    dataSchema = {},   // parent passes schema here
}) => {
    const editorRef = useRef(null);
    const monacoEditorInstance = useRef(null);

    useEffect(() => {
        if (!editorRef.current) return;


        // Use a stable, nice looking ID/URI. (Also controls the “Source:” line.)
        const SCHEMA_URI = `juniper://schemas/tools/${id}-schema`;
        const SCHEMA_ID = `juniper://schemas/tools/${id}-schema`;

        // Apply/refresh the schema when provided
        if (dataSchema && Object.keys(dataSchema).length > 0) {
            // IMPORTANT: update expects a single options object
            yamlApi.update({
                validate: true,
                hover: true,
                completion: true,
                format: true,
                schemas: [
                    {
                        uri: SCHEMA_URI,
                        fileMatch: ['*'],            // or a specific model URI if you scope it
                        schema: {
                            $id: SCHEMA_ID,            // stable ID instead of 'inline-schema'
                            $schema: 'http://json-schema.org/draft-07/schema#',
                            ...dataSchema,
                        },
                    },
                ],
            });
        }

        // Create Monaco editor
        monacoEditorInstance.current = monaco.editor.create(editorRef.current, {
            value: text,
            language,
            theme,
            fontSize: defaultFontSize,
            minimap: { enabled: true },
            insertSpaces: true,
            useTabStops: true,
            tabSize,
            detectIndentation: false,
            automaticLayout,
            readOnly,
            contextmenu,
            stickyScroll: { enabled: false },
        });


        if (focus) monacoEditorInstance.current.focus();

        if (onEditorReady) {
            onEditorReady({
                editor: monacoEditorInstance.current,
                monaco,
                setFontSize: (newFontSize) =>
                    monacoEditorInstance.current.updateOptions({ fontSize: newFontSize }),
                getFontSize: () =>
                    monacoEditorInstance.current.getOption(monaco.editor.EditorOption.fontSize),
                refresh: () => monacoEditorInstance.current.layout(),
                setValue: (newValue) => {
                    const editor = monacoEditorInstance.current;
                    const pos = editor.getPosition();
                    const sel = editor.getSelection();
                    editor.setValue(newValue);
                    sel ? editor.setSelection(sel) : pos && editor.setPosition(pos);
                },
                getValue: () => monacoEditorInstance.current.getValue(),
                focus: () => monacoEditorInstance.current.focus(),
                setPosition: (lineNumber, column = 1) => {
                    monacoEditorInstance.current.revealLineNearTop(lineNumber);
                    monacoEditorInstance.current.setPosition({ lineNumber, column });
                },
                setPosition2: (lineNumber, column = 1) => {
                    monacoEditorInstance.current.revealLineInCenterIfOutsideViewport(lineNumber);
                    monacoEditorInstance.current.setPosition({ lineNumber, column });
                },
                getValidationResult: () => {
                    const model = monacoEditorInstance.current.getModel();
                    if (!model) return { valid: true, errors: [] };

                    // Get markers (AJV/Monaco validation results)
                    const markers = monaco.editor.getModelMarkers({ resource: model.uri });

                    if (markers.length === 0) {
                        return { valid: true, errors: [] };
                    }

                    // Map markers into simple errors
                    const errors = markers.map(m => ({
                        message: m.message,
                        line: m.startLineNumber,
                        column: m.startColumn
                    }));

                    return { valid: false, errors };
                }

            });
        }



        // Content change handler
        monacoEditorInstance.current.onDidChangeModelContent(() => {
            const newValue = monacoEditorInstance.current.getValue();
            onDidChangeModelContent && onDidChangeModelContent(newValue);
        });

        // Cursor position handler
        monacoEditorInstance.current.onDidChangeCursorPosition((e) => {
            onDidChangeCursorPosition && onDidChangeCursorPosition(e.position.lineNumber, e.position.column);
        });


        const editor = monacoEditorInstance.current;
        const model = editor.getModel();
        const modelUriStr = model.uri.toString();


        const disposeMarkers = monaco.editor.onDidChangeMarkers((uris) => {
            if (!model) return;
            if (!uris.some(u => u.toString() === modelUriStr)) return;

            const markers = monaco.editor.getModelMarkers({ resource: model.uri });
            onDidChangeMarkers && onDidChangeMarkers(markers);
        });

        electronAPI.onTabKeyDown((keyEvent) => {
            const editor = monacoEditorInstance.current;
            if (!editor) return;

            const sel = editor.getSelection();
            const hasSelection = sel && !sel.isEmpty();

            if (hasSelection) {
                if (keyEvent.shift) {
                    editor.trigger('keyboard', 'editor.action.outdentLines', {});
                } else {
                    editor.trigger('keyboard', 'editor.action.indentLines', {});
                }
            } else {
                if (keyEvent.shift) {
                    editor.trigger('keyboard', 'editor.action.outdentLines', {});
                } else {
                    const spaces = ' '.repeat(tabSize);
                    editor.trigger('keyboard', 'type', { text: spaces });
                }
            }

            editor.focus();
        });


        return () => {
            const editor = monacoEditorInstance.current;
            if (editor) {
                const model = editor.getModel();
                editor.dispose();
                model?.dispose();
            }

            disposeMarkers?.dispose();
        };
    }, []);

    // Enable/disable Tab key hooks
    useEffect(() => {
        if (!enableKeyHooks) return;
        const enable = async () => electronAPI.saAddKeyDownEvent(['Tab']);
        const disable = async () => electronAPI.saDeleteKeyDownEvent();
        enable();
        return () => { disable(); };
    }, [enableKeyHooks]);

    return <div ref={editorRef} style={{ width: '100%', height: '100%' }} />;
};