import React, { useEffect, useState, useRef } from 'react';

const { electronAPI } = window;
import { MonacoEditor } from './MonacoEditor';
import { use } from 'react';

import { Text, tokens } from '@fluentui/react-components';
import * as diff from 'diff';

import {
    CropArrowRotateRegular,
    SubtractFilled,
    SubtractRegular,
    DrinkToGoRegular,
    bundleIcon,
    DrinkToGoFilled,
    DrinkCoffeeFilled,
} from '@fluentui/react-icons';

import { RotatingIcon } from '../../Layout/ChangeIcon';
import { set } from 'lodash';

export const ConfigTrackingViewer = (props) => {
    const {
        device,
        onSessionStatusChange,
        onEditorReady,
        isDiffConfigMode,
        onLoadingComplete,
        onChangedLines,
        configFormat,
    } = props;
    const [configNavigationMap, setConfigNavigationMap] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [changedLines, setChangedLines] = useState([]);
    const [isHighlighting, setIsHighlighting] = useState(false);

    const methodsRef = useRef(null);
    const isDiffConfigModeRef = useRef(isDiffConfigMode);
    const changedLinesRef = useRef(changedLines);
    const isLoadingRef = useRef(isLoading);
    const isHighlightingRef = useRef(isHighlighting);

    const [previousConfig, setPreviousConfig] = useState({ configText: '', ConfigSet: '' });
    const [currentConfig, setCurrentConfig] = useState({ configText: '', ConfigSet: '' });
    const previousConfigRef = useRef(previousConfig);
    const currentConfigRef = useRef(currentConfig);
    const configFormatRef = useRef(configFormat);

    const id = device?.path;

    const getConfig = (config) => {
        return !configFormatRef || configFormatRef.current === 'text'
            ? config?.configText ?? ''
            : config?.configSet ?? '';
    };

    useEffect(() => {
        previousConfigRef.current = previousConfig;
    }, [previousConfig]);

    useEffect(() => {
        currentConfigRef.current = currentConfig;
    }, [currentConfig]);

    useEffect(() => {
        if (!methodsRef.current) return;

        configFormatRef.current = configFormat;

        const monaco = methodsRef.current.monaco;

        if (isDiffConfigModeRef.current) {
            const { decoratedConfigText, decorations, deletedLines } = decorateChanges(
                previousConfig,
                currentConfig,
                isHighlightingRef.current,
                configFormatRef.current
            );

            methodsRef.current.setValue(decoratedConfigText);
            methodsRef.current.editor.deltaDecorations([], decorations);

            const model = methodsRef.current.editor.getModel();
            if (model) {
                monaco.editor.setModelLanguage(model, 'junos');
            }

            const cnm = buildNavigationMap(decoratedConfigText, deletedLines, configFormatRef.current);
            setConfigNavigationMap(cnm);
        } else {
            methodsRef.current.setValue(getConfig(currentConfig));
            methodsRef.current.editor.deltaDecorations([], []);

            const model = methodsRef.current.editor.getModel();
            if (model) {
                monaco.editor.setModelLanguage(model, 'junos');
            }

            const cnm = buildNavigationMap(getConfig(currentConfig), [], configFormatRef.current);
            setConfigNavigationMap(cnm);
        }
    }, [configFormat]);

    useEffect(() => {
        const monaco = methodsRef.current.monaco;
        isHighlightingRef.current = isHighlighting;

        const { decoratedConfigText, decorations, deletedLines } = decorateChanges(
            previousConfig,
            currentConfig,
            isHighlightingRef.current,
            configFormatRef.current
        );

        methodsRef.current.setValue(decoratedConfigText);
        methodsRef.current.editor.deltaDecorations([], decorations);

        const model = methodsRef.current.editor.getModel();
        if (model) {
            monaco.editor.setModelLanguage(model, 'junos');
        }

        const cnm = buildNavigationMap(decoratedConfigText, deletedLines, configFormatRef.current);
        setConfigNavigationMap(cnm);
    }, [isHighlighting]);

    useEffect(() => {
        isLoadingRef.current = isLoading;
        onLoadingComplete(isLoading);
    }, [isLoading]);

    useEffect(() => {
        // Sync the ref with the updated state
        changedLinesRef.current = changedLines;

        onChangedLines(changedLines);
    }, [changedLines]);

    useEffect(() => {
        isDiffConfigModeRef.current = isDiffConfigMode;

        if (!methodsRef.current) return;

        const monaco = methodsRef.current.monaco;

        if (isDiffConfigMode) {
            const { decoratedConfigText, decorations, deletedLines } = decorateChanges(
                previousConfig,
                currentConfig,
                isHighlightingRef.current,
                configFormatRef.current
            );

            methodsRef.current.setValue(decoratedConfigText);
            methodsRef.current.editor.deltaDecorations([], decorations);

            const model = methodsRef.current.editor.getModel();
            if (model) {
                monaco.editor.setModelLanguage(model, 'junos');
            }

            const cnm = buildNavigationMap(decoratedConfigText, deletedLines, configFormatRef.current);
            setConfigNavigationMap(cnm);
        } else {
            methodsRef.current.setValue(getConfig(currentConfig));
            methodsRef.current.editor.deltaDecorations([], []);

            const model = methodsRef.current.editor.getModel();
            if (model) {
                monaco.editor.setModelLanguage(model, 'junos');
            }

            const cnm = buildNavigationMap(getConfig(currentConfig), [], configFormatRef.current);
            setConfigNavigationMap(cnm);
        }
    }, [isDiffConfigMode]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            electronAPI.closeConfigTracking(id);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [id]);

    useEffect(() => {
        const unregister = electronAPI.onConfigTracking(id, (args) => {
            const { event, data } = args;

            if (event === 'open') {
                onSessionStatusChange({ id, status: true, message: 'Config tracking started' });
            } else if (event === 'error') {
                onSessionStatusChange({ id, status: false, message: data?.message });
                setIsLoading(false);
            } else if (event === 'config') {
                const config = data;

                let previousConfig;

                if (isLoadingRef.current) {
                    setPreviousConfig(config);
                    setCurrentConfig(config);

                    previousConfig = config;
                    setIsLoading(false);
                } else {
                    setCurrentConfig(config);
                    previousConfig = previousConfigRef.current;
                }

                if (isDiffConfigModeRef.current) {
                    const { decoratedConfigText, decorations, deletedLines } = decorateChanges(
                        previousConfig,
                        config,
                        isHighlightingRef.current,
                        configFormatRef.current
                    );

                    methodsRef.current?.setValue(decoratedConfigText);
                    methodsRef.current.editor.deltaDecorations([], decorations);

                    // Update navigation map
                    const cnm = buildNavigationMap(decoratedConfigText, deletedLines, configFormatRef.current);
                    setConfigNavigationMap(cnm);
                } else {
                    const configText = getConfig(config);
                    methodsRef.current?.setValue(configText);

                    // Update navigation map
                    const cnm = buildNavigationMap(configText, [], configFormatRef.current);
                    setConfigNavigationMap(cnm);
                }
            } else if (event === 'close') {
                onSessionStatusChange({ id, status: false, message: 'Config tracking closed' });
                setIsLoading(false);
            } else {
                console.log('Config tracking event:', args);
                setIsLoading(false);
            }
        });

        electronAPI.openConfigTracking(id);

        return () => {
            console.log('Closing config tracking...');
            electronAPI.closeConfigTracking(id);
            unregister();
            onSessionStatusChange({ id, status: false, message: 'Config tracking closed' });
        };
    }, []);

    const handleOnEditorReady = (methods) => {
        methods.resetChanges = () => {
            const currentConfig = currentConfigRef.current;
            const previousConfig = currentConfigRef.current;
            setPreviousConfig(previousConfig);

            const { decoratedConfigText, decorations, deletedLines } = decorateChanges(
                previousConfig,
                currentConfig,
                isHighlightingRef.current,
                configFormatRef.current
            );

            methodsRef.current?.setValue(decoratedConfigText);
            methodsRef.current.editor.deltaDecorations([], decorations);

            // Update navigation map
            const cnm = buildNavigationMap(decoratedConfigText, deletedLines, configFormatRef.current);
            setConfigNavigationMap(cnm);
        };
        methods.highlightChanges = () => {
            setIsHighlighting(!isHighlightingRef.current);
        };
        methodsRef.current = methods;
        onEditorReady(methods);
    };

    // Function to apply decorations for added and deleted lines
    const decorateChanges = (oldConfigs, newConfigs, highlight = false, format = 'text') => {
        if (!methodsRef.current) return;

        const oldConfig = getConfig(oldConfigs);
        const newConfig = getConfig(newConfigs);

        const monaco = methodsRef.current.monaco;
        const changes = diff.diffLines(oldConfig, newConfig);
        let decoratedConfigText = '';

        const decorations = [];
        const changedLines = [];
        const deletedLines = [];

        let lineNumber = 1;

        changes.forEach((change) => {
            if (change.added) {
                changedLines.push(lineNumber);
                decorations.push({
                    range: new monaco.Range(lineNumber, 1, lineNumber + change.count - 1, 1),
                    options: {
                        isWholeLine: true,
                        inlineClassName: highlight ? 'highlight-added-line' : 'added-line',
                        overviewRuler: {
                            color: 'rgba(0, 255, 0, 0.8)', // Green for added lines
                            position: monaco.editor.OverviewRulerLane.Right,
                        },
                    },
                });
            } else if (change.removed) {
                changedLines.push(lineNumber);
                deletedLines.push({ start: lineNumber, end: lineNumber + change.count - 1 });
                decorations.push({
                    range: new monaco.Range(lineNumber, 1, lineNumber + change.count - 1, 1),
                    options: {
                        isWholeLine: true,
                        inlineClassName: highlight ? 'highlight-deleted-line' : 'deleted-line',
                        overviewRuler: {
                            color: 'rgba(255, 0, 0, 0.8)', // Red for deleted lines
                            position: monaco.editor.OverviewRulerLane.Right,
                        },
                    },
                });
            } else {
                if (highlight) {
                    decorations.push({
                        range: new monaco.Range(lineNumber, 1, lineNumber + change.count - 1, 1),
                        options: {
                            isWholeLine: true,
                            inlineClassName: 'highlight-unchanged-line',
                        },
                    });
                }
            }
            decoratedConfigText += change.value;
            lineNumber += change.count;
        });

        setChangedLines(changedLines);

        return { decoratedConfigText, decorations, deletedLines };
    };

    const buildNavigationMap = (config, deletedLines = [], format = 'text') => {
        if (!config) return [];
        if (format === 'set') {
            return buildNavigationMapSet(config, deletedLines);
        } else {
            return buildNavigationMapText(config, deletedLines);
        }
    };

    const buildNavigationMapText = (config, deletedLines = []) => {
        if (!config) return [];

        const lines = config?.split('\n') || [];

        const navigationMap = []; // Array for first and second-level keys
        let currentRootKey = null;

        const rootLevelPattern = /^\S+?\s[{;]$/;
        const secondLevelPattern = /^\s{4}([\S]+(?:\s[\S]+)*)\s?([;{])$/;

        const rootKeyCache = new Map();

        lines.forEach((line, index) => {
            const rowNumber = index + 1;

            if (deletedLines.some(({ start, end }) => start <= rowNumber && rowNumber <= end)) {
                return; // Skip this iteration
            }

            line = line.replace('inactive: ', '');
            const trimmedLine = line.trim();

            // Skip empty lines or comments
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                return;
            }

            if (rootLevelPattern.test(line)) {
                // Root-level key
                currentRootKey = trimmedLine?.split(' ')?.[0]; // Get the key before any extra details
                const rootEntry = {
                    key: currentRootKey,
                    row: rowNumber,
                    children: [],
                };
                navigationMap.push(rootEntry);
                rootKeyCache.set(currentRootKey, rootEntry); // Cache the root key entry
            } else if (currentRootKey && secondLevelPattern.test(line)) {
                // Second-level key
                const m = secondLevelPattern.exec(line);
                if (m) {
                    let secondLevelKey = m[1];
                    const delimiter = m[2];
                    if (delimiter === ';') {
                        secondLevelKey = secondLevelKey?.split(' ')?.[0]; // Get the key before any extra details
                    }

                    // Find the current root key in the array
                    const rootKeyEntry = rootKeyCache.get(currentRootKey);

                    if (rootKeyEntry) {
                        // Ensure the second-level key is unique
                        const existingChild = rootKeyEntry.children.find((child) => child.key === secondLevelKey);
                        if (!existingChild) {
                            rootKeyEntry.children.push({
                                key: secondLevelKey,
                                row: rowNumber,
                            });
                        }
                    }
                }
            }
        });

        // Sort the children of the `interfaces` root key
        const interfacesEntry = navigationMap.find((entry) => entry.key === 'interfaces');
        if (interfacesEntry) {
            interfacesEntry.children.sort((a, b) => {
                const hasSlashA = a.key.includes('/');
                const hasSlashB = b.key.includes('/');

                // Place items without '/' first
                if (!hasSlashA && hasSlashB) return -1; // `a` comes before `b`
                if (hasSlashA && !hasSlashB) return 1; // `b` comes before `a`

                // Otherwise, perform natural sort
                return a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' });
            });
        }

        return navigationMap;
    };

    const buildNavigationMapSet = (config, deletedLines = []) => {
        if (!config) return [];

        const lines = config?.split('\n') || [];
        const navigationMap = []; // Array for first and second-level keys
        let currentRootKey = null;

        const rootKeyCache = new Map(); // Cache for root keys

        lines.forEach((line, index) => {
            const rowNumber = index + 1;

            // Skip lines that are marked as deleted
            if (deletedLines.some(({ start, end }) => start <= rowNumber && rowNumber <= end)) {
                return; // Skip this iteration
            }

            line = line.trim();

            // Only process lines starting with "set"
            if (!line.startsWith('set')) return;

            // Split the line into components (e.g., "set groups global system host-name alpha")
            const tokens = line.split(/\s+/);
            if (tokens.length < 3) return; // Skip invalid "set" lines

            // Root-level key (e.g., "groups")
            const rootKey = tokens[1];
            const secondLevelKey = tokens[2]; // Second-level key (e.g., "global")

            // Add or update the root key in the navigation map
            if (!rootKeyCache.has(rootKey)) {
                const rootEntry = {
                    key: rootKey,
                    row: rowNumber,
                    children: [],
                };
                navigationMap.push(rootEntry);
                rootKeyCache.set(rootKey, rootEntry);
            }

            const rootEntry = rootKeyCache.get(rootKey);

            // Add the second-level key under the current root key
            const existingChild = rootEntry.children.find((child) => child.key === secondLevelKey);
            if (!existingChild) {
                rootEntry.children.push({
                    key: secondLevelKey,
                    row: rowNumber,
                    children: [], // Placeholder for third-level keys if needed
                });
            }
        });

        // Sort the children of the `interfaces` root key
        const interfacesEntry = navigationMap.find((entry) => entry.key === 'interfaces');
        if (interfacesEntry) {
            interfacesEntry.children.sort((a, b) => {
                const hasSlashA = a.key.includes('/');
                const hasSlashB = b.key.includes('/');

                // Place items without '/' first
                if (!hasSlashA && hasSlashB) return -1; // `a` comes before `b`
                if (hasSlashA && !hasSlashB) return 1; // `b` comes before `a`

                // Otherwise, perform natural sort
                return a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' });
            });
        }

        return navigationMap;
    };

    return (
        <>
            <style>{`
                .added-line {
                    color: rgb(0, 191, 165); /* Teal for added text */
                    font-weight: bold; /* Emphasize added text */
                }
                .deleted-line {
                    text-decoration: line-through; /* Strikethrough effect */
                    color: rgb(229, 57, 53); /* Soft red for deleted text */
                    opacity: 0.75; /* Slightly reduced prominence */
                }
                .highlight-added-line {
                    color: rgb(0, 191, 165); /* Teal for added text */
                    background: rgba(0, 191, 165, 0.15); /* Light teal highlight */
                    font-weight: bold; /* Emphasize added text */
                }
                .highlight-deleted-line {
                    text-decoration: line-through; /* Strikethrough effect */
                    color: rgb(229, 57, 53); /* Soft red for deleted text */
                    background: rgba(229, 57, 53, 0.15); /* Light red highlight */
                    opacity: 0.75; /* Slightly reduced prominence */
                }
                .highlight-unchanged-line {
                    color: rgb(176, 176, 176); /* Light gray for unchanged text */
                    opacity: 0.5; /* Reduced prominence */
                }
          `}</style>

            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {isLoading && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: 'transparent',
                            gap: '5px',
                            zIndex: 1000,
                        }}
                    >
                        <RotatingIcon
                            Icon={SubtractFilled}
                            rotationDuration='500ms'
                            size='18px'
                            color={tokens.colorPaletteYellowForeground3}
                        />
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '7px',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <DrinkCoffeeFilled
                                style={{ fontSize: '13px', color: tokens.colorNeutralForegroundStaticInverted }}
                            />
                            <Text style={{ fontSize: '12px', color: tokens.colorNeutralForegroundStaticInverted }}>
                                Reading Configuration...
                            </Text>
                        </div>
                    </div>
                )}
                <MonacoEditor
                    {...props}
                    contextmenu={false}
                    navigationMap={configNavigationMap}
                    onEditorReady={handleOnEditorReady}
                />
            </div>
        </>
    );
};
