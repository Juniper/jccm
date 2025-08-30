import React, { useEffect, useRef, useState, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { v4 as uuidv4 } from 'uuid';
import ip from 'ip';

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
    CircleEditRegular,
    EditRegular,
    CircleEditFilled,
    EditFilled,
    PlayCircleRegular,
    PlayRegular,
} from '@fluentui/react-icons';

const { electronAPI } = window;

import useStore from '../../Common/StateStore'; // Adjust the import path as per your project structure
import { useContextMenu } from '../../Common/ContextMenuContext';
import { EditCLIShortcutsCard } from '../../Layout/CLIShortcutsCard';
import { set } from 'lodash';

const ClipboardPaste = bundleIcon(ClipboardPasteFilled, ClipboardPasteRegular);
const CopySelect = bundleIcon(CopySelectFilled, CopySelectRegular);
const ClipboardTaskAdd = bundleIcon(ClipboardTaskAddFilled, ClipboardTaskAddRegular);
const ClipboardSettings = bundleIcon(ClipboardSettingsFilled, ClipboardSettingsRegular);
const ClipboardBrush = bundleIcon(ClipboardBrushFilled, ClipboardBrushRegular);
const CommandIcon = bundleIcon(PlayCircleRegular, CircleSmallRegular);
const EditShortcutIcon = bundleIcon(CircleEditFilled, CircleEditRegular);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const applyStyle = (text, color) => {
    return `\x1b[38;5;${color}m${text}\x1b[0m`;
};

const countDoubleQuotes = (data) => {
    const matches = data.match(/"/g);
    return matches ? matches.length : 0;
};

const colorDateAddress = (data, color = 0) => {
    const pattern = /\b[0-9]{4}-[0-9]{2}-[0-9]{2}\b/gm;

    return data?.replace(pattern, (match) => {
        return match
            .split(':')
            .map((byte, index, array) => {
                return applyStyle(byte, color) + (index < array.length - 1 ? applyStyle(':', 250) : '');
            })
            .join('');
    });
};

const colorTimeAddress = (data, color = 0) => {
    const pattern = /\b([0-9]{2}:){1,2}[0-9]{2}\b/gm;

    return data?.replace(pattern, (match) => {
        return match
            .split(':')
            .map((byte, index, array) => {
                return applyStyle(byte, color) + (index < array.length - 1 ? applyStyle(':', color) : '');
            })
            .join('');
    });
};

const colorMacAddress = (data, color = 0) => {
    const pattern = /\b([a-fA-F0-9]{2}:){5}[a-fA-F0-9]{2}\b/gm;

    return data?.replace(pattern, (match) => {
        return match
            .split(':')
            .map((byte, index, array) => {
                return applyStyle(byte, color) + (index < array.length - 1 ? applyStyle(':', color) : '');
            })
            .join('');
    });
};

const colorIpv4Network = (data, color = 0) => {
    const pattern = /\b([0-9]{1,3}\.){3}[0-9]{1,3}(\/[0-9]{1,2})?\b/gm;

    return data?.replace(pattern, (match) => {
        if (match.includes('/')) {
            const [network, mask] = match.split('/');
            return applyStyle(network, color) + applyStyle('/', 250) + applyStyle(mask, color);
        } else {
            return applyStyle(match, color);
        }
    });
};

const colorIpv6Network = (data, color = 0) => {
    const pattern = /\b(:?[a-fA-F0-9]{1,4}::?[a-fA-F0-9]{0,4}){1,7}(:[a-fA-F0-9]{1,4})?(\/[0-9]{1,3})?\b/gm;

    return data?.replace(pattern, (match) => {
        return applyStyle(match, color);
    });
};

const colorString = (data, color = 0) => {
    const pattern = /"[^"]*"/gm;

    return data?.replace(pattern, (match) => {
        return applyStyle(match, color);
    });
};

