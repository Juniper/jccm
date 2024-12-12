import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor'; // Import Monaco directly
import { throttle } from 'lodash'; // Use lodash for throttling
import useStore from '../../Common/StateStore'; // Import the custom hook to access the store

export const MonacoEditor = ({ text, fontSize = 12 }) => {
    const { deviceFacts } = useStore();
    const editorRef = useRef(null);
    const monacoEditorInstance = useRef(null); // To keep track of the Monaco editor instance

    useEffect(() => {
        if (editorRef.current) {
            // Initialize Monaco Editor directly with automatic layout disabled
            monacoEditorInstance.current = monaco.editor.create(
                editorRef.current,
                {
                    value: text,
                    language: 'yaml', // Set the language to plaintext
                    theme: 'vs-dark', // You can switch to 'vs-light' if you prefer
                    fontSize: fontSize, // Set the font size
                    autoClosingBrackets: 'always',
                    minimap: {
                        enabled: false, // Hide the minimap
                    },
                    automaticLayout: false, // Disable automatic layout to avoid ResizeObserver loop
                }
            );

            console.log('Monaco Editor initialized successfully');

            // Add custom action for "Print Selected Text"
            monacoEditorInstance.current.addAction({
                id: 'logSelectedText', // Unique action ID
                label: 'Print Selected Text', // Label shown in context menu
                contextMenuGroupId: 'navigation', // Group in context menu (leave as 'navigation')
                contextMenuOrder: 1, // Order in the context menu
                run: function (editor) {
                    const selection = editor.getSelection();
                    const selectedText = editor.getModel().getValueInRange(selection);
                    console.log('Selected Text:', selectedText);
                    return null;
                }
            });

            // Add custom action for "Print All Text"
            monacoEditorInstance.current.addAction({
                id: 'logAllText', // Unique action ID
                label: 'Print All Text', // Label shown in context menu
                contextMenuGroupId: 'navigation', // Group in context menu (leave as 'navigation')
                contextMenuOrder: 2, // Order in the context menu
                run: function (editor) {
                    const allText = editor.getModel().getValue();
                    console.log('All Text:', allText);
                    return null;
                }
            });

            // Throttled layout function to prevent excessive calls
            const throttledLayout = throttle(() => {
                if (monacoEditorInstance.current) {
                    window.requestAnimationFrame(() => {
                        console.log('Resizing Monaco Editor');
                        monacoEditorInstance.current.layout(); // Adjust the editor layout based on new dimensions
                    });
                }
            }, 100); // Throttle the callback, adjusting the delay as needed

            // Create a ResizeObserver to track the size of the div
            const resizeObserver = new ResizeObserver(() => {
                throttledLayout(); // Use the throttled function inside the observer
            });

            // Observe changes in size of the editor container div
            if (editorRef.current) {
                resizeObserver.observe(editorRef.current);
            }

            // Cleanup function to remove ResizeObserver and editor when the component unmounts
            return () => {
                if (monacoEditorInstance.current) {
                    monacoEditorInstance.current.dispose();
                }
                if (editorRef.current) {
                    resizeObserver.unobserve(editorRef.current);
                }
                resizeObserver.disconnect();
            };
        }
    }, [editorRef, fontSize, text]);

    return (
        <div
            ref={editorRef}
            style={{
                width: '100%',
                height: '100%',
                border: '1px solid black',
                flexGrow: 1,
            }}
        />
    );
};
