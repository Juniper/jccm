import React, { useEffect, useRef, useState } from 'react';

import {
    Menu,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
    MenuDivider,
    MenuGroup,
    MenuGroupHeader,
    MenuButton,
    Text,
} from '@fluentui/react-components';

import {
    bundleIcon,
    ClipboardPasteFilled,
    ClipboardPasteRegular,
    CopySelectFilled,
    CopySelectRegular,
    ClipboardTaskAddFilled,
    ClipboardTaskAddRegular,
    ClipboardSettingsFilled,
    ClipboardSettingsRegular,
    ClipboardBrushFilled,
    ClipboardBrushRegular,
    CircleSmallFilled,
    CircleSmallRegular,
    CircleEditRegular,
    EditRegular,
    CircleEditFilled,
    EditFilled,
    PlayCircleRegular,
    PlayRegular,
    NumberSymbolSquareRegular,
    NumberSymbolSquareFilled,
    CircleRegular,
    ChevronCircleRightFilled,
} from '@fluentui/react-icons';

import * as monaco from 'monaco-editor'; // Import Monaco directly
import { TabFocus } from 'monaco-editor/esm/vs/editor/browser/config/tabFocus';

import { throttle } from 'lodash'; // Use lodash for throttling
import useStore from '../../Common/StateStore'; // Import the custom hook to access the store
import { useContextMenu } from '../../Common/ContextMenuContext';

import xml2js from 'xml2js';

const { electronAPI } = window;

const CopySelect = bundleIcon(CopySelectFilled, CopySelectRegular);
const GotoIcon = bundleIcon(PlayCircleRegular, CircleSmallRegular);

monaco.languages.register({ id: 'junos' });

