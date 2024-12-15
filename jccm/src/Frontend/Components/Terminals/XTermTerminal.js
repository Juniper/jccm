import React, { useEffect, useRef, useState, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { v4 as uuidv4 } from 'uuid';

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
    Tooltip,
    Text,
    tokens,
} from '@fluentui/react-components';

import {
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
    bundleIcon,
    CircleSmallFilled,
    CircleSmallRegular,
} from '@fluentui/react-icons';

const { electronAPI } = window;

import useStore from '../../Common/StateStore'; // Adjust the import path as per your project structure
import { useContextMenu } from '../../Common/ContextMenuContext';

const ClipboardPaste = bundleIcon(ClipboardPasteFilled, ClipboardPasteRegular);
const CopySelect = bundleIcon(CopySelectFilled, CopySelectRegular);
const ClipboardTaskAdd = bundleIcon(ClipboardTaskAddFilled, ClipboardTaskAddRegular);
const ClipboardSettings = bundleIcon(ClipboardSettingsFilled, ClipboardSettingsRegular);
const ClipboardBrush = bundleIcon(ClipboardBrushFilled, ClipboardBrushRegular);
const CommandIcon = bundleIcon(CircleSmallFilled, CircleSmallRegular);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const XTermTerminal = ({ device }) => {
    const { showContextMenu } = useContextMenu(); // Use the context menu
    const { adoptConfig, setAdoptConfig } = useStore();
    const { isPasteDisabled, setIsPasteDisabled } = useStore();
    const { cliShortcutMapping } = useStore();
    const { setTab } = useStore();

    const { selectedTabValue } = useStore();
    const getLocalStorageKey = (deviceKey) => `${uniqueSessionId}/${deviceKey}/isEditing`;
    const setIsEditing = (deviceKey, value) => {
        localStorage.setItem(getLocalStorageKey(deviceKey), JSON.stringify(value));
    };
    const getIsEditing = (deviceKey) => {
        return JSON.parse(localStorage.getItem(getLocalStorageKey(deviceKey)));
    };
    const [isJunos, setIsJunos] = useState(false);
    const [isConfigurationMode, setIsConfigurationMode] = useState(false);
    const [uniqueSessionId] = useState(uuidv4()); // Generates a unique ID for each component instance
    const containerRef = useRef(null);
    const terminalRef = useRef(null);
    const fitAddonRef = useRef(null);

    const deviceKey = device?.path;

    const handleResize = useCallback(
        debounce(() => {
            if (fitAddonRef.current) {
                fitAddonRef.current.fit();
            }
        }, 100),
        []
    );

    useEffect(() => {
        if (terminalRef.current && selectedTabValue === deviceKey) {
            terminalRef.current.focus();
        }
    }, [selectedTabValue]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            electronAPI.disconnectSSHSession(deviceKey);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [deviceKey]);

    useEffect(() => {
        if (containerRef.current && !terminalRef.current && !fitAddonRef.current) {
            const terminal = new Terminal({ fontSize: 14 });
            const fitAddon = new FitAddon();

            terminalRef.current = terminal;
            fitAddonRef.current = fitAddon;

            terminal.loadAddon(fitAddon);
            terminal.open(containerRef.current);

            fitAddonRef.current.fit();
            terminal.focus();

            terminal.attachCustomKeyEventHandler((event) => {
                if (event.key === 'Tab') {
                    event.preventDefault();
                    terminalRef.current.focus();
                }
                return true;
            });

            terminal.onResize(({ cols, rows }) => {
                electronAPI.resizeSSHSession(deviceKey, { cols, rows });
            });

            const { cols, rows } = terminal;

            electronAPI.startSSHConnection({ id: deviceKey, cols, rows });

            let checkForOSVersion = true;

            electronAPI.sshSessionOpened(({ id }) => {
                if (id === deviceKey) {
                    console.log(`Connected to server for device: ${deviceKey}.`);
                    terminalRef.current.writeln('Connected to device.');

                    checkForOSVersion = true;
                    setTimeout(() => {
                        checkForOSVersion = false;
                    }, 3000);
                }
            });

            electronAPI.onSSHDataReceived(({ id, data }) => {
                if (id === deviceKey) {
                    terminalRef.current.write(data);

                    // Check for the OS version pattern but only within 1 second of connection
                    if (checkForOSVersion && data.includes('--- JUNOS ')) {
                        console.log('Detected Junos OS version in response.');
                        setIsJunos(true);
                        setTab(deviceKey, { isJunos: true });
                    }
                    if (data.includes('Entering configuration mode')) {
                        console.log('Detected Junos OS entering configuration mode.');
                        setIsConfigurationMode(true);
                        setTab(deviceKey, { isJunosConfigMode: true });
                    } else if (data.includes('Exiting configuration mode')) {
                        console.log('Detected Junos OS exiting configuration mode.');
                        setIsConfigurationMode(false);
                        setTab(deviceKey, { isJunosConfigMode: false });
                    }

                    if (
                        data.includes('Users currently editing the configuration:') &&
                        data.includes('exclusive [edit]')
                    ) {
                        console.log('Exclusive Editing configuration detected.');
                        setIsEditing(deviceKey, true);
                    }
                }
            });

            electronAPI.onSSHErrorOccurred(({ id, message }) => {
                if (id === deviceKey) {
                    console.error(`SSH Error: ${message}`);
                    terminalRef.current.writeln(`Error: ${message}`);
                }
            });

            electronAPI.onSSHSessionClosed(({ id }) => {
                if (id === deviceKey) {
                    console.log(`SSH session closed for device: ${deviceKey}.`);
                    terminalRef.current.writeln('Disconnected from device.');
                }
            });

            terminal.onData((data) => {
                electronAPI.sendSSHInput(deviceKey, data);
            });

            window.addEventListener('resize', handleResize);

            // Observe changes to the container div size
            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(containerRef.current);

            return () => {
                console.log('Cleaning up terminal...');
                electronAPI.disconnectSSHSession(deviceKey);
                window.removeEventListener('resize', handleResize);
                localStorage.removeItem(getLocalStorageKey(deviceKey));
                terminalRef.current.dispose();
            };
        }
    }, []);

    const copySelectedTextToClipboard = () => {
        const selection = terminalRef.current.getSelection();
        if (selection) {
            navigator.clipboard
                .writeText(selection)
                .then(() => {
                    console.log('Text copied to clipboard');
                    setIsPasteDisabled(false);
                })
                .catch((err) => {
                    console.error('Failed to copy text: ', err);
                });
        }
    };

    const pasteFromClipboardToTerminal = () => {
        navigator.clipboard
            .readText()
            .then((text) => {
                terminalRef.current.paste(text);
            })
            .catch((err) => {
                console.error('Failed to read text from clipboard: ', err);
            });
    };

    const clearClipboard = () => {
        if (navigator.clipboard && window.isSecureContext) {
            // navigator.clipboard API is available
            navigator.clipboard.writeText('').then(
                function () {
                    console.log('Clipboard successfully cleared.');
                    setIsPasteDisabled(true);
                },
                function (err) {
                    console.error('Could not clear clipboard: ', err);
                }
            );
        } else {
            // Clipboard API not available, consider fallback or inform the user
            console.log('Clipboard API not available.');
        }
    };

    const ShortcutDisplay = (action) => {
        const getOperatingSystem = () => {
            let userAgent =
                navigator.userAgentData?.platform || navigator.userAgent || navigator.vendor || window.opera;
            userAgent = userAgent.toLowerCase();

            if (userAgent.includes('win')) {
                return 'Windows';
            } else if (userAgent.includes('linux')) {
                return 'Linux';
            } else if (userAgent.includes('mac')) {
                return 'macOS';
            } else {
                return 'Unknown';
            }
        };

        const os = getOperatingSystem();
        if (os == 'macOS') {
            return action === 'copy' ? '⌘ C' : '⌘ V';
        } else {
            return action === 'copy' ? 'Ctrl C' : 'Ctrl V';
        }
    };

    const checkIsEditing = async () => {
        setIsEditing(deviceKey, false);

        if (terminalRef.current) {
            terminalRef.current.paste('# Checking if configuraton database is locked?\n\n\n');

            if (isJunos && isConfigurationMode) {
                terminalRef.current.paste('exit\nconfigure\n');
            } else if (isJunos && !isConfigurationMode) {
                terminalRef.current.paste('configure\n');
                terminalRef.current.paste('exit\n');
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        const result = getIsEditing(deviceKey);
        if (result) {
            terminalRef.current.paste(
                '# The configuration database is currently locked. Please wait for the existing lock to be released before proceeding.\n'
            );
        } else {
            terminalRef.current.paste(
                '# The configuration database is available and ready to accept new configurations.\n'
            );
        }
        return result;
    };

    const menuContent = (event, terminal) => (
        <MenuList>
            <MenuGroup>
                <MenuGroupHeader>Plain Clipboard</MenuGroupHeader>
                <MenuItem
                    disabled={!(terminal.getSelection().length > 0)}
                    onClick={() => {
                        console.log('Terminal Selection Copy');
                        copySelectedTextToClipboard();
                        terminal.focus();
                    }}
                    icon={<CopySelect />}
                    secondaryContent={ShortcutDisplay('copy')}
                >
                    Copy
                </MenuItem>
                <MenuItem
                    disabled={isPasteDisabled}
                    onClick={() => {
                        console.log('Paste text from clipboard');
                        pasteFromClipboardToTerminal();
                        terminal.focus();
                    }}
                    icon={<ClipboardPaste />}
                    secondaryContent={ShortcutDisplay('paste')}
                >
                    Paste
                </MenuItem>
                <MenuItem
                    disabled={isPasteDisabled}
                    icon={<ClipboardBrush />}
                    onClick={() => {
                        console.log('Reset Paste Content');
                        clearClipboard();
                        terminal.focus();
                    }}
                >
                    Reset Paste Content
                </MenuItem>
                <MenuDivider />
                <MenuGroupHeader>Adoption Configuration</MenuGroupHeader>
                <MenuItem
                    disabled={!(adoptConfig.length > 0)}
                    icon={<ClipboardPaste />}
                    onClick={() => {
                        console.log('paste', adoptConfig);
                        terminal.paste(`${adoptConfig}\n`);
                        terminal.focus();
                    }}
                >
                    Paste
                </MenuItem>
                <MenuItem
                    disabled={!isJunos || !(adoptConfig.length > 0)}
                    icon={<ClipboardTaskAdd />}
                    onClick={async () => {
                        const isEditing = await checkIsEditing();
                        if (!isEditing) {
                            if (!isConfigurationMode) {
                                terminal.paste('edit private\n');
                                terminal.paste(`${adoptConfig}\n`);
                                terminal.paste('commit and-quit\n');
                            } else {
                                terminal.paste(`${adoptConfig}\n`);
                                terminal.paste('commit\n');
                            }
                        }
                        terminal.focus();
                    }}
                >
                    Smart Paste
                </MenuItem>
                <MenuItem
                    disabled={!isJunos || !(adoptConfig.length > 0)}
                    icon={<ClipboardSettings />}
                    onClick={async () => {
                        const isEditing = await checkIsEditing();
                        if (!isEditing) {
                            if (!isConfigurationMode) {
                                terminal.paste('edit private\n');
                                terminal.paste('delete system services outbound-ssh\n');
                                terminal.paste(`${adoptConfig}\n`);
                                terminal.paste('commit and-quit\n');
                            } else {
                                terminal.paste('delete system services outbound-ssh\n');
                                terminal.paste(`${adoptConfig}\n`);
                                terminal.paste('commit\n');
                            }
                        }
                        terminal.focus();
                    }}
                >
                    Smart Lazy Paste (Delete and Paste)
                </MenuItem>
                <MenuItem
                    disabled={!(adoptConfig.length > 0)}
                    icon={<ClipboardBrush />}
                    onClick={() => {
                        console.log('Reset Paste Adoption Content', adoptConfig);
                        setAdoptConfig('');
                        terminal.focus();
                    }}
                >
                    <Text>Reset Paste Content</Text>
                </MenuItem>
                {Object.keys(cliShortcutMapping).length > 0 && (
                    <>
                        <MenuDivider />
                        <MenuGroupHeader>CLI Shortcuts</MenuGroupHeader>
                        {cliShortcutMapping?.mappings?.map((shortcut, index) => (
                            <MenuItem
                                disabled={!isJunos}
                                key={index} // Add a unique key to each MenuItem
                                icon={<CommandIcon />}
                                onClick={async () => {
                                    const { commands } = shortcut;

                                    const defaultDelay = 500;

                                    for (let i = 0; i < commands.length; i++) {
                                        const command = commands[i];
                                        const isLastCommand = i === commands.length - 1;
                                        const isNextCommandSleep = !isLastCommand && commands[i + 1]?.includes('sleep');

                                        if (command.startsWith('sleep')) {
                                            const parts = command.split(/\s+/);
                                            const delayValue = parseInt(parts[1], 10);

                                            if (isNaN(delayValue)) {
                                                console.error(`Invalid delay value in command: "${command}"`);
                                            } else {
                                                await delay(delayValue);
                                            }
                                        } else {
                                            if (isConfigurationMode) {
                                                terminal.paste(`run ${command}\n`);
                                            } else {
                                                terminal.paste(`${command}\n`);
                                            }

                                            // Add default delay unless the next command is a sleep or it's the last command
                                            if (!isLastCommand && !isNextCommandSleep) {
                                                await delay(defaultDelay);
                                            }
                                        }
                                    }
                                    terminal.focus();
                                }}
                            >
                                <Text size={200}>{shortcut.name}</Text>
                            </MenuItem>
                        ))}
                    </>
                )}
            </MenuGroup>
        </MenuList>
    );

    const handleRightClick = (event, terminal) => {
        event.preventDefault(); // Prevent the default context menu
        showContextMenu(event.clientX, event.clientY, menuContent(event, terminal));
    };

    return (
        <>
            <style>{`
            .xterm .xterm-viewport {
                overflow-y: hidden
            }
          `}</style>
            <div
                onContextMenu={(event) => handleRightClick(event, terminalRef.current)}
                ref={containerRef}
                style={{
                    display: 'flex',
                    flexWrap: 'nowrap',
                    overflow: 'hidden',
                    resize: 'none',
                    width: 'calc(100% - 8px)',
                    height: 'calc(100% - 8px)',
                    border: `4px solid ${tokens.colorBrandBackgroundPressed}`,
                    backgroundColor: 'black',
                }}
            />
        </>
    );
};

export default XTermTerminal;
