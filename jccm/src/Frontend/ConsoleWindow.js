import React, { useEffect, useState, useRef } from 'react';

import {
    Button,
    Text,
    Tooltip,
    Divider,
    tokens,
} from '@fluentui/react-components';

import {
    CircleEraserRegular,
    CircleEraserFilled,
    CopyRegular,
    CopyFilled,
    DismissCircleRegular,
    DismissCircleFilled,
    bundleIcon,
} from '@fluentui/react-icons';

import { JSONTree, bright } from 'react-json-tree';
import { HeaderSpaceHeight } from './Common/CommonVariables';

import useStore from './Common/StateStore';

const { electronAPI } = window;
const EraserIcon = bundleIcon(CircleEraserFilled, CircleEraserRegular);
const CopyIcon = bundleIcon(CopyFilled, CopyRegular);
const DismissIcon = bundleIcon(DismissCircleFilled, DismissCircleRegular);

const theme = {
    base00: '#272822',
    base01: '#383830',
    base02: '#49483e',
    base03: '#75715e',
    base04: '#a59f85',
    base05: '#f8f8f2',
    base06: '#f5f4f1',
    base07: '#f9f8f5',
    base08: '#f92672',
    base09: '#fd971f',
    base0A: '#f4bf75',
    base0B: '#a6e22e',
    base0C: '#a1efe4',
    base0D: '#66d9ef',
    base0E: '#ae81ff',
    base0F: '#cc6633',
};

export const ConsoleWindow = () => {
    const { setConsoleWindowOpen } = useStore();
    const [consoleWindowContents, setConsoleWindowContents] = useState([]);
    const consoleWindowRef = useRef(null);
    const [copyButtonName, setCopyButtonName] = useState('Copy');
    const [isCopyButtonClicked, setIsCopyButtonClicked] = useState(false);

    // Capture and display logs in the console window
    useEffect(() => {
        const console_logs = {
            LOG: console.log,
            ERROR: console.error,
            INFO: console.info,
        };

        // Helper function to update the log messages in the state
        const updateConsoleMessage = (type, ...args) => {
            const message = { type, args };

            // Use setTimeout to ensure the update happens after the render phase
            setTimeout(() => {
                setConsoleWindowContents((prev) => [...prev, message]);
            }, 0);
        };

        // Listen for log messages from the main process
        electronAPI.onLogMessage((data) => {
            const { type, args } = data || {};
            const capitalType = type.toUpperCase();

            if (type && args) {
                console_logs[capitalType](...args);
                updateConsoleMessage(capitalType, ...args);
            } else {
                console.error('Received invalid log message:', data);
            }
        });

        return () => {};
    }, []);

    // Auto-scroll when consoleWindowContents changes
    useEffect(() => {
        if (consoleWindowRef.current) {
            consoleWindowRef.current.scrollTop =
                consoleWindowRef.current.scrollHeight;
        }
    }, [consoleWindowContents]);

    const copyConsoleWindowContents = () => {
        if (!isCopyButtonClicked && consoleWindowContents.length > 0) {
            setIsCopyButtonClicked(true);

            const logs = consoleWindowContents
                .map(
                    (log) =>
                        `${log.type}: ${log.args
                            .map((arg) =>
                                typeof arg === 'object'
                                    ? `\n${JSON.stringify(arg, null, 2)}\n`
                                    : arg
                            )
                            .join(' ')}`
                )
                .join('\n');

            navigator.clipboard
                .writeText(logs)
                .then(() => {
                    setCopyButtonName('Copied!');
                    setTimeout(() => {
                        setCopyButtonName('Copy');
                        setIsCopyButtonClicked(false);
                    }, 2000);
                })
                .catch((err) => {});
        }
    };

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    zIndex: 1000002, // Ensures it stays above other elements
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        width: '100%',
                        //     height: `${HeaderSpaceHeight+4}px`,
                        height: `${30}px`,
                        overflow: 'hidden',
                        backgroundColor: tokens.colorNeutralBackground1Selected,
                        zIndex: 1000002, // Ensures it stays above other elements
                    }}
                >
                    <Button
                        disabled={consoleWindowContents.length === 0}
                        icon={<EraserIcon fontSize='14px' />}
                        size='small'
                        appearance='transparent'
                        shape='circular'
                        style={{ marginRight: '10px' }}
                        onClick={() => setConsoleWindowContents([])}
                    >
                        Erase
                    </Button>
                    <Button
                        disabled={consoleWindowContents.length === 0}
                        icon={<CopyIcon fontSize='16px' />}
                        size='small'
                        appearance='transparent'
                        shape='circular'
                        style={{ marginRight: '10px' }}
                        onClick={() => {
                            copyConsoleWindowContents();
                        }}
                    >
                        <Text
                            size={200}
                            weight={isCopyButtonClicked ? 'bold' : 'regular'}
                        >
                            {copyButtonName}
                        </Text>
                    </Button>
                    <Button
                        icon={<DismissIcon fontSize='16px' />}
                        size='small'
                        appearance='transparent'
                        shape='circular'
                        style={{ marginRight: '10px' }}
                        onClick={() => {
                            setConsoleWindowOpen(false);
                        }}
                    >
                        Close
                    </Button>
                </div>
                <div
                    ref={consoleWindowRef}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        height: '100%',
                        overflowX: 'hidden',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        fontSize: '10px',
                        fontFamily: 'Consolas, monospace', // Consolas prioritized, fallbacks if unavailable
                        lineHeight: '1.5',
                        marginBottom: '20px',
                        paddingLeft: '5px',
                    }}
                >
                    {consoleWindowContents.map((log, index) => (
                        <div key={index} style={{ marginBottom: '10px' }}>
                            {index > 0 && (
                                <div
                                    style={{
                                        width: '100%',
                                        marginBottom: '10px',
                                        padding: 0,
                                    }}
                                >
                                    <Divider appearance='default' />
                                </div>
                            )}
                            <strong>{log.type}: </strong>

                            {log.args.map((arg, idx) =>
                                typeof arg === 'object' ? (
                                    <JSONTree
                                        key={idx}
                                        data={arg}
                                        theme={theme}
                                        invertTheme={true}
                                        hideRoot={true}
                                        shouldExpandNodeInitially={(
                                            keyPath,
                                            data,
                                            level
                                        ) => {
                                            return level > 2;
                                        }}
                                    />
                                ) : (
                                    <span key={idx}>{String(arg)}</span>
                                )
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};