monaco.languages.setMonarchTokensProvider('junos', {
    defaultToken: '',
    tokenPostfix: '.junos',

    tokenizer: {
        root: [
            [/\b[a-z]+-\d+\/\d+\/\d+(?:[:]\d+)?([.]\d+)?\b/, 'junos-interface'],
            [
                /\b(?:cbp\d+|demux0|dsc|em\d+|esi|fti\d+|vme|fxp\d+|gre|ipip|jsrv|cbp0|bme(?:\d+)?)(?:[.]\d+)?\b/,
                'junos-interface',
            ],
            [
                /\b(?:irb(?:\d+)?|lo0|lsi|mif|mtun|pimd|pime|pip0|pp0|ps\d+|rbeb|tap(?!-)|vtep)(?:[.]\d+)?\b/,
                'junos-interface',
            ],
            [/\b([a-fA-F0-9]{2}:){5}[a-fA-F0-9]{2}\b/, 'junos-mac'],
            [/\b([0-9]{2}:){1,2}[0-9]{2}\b/, 'junos-time'],
            [/\b[0-9]{4}-[0-9]{2}-[0-9]{2}\b/, 'junos-date'],
            [/\b([0-9]{1,3}\.){3}[0-9]{1,3}(\/[0-9]{1,2})?\b/, 'junos-v4network'],
            [/\b(:?[a-fA-F0-9]{1,4}::?[a-fA-F0-9]{0,4}){1,7}(:[a-fA-F0-9]{1,4})?(\/[0-9]{1,3})?\b/, 'junos-v6network'],
            [/"[^"]*"/, 'junos-string'],
            [/\s[\s\d]+[\s;,]|\([\s\d]+[\s]|>\d+<|0x\d+/g, 'junos-number'],
            [/;$/, 'junos-eol'],
            [/#.*$/, 'junos-comments'],
            [/\/\*[\s\S]*?\*\//, 'junos-comments'],
            [/[{}]/, '@brackets'],
            [/target:[\d.:]+/, 'junos-vrf-target'],
        ],
    },
});

monaco.languages.setLanguageConfiguration('junos', {
    brackets: [['{', '}']], // Recognize { and } as matching pairs
    autoClosingPairs: [
        { open: '{', close: '}' }, // Automatically close braces
        { open: '"', close: '"' },
        { open: "'", close: "'" },
    ],
    surroundingPairs: [
        { open: '{', close: '}' }, // Allow wrapping selection with braces
        { open: '"', close: '"' },
        { open: "'", close: "'" },
    ],
});

monaco.editor.defineTheme('junosTheme', {
    base: 'vs-dark', // Base theme set to dark
    inherit: false, // Override base settings
    rules: [
        { token: 'junos-comments', foreground: '6A9955', fontStyle: 'italic' }, // Green for comments
        { token: 'junos-vrf-target', foreground: 'C586C0', fontStyle: 'italic bold' }, // Light purple for vrf-target
        { token: 'junos-interface', foreground: '9CDCFE' }, // Light blue for identifiers
        { token: 'junos-mac', foreground: 'D7BA7D' }, // Brown for MAC addresses
        { token: 'junos-time', foreground: 'DCDCAA' }, // Yellow for time
        { token: 'junos-date', foreground: 'DCDCAA' }, // Yellow for dates
        { token: 'junos-v4network', foreground: '4EC9B0' }, // Aqua for IPv4
        { token: 'junos-v6network', foreground: 'B8D7A3' }, // Mint green for IPv6
        { token: 'junos-string', foreground: 'CE9178' }, // Orange for strings
        { token: 'junos-number', foreground: 'B5CEA8' }, // Light green for numbers
        { token: 'junos-eol', foreground: '9CDCFE' }, // Light blue for special characters
        { token: 'brackets', foreground: 'FFD700', fontStyle: 'bold' }, // Golden yellow for brackets
    ],
    encodedTokensColors: [],
    colors: {
        'editor.background': '#1E1E1E', // Set editor background to dark gray
        'editor.foreground': '#D4D4D4', // Default text color (light gray)
        'editor.lineHighlightBackground': '#2A2A2A', // Line highlight background
        'editorCursor.foreground': '#AEAFAD', // Cursor color (light gray)
        'editor.selectionBackground': '#264F78', // Selection background color
        'editorWhitespace.foreground': '#404040', // Whitespace visibility
        'editorIndentGuide.background': '#404040', // Indentation guides

        // Hover Widget Customization
        'editorHoverWidget.background': '#FFFFFF', // White background for hover widget
        'editorHoverWidget.foreground': '#1E1E1E', // Dark gray text for hover widget
        'editorHoverWidget.border': '#CCCCCC', // Light gray border for hover widget
        'editorHoverWidgetHighlight.foreground': '#007ACC', // Blue for highlighted text in hover widget
    },
});

const parser = new xml2js.Parser({
    explicitArray: false, // Avoid wrapping values in arrays
    explicitChildren: false, // Do not include children under '_'
    preserveChildrenOrder: true, // Maintain the XML structure order
    mergeAttrs: true, // Merge attributes into the same object
});

const getRpcReply = (rpcName, data) => {
    // Escape any special characters in rpcName to safely include it in the regex
    const escapedRpcName = rpcName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Construct the regex pattern dynamically using the escaped rpcName variable
    const regex = new RegExp(`<${escapedRpcName}[\\s\\S]*?<\\/${escapedRpcName}>`, 'gi');
    const match = regex.exec(data);
    if (match !== null) {
        return match[0];
    }
    return null;
};

const getWholeTokenForInterfaceNameAtPosition = (model, position) => {
    const lineContent = model.getLineContent(position.lineNumber); // Get the entire line content
    const column = position.column; // Current column number (1-based index)

    // Unified regex pattern to match all possible interface names
    const regex =
        /\b(?:[a-z]+-\d+\/\d+\/\d+(?::\d+)?(?:\.\d+)?|cbp\d+|demux0|dsc|em\d+|esi|fti\d+|vme|fxp\d+|gre|ipip|jsrv|cbp0|bme(?:\d+)?|irb(?:\d+)?|lo0|lsi|mif|mtun|pimd|pime|pip0|pp0|ps\d+|rbeb|tap(?!-)|vtep)(?:\.\d+)?\b/g;

    let match;
    while ((match = regex.exec(lineContent)) !== null) {
        const start = match.index + 1; // 1-based column number of the match start
        const end = start + match[0].length - 1; // 1-based column number of the match end

        if (column >= start && column <= end) {
            return {
                word: match[0], // The matched word (e.g., xe-0/0/0:1)
                startColumn: start,
                endColumn: end,
            };
        }
    }

    return null; // No matching token found at the position
};

// Register hover provider for 'junos-interface' token

monaco.languages.registerHoverProvider('junos', {
    provideHover: async (model, position) => {
        const token = getWholeTokenForInterfaceNameAtPosition(model, position); // Get the whole token at the position

        if (token) {
            const interfaceName = token.word;

            // Access Zustand state
            const id = useStore.getState().selectedTabValue;

            const rpc = `<get-interface-information>
                            <media/>
                            <terse/>
                            <interface-name>${interfaceName}</interface-name>
                        </get-interface-information>`;

            const response = await electronAPI.rpcRequestConfigTracking({ id, rpc });

            const rpcReply = getRpcReply('physical-interface', response);

            let adminStatus = 'unknown';
            let operStatus = 'unknown';
            let contents = [];

            if (rpcReply !== null) {
                try {
                    const parsedData = await parser.parseStringPromise(rpcReply);

                    const physicalInterface = parsedData?.['physical-interface'] ?? {};

                    adminStatus = physicalInterface['admin-status']?.trim() ?? 'unknown';
                    operStatus = physicalInterface['oper-status']?.trim() ?? 'unknown';

                    contents = [
                        `### Junos Interface`,
                        `Interface: **${interfaceName}**`,
                        `Admin Status: **${adminStatus}**\nOperational Status: **${operStatus}**`,
                    ];
                } catch (error) {
                    console.error('Error parsing RPC reply:', error.message);
                    contents = [
                        `### Junos Interface`,
                        `Error: Failed to parse interface information for **${interfaceName}**`,
                    ];
                }
            } else {
                contents = [`### Junos Interface`, `**${interfaceName}** does not exist on the device.`];
            }

            return {
                range: new monaco.Range(position.lineNumber, token.startColumn, position.lineNumber, token.endColumn),
                contents: contents.map((line) => ({ value: line })),
            };
        }

        return null; // No hover content
    },
});

export const MonacoEditorForConfigTracking = ({
    text = '',
    defaultFontSize = 12,
    onDidChangeCursorPosition,
    onDidChangeModelContent,
    onEditorReady,
    tabSize = 2,
    focus = true,
    theme = 'vs-dark',
    language = 'yaml',
    automaticLayout = true,
    readOnly = false,
    enableKeyHooks = true,
    navigationMap = [],
    contextmenu = true,
    device,
}) => {
    const { showContextMenu } = useContextMenu(); // Use the context menu
    const [menuVisible, setMenuVisible] = useState(false);
    const editorRef = useRef(null);
    const monacoEditorInstance = useRef(null);
    const navigationMapRef = useRef(navigationMap); // Ref for navigationMap

    // Keep the navigationMapRef updated with the latest value
    useEffect(() => {
        navigationMapRef.current = navigationMap;
    }, [navigationMap]);

    const handleGotoLine = (editor, lineNumber) => {
        // editor.revealLineInCenter(lineNumber);
        editor.revealLineNearTop(lineNumber);
        editor.setPosition({ lineNumber, column: 1 });
        editor.focus();
    };

    const menuContent = (event, editor, navigationMap) => (
        <MenuList>
            <MenuGroup>
                <MenuGroupHeader>Clipboard</MenuGroupHeader>
                <MenuItem
                    disabled={editor.getSelection()?.isEmpty()}
                    key='copy'
                    icon={<CopySelect fontSize='16px' />}
                    onClick={() => {
                        const selection = editor.getSelection(); // Get the current selection
                        const model = editor.getModel(); // Get the editor's model

                        if (selection && model) {
                            const selectedText = model.getValueInRange(selection); // Get the selected text
                            navigator.clipboard
                                .writeText(selectedText)
                                .then(() => console.log('Text copied to clipboard:'))
                                .catch((err) => console.error('Failed to copy text:', err));
                        } else {
                            console.log('No text selected');
                        }
                    }}
                >
                    <Text size={200}>Copy</Text>
                </MenuItem>
                <MenuDivider />
                <MenuGroupHeader>Go to Config Block</MenuGroupHeader>

                {navigationMap.map((rootKey) =>
                    rootKey.children.length > 0 ? (
                        <Menu key={`root-${rootKey.key}`} positioning={{ autoSize: true }}>
                            <MenuTrigger disableButtonEnhancement>
                                <MenuItem
                                    key={rootKey.row}
                                    icon={<GotoIcon fontSize='16px' />}
                                    onClick={() => handleGotoLine(editor, rootKey.row)}
                                >
                                    <Text size={200}>{rootKey.key}</Text>
                                </MenuItem>
                            </MenuTrigger>

                            <MenuPopover>
                                <MenuList>
                                    {rootKey.children.map((childKey) => (
                                        <MenuItem
                                            key={childKey.row}
                                            onClick={() => handleGotoLine(editor, childKey.row)}
                                        >
                                            <Text size={200}>{childKey.key}</Text>
                                        </MenuItem>
                                    ))}
                                </MenuList>
                            </MenuPopover>
                        </Menu>
                    ) : (
                        <MenuItem
                            key={`root-${rootKey.key}`}
                            icon={<GotoIcon fontSize='16px' />}
                            onClick={() => handleGotoLine(editor, rootKey.row)}
                        >
                            <Text size={200}>{rootKey.key}</Text>
                        </MenuItem>
                    )
                )}
            </MenuGroup>
        </MenuList>
    );

    useEffect(() => {
        if (editorRef.current) {
            // Initialize Monaco Editor
            monacoEditorInstance.current = monaco.editor.create(editorRef.current, {
                value: text,
                language,
                theme,
                fontSize: defaultFontSize,
                minimap: { enabled: true },
                insertSpaces: true,
                tabSize,
                detectIndentation: false,
                automaticLayout,
                readOnly,
                contextmenu,
                stickyScroll: {
                    enabled: false, // Disable Sticky Scroll
                },
                // renderLineHighlight: 'all',
            });

            // Attach right-click event listener
            const handleContextMenu = (e) => {
                e.preventDefault();
                const currentNavigationMap = navigationMapRef.current;

                showContextMenu(
                    e.clientX,
                    e.clientY,
                    menuContent(e, monacoEditorInstance.current, currentNavigationMap)
                );
            };

            if (!contextmenu) {
                editorRef.current.addEventListener('contextmenu', handleContextMenu);
            }

            focus && monacoEditorInstance.current.focus();

            if (onEditorReady) {
                onEditorReady({
                    editor: monacoEditorInstance.current, // Pass the editor instance
                    monaco: monaco, // Pass the monaco object
                    setFontSize: (newFontSize) => {
                        monacoEditorInstance.current.updateOptions({ fontSize: newFontSize });
                    },
                    getFontSize: () => {
                        return monacoEditorInstance.current.getOption(monaco.editor.EditorOption.fontSize);
                    },
                    refresh: () => monacoEditorInstance.current.layout(),
                    setValue: (newValue) => {
                        const editor = monacoEditorInstance.current;
                        const currentPosition = editor.getPosition(); // Get current cursor position
                        const currentSelection = editor.getSelection(); // Get current selection (if any)

                        editor.setValue(newValue); // Update the editor value

                        if (currentSelection) {
                            // Restore selection
                            editor.setSelection(currentSelection);
                        } else if (currentPosition) {
                            // Restore cursor position
                            editor.setPosition(currentPosition);
                        }
                    },
                    getValue: () => monacoEditorInstance.current.getValue(),
                    focus: () => monacoEditorInstance.current.focus(),
                    setPosition: (lineNumber, column = 1) => {
                        monacoEditorInstance.current.revealLineNearTop(lineNumber);
                        monacoEditorInstance.current.setPosition({ lineNumber, column });
                    },
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
                if (editorRef.current) {
                    !contextmenu && editorRef.current.removeEventListener('contextmenu', handleContextMenu);
                }
                if (monacoEditorInstance.current) {
                    monacoEditorInstance.current.dispose();
                }
            };
        }
    }, []);

    useEffect(() => {
        if (enableKeyHooks) {
            const enableTabKeyEventCapture = async () => {
                await electronAPI.saAddKeyDownEvent(['Tab']);
            };
            const disableTabKeyEventCapture = async () => {
                await electronAPI.saDeleteKeyDownEvent();
            };

            enableTabKeyEventCapture();

            return () => {
                disableTabKeyEventCapture();
            };
        }
    }, []);

    return (
        <div
            ref={editorRef}
            style={{
                width: '100%',
                height: '100%',
            }}
        >
            {/* {menuVisible && renderMenu()} */}
        </div>
    );
};
