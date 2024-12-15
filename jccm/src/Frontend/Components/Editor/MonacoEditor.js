import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor'; // Import Monaco directly
import { TabFocus } from 'monaco-editor/esm/vs/editor/browser/config/tabFocus';

import { throttle } from 'lodash'; // Use lodash for throttling
import useStore from '../../Common/StateStore'; // Import the custom hook to access the store

const { electronAPI } = window;

export const MonacoEditor = ({
    text,
    fontSize = 12,
    onDidChangeCursorPosition,
    onDidChangeModelContent,
    onEditorReady,
    tabSize = 2,
}) => {
    const editorRef = useRef(null);
    const monacoEditorInstance = useRef(null);

    useEffect(() => {
        if (editorRef.current) {
            // Initialize Monaco Editor
            monacoEditorInstance.current = monaco.editor.create(editorRef.current, {
                value: text,
                language: 'yaml',
                theme: 'vs-dark',
                fontSize,
                minimap: { enabled: true },
                insertSpaces: true,
                tabSize: tabSize,
                detectIndentation: false,
                automaticLayout: false,
            });

            monacoEditorInstance.current.focus();

            if (onEditorReady) {
                onEditorReady({
                    setValue: (newValue) => monacoEditorInstance.current.setValue(newValue),
                    getValue: () => monacoEditorInstance.current.getValue(),
                    focus: () => monacoEditorInstance.current.focus(),
                    setPosition: (lineNumber, column) =>
                        monacoEditorInstance.current.setPosition({ lineNumber, column }),
                });
            }

            monacoEditorInstance.current.onDidChangeModelContent(() => {
                const newValue = monacoEditorInstance.current.getValue();
                if (onDidChangeModelContent) {
                    onDidChangeModelContent(newValue);
                }
            });

            monacoEditorInstance.current.onDidChangeCursorPosition((e) => {
                const position = e.position;
                if (onDidChangeCursorPosition) {
                    onDidChangeCursorPosition(position.lineNumber, position.column);
                }
            });

            electronAPI.onTabKeyDown(() => {
                if (monacoEditorInstance.current) {
                    const editor = monacoEditorInstance.current;
                    const spaces = ' '.repeat(tabSize);
                    const position = editor.getPosition();

                    if (!position) {
                        return;
                    }

                    editor.executeEdits('', [
                        {
                            range: new monaco.Range(
                                position.lineNumber,
                                position.column,
                                position.lineNumber,
                                position.column
                            ),
                            text: spaces,
                        },
                    ]);

                    editor.setPosition({
                        lineNumber: position.lineNumber,
                        column: position.column + spaces.length,
                    });
                    editor.focus();
                }
            });

            return () => {
                if (monacoEditorInstance.current) {
                    monacoEditorInstance.current.dispose();
                }
            };
        }
    }, []);

    useEffect(() => {
        const enableTabKeyEventCapture = async () => {
            await electronAPI.saAddTabKeyDownEvent();
        };
        const disableTabKeyEventCapture = async () => {
            await electronAPI.saDeleteTabKeyDownEvent();
        };

        enableTabKeyEventCapture();

        return () => {
            disableTabKeyEventCapture();
        };
    }, []);

    return (
        <div
            ref={editorRef}
            style={{
                width: '100%',
                height: '100%',
            }}
        />
    );
};