const colorNumber = (data, color = 0) => {
    const pattern = /\s[\s\d]+[\s;,]|\([\s\d]+[\s]|>\d+<|0x\d+/gm;

    return data?.replace(pattern, (match) => {
        if (match.startsWith('(')) {
            return '(' + applyStyle(match.slice(1, match.length), color);
        } else if (match.endsWith(';') || match.endsWith(',')) {
            return applyStyle(match.slice(0, match.length - 1), color) + match.at(-1);
        } else if (match.startsWith('>') || match.endsWith('<')) {
            return '>' + applyStyle(match.slice(1, match.length - 1), color) + '<';
        } else {
            return applyStyle(match, color);
        }
    });
};

const colorFirstHalfIncompleteString = (data, color = 0) => {
    // Find the index of the last occurrence of `"`
    const lastQuoteIndex = data.lastIndexOf('"');

    // If no `"` is found or it's at the very end, return the data as is
    if (lastQuoteIndex === -1 || lastQuoteIndex === data.length - 1) {
        return data;
    }

    // Color the part of the string starting from the last `"`
    const beforeQuote = data.slice(0, lastQuoteIndex);
    const afterQuote = data.slice(lastQuoteIndex);

    return beforeQuote + applyStyle(afterQuote, color);
};

const colorAndRemoveSecondHalfIncompleteString = (terminal, data, color = 0) => {
    const startIndex = data.indexOf('"');

    if (startIndex !== -1) {
        // Extract and process the second half starting from the quote
        const secondHalf = data.slice(0, startIndex + 1);
        // Color the second half and write it to the terminal immediately
        const coloredSecondHalf = applyStyle(secondHalf, 178);
        terminal.write(coloredSecondHalf);

        // Remove the processed part from `renderedData`
        return data.slice(startIndex + 1);
    }
};

const colorInterface = (data, color = 0, color2 = 0, color3 = 0) => {
    const interfacePatterns = [
        /\b[a-z]+-\d+\/\d+\/\d+(?:[:]\d+)?([.]\d+)?\b/g,
        /\b(?:cbp\d+|demux0|dsc|em\d+|esi|fti\d+|vme|fxp\d+|gre|ipip|jsrv|cbp0|bme(?:\d+)?)(?:[.]\d+)?\b/g,
        /\b(?:irb(?:\d+)?|lo0|lsi|mif|mtun|pimd|pime|pip0|pp0|ps\d+|rbeb|tap(?!-)|vtep)(?:[.]\d+)?\b/g,
    ];

    let renderedData = data;
    for (const pattern of interfacePatterns) {
        renderedData = renderedData.replace(pattern, (match) => {
            if (match.includes(':') && match.includes('.')) {
                const [port, channel, unit] = match.split(/[:.]/);

                const renderedData =
                    applyStyle(port, color) +
                    applyStyle(':', 250) +
                    applyStyle(channel, color2) +
                    applyStyle('.', 250) +
                    applyStyle(unit, color3);

                return renderedData;
                return data;
            } else if (match.includes(':')) {
                const [port, channel] = match.split(':');
                const renderedData = applyStyle(port, color) + applyStyle(':', 250) + applyStyle(channel, color2);

                return renderedData;
            } else if (match.includes('.')) {
                const [port, unit] = match.split('.');
                const renderedData = applyStyle(port, color) + applyStyle('.', 250) + applyStyle(unit, color3);
                return renderedData;
            } else {
                const renderedData = applyStyle(match, color);
                return renderedData;
            }
        });
    }
    return renderedData;
};

const XTermTerminal = ({
    device,
    onReady,
    defaultFontSize = 12,
    isConfigTrackingViewOpen = false,
    formatting = true,
}) => {
    const { showContextMenu } = useContextMenu(); // Use the context menu
    const { adoptConfig, setAdoptConfig } = useStore();
    const { isPasteDisabled, setIsPasteDisabled } = useStore();
    const { cliShortcutMapping } = useStore();
    const { setTabProperties, settings } = useStore();
    const [isEditCLIShortcutsCardVisible, setIsEditCLIShortcutsCardVisible] = useState(false);
    const [deviceAddress, setDeviceAddress] = useState('');

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
    const formattingRef = useRef(formatting);

    const deleteOutboundSSHTerm = settings?.deleteOutboundSSHTerm ?? false;

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
        formattingRef.current = formatting;
    }, [formatting]);

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
            const terminal = new Terminal({ fontSize: defaultFontSize });
            const fitAddon = new FitAddon();

            terminalRef.current = terminal;
            fitAddonRef.current = fitAddon;

            terminal.loadAddon(fitAddon);
            terminal.open(containerRef.current);

            fitAddonRef.current.fit();
            terminal.focus();

            if (onReady) {
                onReady({
                    setFontSize: (newFontSize) => {
                        terminal.options.fontSize = newFontSize;
                        fitAddonRef.current?.fit();
                    },
                    getFontSize: () => {
                        return terminal.options.fontSize;
                    },
                });
            }

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
            let inCompleteStringDetected = false;

            electronAPI.sshSessionOpened(({ id, address }) => {
                if (id === deviceKey) {
                    terminalRef.current.writeln('Connected to device.');

                    setDeviceAddress(address);

                    checkForOSVersion = true;
                    setTimeout(() => {
                        checkForOSVersion = false;
                    }, 3000);
                }
            });

            electronAPI.onSSHDataReceived(({ id, data }) => {
                if (id === deviceKey) {
                    if (formattingRef.current) {
                        let renderedData = data;

                        // Check if the data contains the second half of an incomplete string
                        if (inCompleteStringDetected) {
                            renderedData = colorAndRemoveSecondHalfIncompleteString(
                                terminalRef.current,
                                renderedData,
                                178
                            );
                            inCompleteStringDetected = false; // Reset the flag
                        }

                        // Process the remaining data
                        renderedData = colorInterface(renderedData, 117, 124, 34);
                        renderedData = colorMacAddress(renderedData, 170);
                        renderedData = colorTimeAddress(renderedData, 250);
                        renderedData = colorDateAddress(renderedData, 250);
                        renderedData = colorIpv4Network(renderedData, 34);
                        renderedData = colorIpv6Network(renderedData, 34);
                        renderedData = colorString(renderedData, 178);
                        renderedData = colorNumber(renderedData, 160);

                        // Check for the first half of an incomplete string
                        if (!inCompleteStringDetected && countDoubleQuotes(renderedData) % 2 !== 0) {
                            // Process the first half of the incomplete string
                            renderedData = colorFirstHalfIncompleteString(renderedData, 178);
                            inCompleteStringDetected = true;
                        }

                        // Write the remaining highlighted data to the terminal
                        terminalRef.current.write(renderedData);
                    } else {
                        terminalRef.current.write(data);
                    }

                    // Check for the OS version pattern but only within 1 second of connection
                    if (checkForOSVersion && data.includes('--- JUNOS ')) {
                        console.log('Detected Junos OS version in response.');
                        setIsJunos(true);
                        setTabProperties(deviceKey, { isJunos: true });
                    }
                    if (data.includes('Entering configuration mode')) {
                        console.log('Detected Junos OS entering configuration mode.');
                        setIsConfigurationMode(true);
                        setTabProperties(deviceKey, { isJunosConfigMode: true });
                    } else if (data.includes('Exiting configuration mode')) {
                        console.log('Detected Junos OS exiting configuration mode.');
                        setIsConfigurationMode(false);
                        setTabProperties(deviceKey, { isJunosConfigMode: false });
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

    const getAPIUrlDomain = async () => {
        const { apiBase } = await electronAPI.getAPIBaseUrl();
        if (apiBase.length === 0) {
            return '';
        }

        console.log('apiBase', apiBase);
        const url = new URL(apiBase);
        const host = url.hostname;

        // Split the hostname and remove the first item
        const parts = host.split('.');
        const domain = parts.slice(1).join('.'); // Remove the first part and join the rest

        return [domain, host];
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
                                deleteOutboundSSHTerm && terminal.paste('delete system services outbound-ssh\n');
                                terminal.paste(`${adoptConfig}\n`);
                                terminal.paste('commit and-quit\n');
                            } else {
                                deleteOutboundSSHTerm && terminal.paste('delete system services outbound-ssh\n');
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

                <MenuDivider />

                <MenuGroupHeader>CLI Shortcuts</MenuGroupHeader>
                <MenuItem
                    icon={<EditShortcutIcon fontSize='16px' />}
                    onClick={() => {
                        setIsEditCLIShortcutsCardVisible(true);
                    }}
                >
                    <Text size={200}>Edit Shortcuts</Text>
                </MenuItem>
                <MenuDivider />

                {Object.keys(cliShortcutMapping).length > 0 && (
                    <>
                        {cliShortcutMapping?.mappings?.map((shortcut, index) => (
                            <MenuItem
                                disabled={!isJunos}
                                key={index} // Add a unique key to each MenuItem
                                icon={<CommandIcon fontSize='16px' />}
                                onClick={async () => {
                                    const { commands } = shortcut;

                                    const defaultDelay = 500;

                                    let [domain, host] = await getAPIUrlDomain();
                                    const hostNameResolveErrorMessage = '<Host not available>';
                                    let outboundSshHostname = hostNameResolveErrorMessage;
                                    let ocTermHostname = hostNameResolveErrorMessage;
                                    let jsiTermHostname = hostNameResolveErrorMessage;


                                    if (domain?.length > 0) {
                                        if (domain === 'mist.com') {
                                            outboundSshHostname = 'oc-term.mistsys.net';
                                            ocTermHostname = 'oc-term.mistsys.net';
                                        } else if (host?.toLowerCase().includes('jsi')) {
                                            // console.log('>>>> JSI Domain detected');
                                            outboundSshHostname = `jsi-term.${domain}`;
                                            jsiTermHostname = `jsi-term.${domain}`;
                                        } else {
                                            outboundSshHostname = `oc-term.${domain}`;
                                            ocTermHostname = `oc-term.${domain}`;
                                            jsiTermHostname = `jsi-term.${domain}`;
                                        }
                                    }

                                    for (let i = 0; i < commands.length; i++) {
                                        const command = commands[i];
                                        const isLastCommand = i === commands.length - 1;
                                        const isNextCommandSleep = !isLastCommand && commands[i + 1]?.includes('sleep');

                                        if (command.startsWith('sleep')) {
                                            const parts = command.split(/\s+/);
                                            const delayValue = parseInt(parts[1], 10);
                                            console.log('parts', parts);
                                            console.log('Sleeping for', delayValue, 'ms');

                                            if (isNaN(delayValue)) {
                                                const errorMessage = `# Warning: The command "${command}" has an invalid delay value. Reverting to the default delay. #`;
                                                console.error(errorMessage);

                                                terminal.writeln('');
                                                terminal.writeln('#'.repeat(errorMessage.length));
                                                terminal.writeln(errorMessage);
                                                terminal.writeln('#'.repeat(errorMessage.length));
                                                terminal.writeln('');

                                                await delay(defaultDelay);
                                            } else {
                                                await delay(delayValue);
                                            }
                                        } else {
                                            const placeholders = {
                                                '${device-address}': deviceAddress,
                                                '${oc-term-hostname}': ocTermHostname,
                                                '${jsi-term-hostname}': jsiTermHostname,
                                                '${outbound-ssh-hostname}': outboundSshHostname,
                                            };

                                            const renderedCommand = Object.keys(placeholders).reduce(
                                                (commandText, placeholder) =>
                                                    commandText?.replace(placeholder, placeholders[placeholder]),
                                                command
                                            );

                                            if (!renderedCommand.includes(hostNameResolveErrorMessage)) {
                                                if (isConfigurationMode) {
                                                    terminal.paste(`run ${renderedCommand}\n`);
                                                } else {
                                                    terminal.paste(`${renderedCommand}\n`);
                                                }
                                            } else {
                                                const highlightedCommand = command?.replace(
                                                    /\$\{.*?\}/g,
                                                    (match) => `\x1b[93m${match}\x1b[0m`
                                                );

                                                const warningMessage = `${highlightedCommand}
                                                #
                                                # \x1b[91mWarning:\x1b[0m Command "${highlightedCommand}" aborted.
                                                # \x1b[91mVariable could not be resolved.\x1b[0m Log in to access built-in variables.
                                                #
                                                `
                                                    .replace(/^\s+#/gm, '#')
                                                    .replace(/\n/g, '\r\n');

                                                terminal.write(warningMessage);
                                                terminal.paste('\n');
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
                    height: `calc(100% - ${isConfigTrackingViewOpen ? '0px' : '8px'})`,
                    border: '4px solid black',
                    backgroundColor: 'black',
                }}
            />
            {isEditCLIShortcutsCardVisible && (
                <EditCLIShortcutsCard
                    isOpen={isEditCLIShortcutsCardVisible}
                    onClose={async () => {
                        setIsEditCLIShortcutsCardVisible(false);
                    }}
                />
            )}
        </>
    );
};

export default XTermTerminal;
