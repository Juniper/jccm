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

import ReactJson from '@microlink/react-json-view';
import { HeaderSpaceHeight } from './Common/CommonVariables';

import useStore from './Common/StateStore';
import eventBus from './Common/eventBus';

const { electronAPI } = window;
const EraserIcon = bundleIcon(CircleEraserFilled, CircleEraserRegular);
const CopyIcon = bundleIcon(CopyFilled, CopyRegular);
const DismissIcon = bundleIcon(DismissCircleFilled, DismissCircleRegular);

export const ConsoleWindow = () => {
    const { setConsoleWindowOpen, currentActiveThemeName } = useStore();
    const [consoleWindowContents, setConsoleWindowContents] = useState([]);
    const consoleWindowRef = useRef(null);
    const [copyButtonName, setCopyButtonName] = useState('Copy');
    const [isCopyButtonClicked, setIsCopyButtonClicked] = useState(false);

    const handleConsoleWindowReset = () => {
        console.log('Console window reset');
        setConsoleWindowContents([]);
    };

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

        eventBus.on('console-window-reset', handleConsoleWindowReset);

        return () => {
            eventBus.off('console-window-reset', handleConsoleWindowReset);
        };
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
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
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
                    marginBottom: '20px',
                    paddingLeft: '5px',

                    fontSize: '12px',
                    lineHeight: '1.5',
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
                                <ReactJson
                                    key={idx}
                                    src={arg}
                                    name={false}
                                    collapsed={true}
                                    displayDataTypes={false}
                                    quotesOnKeys={false}
                                    enableClipboard={false}
                                    theme={
                                        currentActiveThemeName
                                            .toLowerCase()
                                            .includes('dark')
                                            ? 'chalk'
                                            : 'rjv-default'
                                    }
                                    style={{
                                        fontSize: '11px',
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
    );
};
