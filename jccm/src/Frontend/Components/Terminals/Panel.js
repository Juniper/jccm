import React, { useState, useRef, useEffect } from 'react';
import { tokens, Label, Button, Text, Tooltip } from '@fluentui/react-components';
import {
    bundleIcon,
    DismissCircle16Filled,
    DismissCircle16Regular,
    ClipboardTextEditFilled,
    CodeCircleRegular,
    CodeCircleFilled,
    CircleRegular,
    CircleHighlightRegular,
    CircleHighlightFilled,
    CircleHintRegular,
    ChevronCircleLeftFilled,
    EyeRegular,
    BookOpenRegular,
    BookOpenFilled,
    ChevronCircleUpFilled,
    ChevronCircleDownFilled,
    CircleLineFilled,
    CircleFilled,
    SubtractCircleFilled,
    ArrowExitRegular,
    CircleSmallFilled,
    CircleShadowFilled,
    CircleOffFilled,
    ArrowExitFilled,
    ChevronCircleUpRegular,
    ChevronCircleDownRegular,
    CircleLineRegular,
    FontIncreaseFilled,
    FontIncreaseRegular,
    FontDecreaseFilled,
    FontDecreaseRegular,
    EyeTrackingRegular,
    EyeTrackingFilled,
    FolderOpenRegular,
    FolderRegular,
    DismissCircleFilled,
    DismissCircleRegular,
    DoorRegular,
    DoorArrowLeftRegular,
    TextColorFilled,
    TextColorRegular,
    TextClearFormattingFilled,
    TextClearFormattingRegular,
    ColumnDoubleCompareFilled,
    ColumnDoubleCompareRegular,
    ColumnSingleCompareFilled,
    ColumnSingleCompareRegular,
    CodeTextRegular,
    CodeTextFilled,
    DocumentOnePageRegular,
    DocumentOnePageFilled,
    DocumentOnePageMultipleRegular,
    ChevronCircleLeftRegular,
    ChevronCircleRightFilled,
    ChevronCircleRightRegular,
    CircleSmallRegular,
    ChevronLeftFilled,
    ChevronLeftRegular,
    ChevronRightRegular,
    ChevronRightFilled,
    SlashForwardRegular,
    TriangleRightRegular,
    TriangleLeftRegular,
    ChevronUpFilled,
    ChevronDownFilled,
    AddSubtractCircleFilled,
    AddSubtractCircleRegular,
    ChannelFilled,
    ChannelRegular,
    DocumentHeaderFooterFilled,
    DocumentHeaderFooterRegular,
    ArrowEnterLeftRegular,
    ArrowEnterLeftFilled,
    HighlightFilled,
    TextFieldFilled,
    TextFieldRegular,
    HighlightRegular,
    TextTRegular,
    TextTFilled,
    BracesRegular,
    BracesFilled,
    TextNumberFormatRegular,
    TextNumberFormatFilled,
} from '@fluentui/react-icons';

import { Breadcrumb, BreadcrumbItem, BreadcrumbDivider } from '@fluentui/react-components';

import useStore from '../../Common/StateStore';
import XTermTerminal from './XTermTerminal';
import { ConfigTrackingViewer } from '../Editor/ConfigTrackingViewer';
import { get, set } from 'lodash';

const { electronAPI } = window;

const DismissCircle = bundleIcon(DismissCircle16Filled, DismissCircle16Regular);
const OpenConfigIcon = bundleIcon(FolderOpenRegular, FolderRegular);
const CloseConfigIcon = bundleIcon(FolderRegular, FolderOpenRegular);
const CloseConfig2Icon = bundleIcon(ArrowExitFilled, ArrowExitRegular);
const IncreaseFontSizeIcon = bundleIcon(FontIncreaseFilled, FontIncreaseRegular);
const DecreaseFontSizeIcon = bundleIcon(FontDecreaseFilled, FontDecreaseRegular);
const DefaultFontSizeIcon = bundleIcon(CircleLineFilled, CircleLineRegular);

const DiffConfigIcon = bundleIcon(DocumentHeaderFooterFilled, DocumentHeaderFooterRegular);
const NoDiffConfigIcon = bundleIcon(DocumentOnePageFilled, DocumentOnePageRegular);

const TextConfigModeIcon = bundleIcon(BracesFilled, BracesRegular);
const SetConfigModeIcon = bundleIcon(TextNumberFormatFilled, TextNumberFormatRegular);

const FormattingIcon = bundleIcon(TextColorFilled, TextColorRegular);
const FormattingIcon2 = bundleIcon(TextClearFormattingFilled, TextClearFormattingRegular);

const PrevChangesIcon = bundleIcon(ChevronCircleUpFilled, ChevronUpFilled);
const NextChangesIcon = bundleIcon(ChevronCircleDownFilled, ChevronDownFilled);
const ResetChangesIcon = bundleIcon(ArrowEnterLeftFilled, ArrowEnterLeftRegular);

const HighlightChangesIcon = bundleIcon(TextFieldFilled, TextFieldRegular);
const NonHighlightChangesIcon = bundleIcon(TextTFilled, TextTRegular);

const BreadcrumbComponent = ({ path }) => {
    // Split the path into segments based on '/'
    const pathSegments = path.split('/');

    return (
        <Breadcrumb size='small' style={{ color: 'white' }}>
            {pathSegments.map((segment, index) => (
                <React.Fragment key={`${segment}-${index}`}>
                    <BreadcrumbItem>
                        <Label size='small' style={{ color: 'white' }}>
                            {segment}
                        </Label>
                    </BreadcrumbItem>
                    {index < pathSegments.length - 1 && <BreadcrumbDivider />}
                </React.Fragment>
            ))}
        </Breadcrumb>
    );
};

const Panels = ({ tab, isVisible }) => {
    const { getTabProperties, setTabProperties, removeTab, settings, getIsJunos, getIsJunosConfigMode } = useStore();

    const device = tab;
    const path = tab.path;

    const isJunos = getIsJunos(path);
    const isJunosConfigMode = getIsJunosConfigMode(path);
    const [isFormattingActive, setIsFormattingActive] = useState(false);
    const [isConfigTrackingOpen, setIsConfigTrackingOpen] = useState(false);

    const [configTrackingSessionStatus, setConfigTrackingSessionStatus] = useState({ status: true, message: '' });
    const [ConfigTrackingViewHeight, setConfigTrackingViewHeight] = useState(window.innerHeight * 0.6); // Initial config view window height
    const [resizeColor, setResizeColor] = useState(tokens.colorBrandBackgroundHover);
    const [resizeMouseDown, setResizeMouseDown] = useState(false);
    const [isDiffConfigModeVisible, setIsDiffConfigModeVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [changedLines, setChangedLines] = useState([]);
    const [changedLinesIndex, setChangedLinesIndex] = useState(0);
    const [lineNumber, setLineNumber] = useState(1);
    const [column, setColumn] = useState(1);
    const [isHighlight, setIsHighlight] = useState(false);
    const [configFormat, setConfigFormat] = useState('text');

    const minFontSize = 5;
    const maxFontSize = 32;
    const defaultFontSize = settings?.terminal?.fontSize ?? 12;

    const [isDockVisible, setIsDockVisible] = useState(false);
    const isDockVisibleRef = useRef(isDockVisible); // Ref to track current dock visibility state
    const configViewerRef = useRef(null); // Reference to ConfigTrackingViewer
    const dockHeight = 20;
    const detectionAreaHeight = 3; // Height of the area at the bottom of ConfigTrackingViewer to trigger dock

    useEffect(() => {
        isDockVisibleRef.current = isDockVisible;
    }, [isDockVisible]);

    useEffect(() => {
        if (isConfigTrackingOpen) {
            electronAPI.isVisibleConfigTracking(path, isVisible);
        }
    }, [isVisible, isConfigTrackingOpen]);

    const onChangeLines = (lines) => {
        setChangedLines(lines);

        if (lines.length > 0) {
            if (changedLinesIndex >= lines.length) {
                const index = lines.length - 1;
                setChangedLinesIndex(index);
            }
        } else {
            setChangedLinesIndex(0);
        }
    };

    const moveToNextChange = () => {
        if (changedLines.length > 0 && changedLinesIndex < changedLines.length - 1) {
            const index = changedLinesIndex + 1;
            setChangedLinesIndex(index);

            const lineNumber = changedLines[index];
            const tabProps = getTabProperties(path);
            const editorMethods = tabProps?.editorMethods;

            if (editorMethods && typeof editorMethods.setPosition === 'function') {
                editorMethods.setPosition(lineNumber);
            }
        }
    };

    const moveToPrevChange = () => {
        if (changedLines.length > 0 && changedLinesIndex > 0) {
            const index = changedLinesIndex - 1;
            setChangedLinesIndex(index);

            const lineNumber = changedLines[index];
            const tabProps = getTabProperties(path);
            const editorMethods = tabProps?.editorMethods;

            if (editorMethods && typeof editorMethods.setPosition === 'function') {
                editorMethods.setPosition(lineNumber);
            }
        }
    };

    const handleMouseDown = (e) => {
        const startY = e.clientY;

        setResizeMouseDown(true);
        setResizeColor(tokens.colorPaletteMarigoldBackground3);

        const onMouseMove = (moveEvent) => {
            const deltaY = moveEvent.clientY - startY;
            const newHeight = Math.min(Math.max(ConfigTrackingViewHeight - deltaY, 50), window.innerHeight * 0.7); // Ensure height is within limits

            setConfigTrackingViewHeight(newHeight);
        };

        const onMouseUp = () => {
            setResizeMouseDown(false);
            setResizeColor(tokens.colorBrandBackgroundHover);
            setTimeout(() => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            }, 0);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleCloseButton = () => {
        removeTab(path);
    };

    const handleOnXtermReady = (methods) => {
        setTabProperties(path, { xtermMethods: methods });
    };

    const handleEditorReady = (methods) => {
        setTabProperties(path, { editorMethods: methods });
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: '100%',
                height: '100%',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    width: '100%',
                    height: '100%',
                    resize: 'none',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: '30px',
                        width: '100%',
                        backgroundColor: tokens.colorBrandBackgroundHover,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                        }}
                    >
                        <Tooltip content='Close terminal' relationship='label'>
                            <Button
                                shape='circular'
                                appearance='primary'
                                size='small'
                                icon={<DismissCircle />}
                                onMouseDown={handleCloseButton}
                            />
                        </Tooltip>

                        <div style={{ marginLeft: '5px' }}>
                            <BreadcrumbComponent path={path} />
                        </div>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                        }}
                    >
                        {isJunos & isJunosConfigMode ? (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    margineRight: '100px',
                                }}
                            >
                                <ClipboardTextEditFilled style={{ color: 'white' }} />
                                <Label size='small' style={{ color: 'white', marginLeft: '5px', marginRight: '20px' }}>
                                    Junos Configuration Mode Active
                                </Label>
                            </div>
                        ) : null}

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                marginRight: '3px',
                            }}
                        >
                            <Tooltip
                                content={
                                    <Text size={100}>
                                        {isFormattingActive ? 'Disable text formatting' : 'Enable text formatting'}
                                    </Text>
                                }
                                relationship='label'
                            >
                                <Button
                                    shape='circular'
                                    appearance='transparent'
                                    size='small'
                                    icon={
                                        isFormattingActive ? (
                                            <FormattingIcon2
                                                style={{
                                                    color: 'white',
                                                }}
                                            />
                                        ) : (
                                            <FormattingIcon
                                                style={{
                                                    color: 'white',
                                                }}
                                            />
                                        )
                                    }
                                    onMouseDown={() => {
                                        setIsFormattingActive(!isFormattingActive);
                                    }}
                                    style={{ marginRight: '15px' }}
                                />
                            </Tooltip>

                            <Tooltip content={<Text size={100}>Increase Font Size</Text>} relationship='label'>
                                <Button
                                    shape='circular'
                                    appearance='transparent'
                                    size='small'
                                    icon={
                                        <IncreaseFontSizeIcon
                                            style={{
                                                color: 'white',
                                            }}
                                        />
                                    }
                                    onMouseDown={() => {
                                        const properties = getTabProperties(path);
                                        const methods = properties?.xtermMethods;
                                        if (methods) {
                                            const fontSize = methods.getFontSize();
                                            methods.setFontSize(
                                                fontSize + 1 > maxFontSize ? maxFontSize : fontSize + 1
                                            );
                                        }
                                    }}
                                />
                            </Tooltip>

                            <Tooltip content={<Text size={100}>Decrease Font Size</Text>} relationship='label'>
                                <Button
                                    shape='circular'
                                    appearance='transparent'
                                    size='small'
                                    icon={
                                        <DecreaseFontSizeIcon
                                            style={{
                                                color: 'white',
                                            }}
                                        />
                                    }
                                    onMouseDown={() => {
                                        const properties = getTabProperties(path);
                                        const methods = properties?.xtermMethods;
                                        if (methods) {
                                            const fontSize = methods.getFontSize();
                                            methods.setFontSize(
                                                fontSize - 1 < minFontSize ? minFontSize : fontSize - 1
                                            );
                                        }
                                    }}
                                    style={{
                                        transform: 'scale(0.8)',
                                    }}
                                />
                            </Tooltip>

                            <Tooltip content={<Text size={100}>Reset to Default Font Size</Text>} relationship='label'>
                                <Button
                                    shape='circular'
                                    appearance='transparent'
                                    size='small'
                                    icon={
                                        <DefaultFontSizeIcon
                                            style={{
                                                color: 'white',
                                            }}
                                        />
                                    }
                                    onMouseDown={() => {
                                        const properties = getTabProperties(path);
                                        const methods = properties?.xtermMethods;
                                        if (methods) {
                                            methods.setFontSize(defaultFontSize);
                                        }
                                    }}
                                    style={{
                                        transform: 'scale(0.8)',
                                    }}
                                />
                            </Tooltip>

                            {!isConfigTrackingOpen ? (
                                <Tooltip
                                    content={<Text size={100}>Open Configuration Viewer</Text>}
                                    relationship='label'
                                >
                                    <Button
                                        disabled={!isJunos}
                                        icon={<OpenConfigIcon fontSize='20px' />}
                                        size='small'
                                        shape='circular'
                                        appearance='transparent'
                                        style={{
                                            color: 'white',
                                            marginLeft: '15px',
                                            marginRight: '10px',
                                            transform: 'scale(0.8)',
                                        }}
                                        onClick={() => {
                                            setTimeout(() => {
                                                setIsConfigTrackingOpen(true);
                                            }, 0);
                                        }}
                                    />
                                </Tooltip>
                            ) : (
                                <Tooltip
                                    content={<Text size={100}>Close Configuration Viewer</Text>}
                                    relationship='label'
                                >
                                    <Button
                                        icon={<CloseConfigIcon fontSize='20px' />}
                                        size='small'
                                        shape='circular'
                                        appearance='transparent'
                                        style={{
                                            color: 'white',
                                            marginLeft: '15px',
                                            marginRight: '10px',
                                            transform: 'scale(0.8)',
                                        }}
                                        onClick={() => {
                                            setTimeout(() => {
                                                setIsConfigTrackingOpen(false);
                                                setIsDiffConfigModeVisible(false);
                                            }, 0);
                                        }}
                                    />
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'nowrap',
                        flexDirection: 'column',
                        width: '100%',
                        height: '100%',
                        resize: 'none',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            height: '100%',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'nowrap',
                                width: '100%',
                                height: !isConfigTrackingOpen ? '100%' : `calc(100% - ${ConfigTrackingViewHeight}px)`,
                                resize: 'none',
                                overflow: 'hidden',
                            }}
                        >
                            <XTermTerminal
                                device={device}
                                formatting={isFormattingActive}
                                defaultFontSize={defaultFontSize}
                                isConfigTrackingOpen={isConfigTrackingOpen}
                                onReady={handleOnXtermReady}
                            />
                        </div>

                        {isConfigTrackingOpen && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    width: '100%',
                                    height: `${ConfigTrackingViewHeight}px`,
                                    backgroundColor: 'black',
                                }}
                            >
                                {/* Block interactions and dim the ConfigTrackingViewer */}
                                {!configTrackingSessionStatus?.status &&
                                    (() => {
                                        if (!configViewerRef.current) {
                                            return null; // Return null if the ref is not available
                                        }

                                        const rect = configViewerRef.current.getBoundingClientRect();

                                        return (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    position: 'absolute',
                                                    top: `${rect.top}px`,
                                                    left: `${rect.left}px`,
                                                    width: `${rect.width}px`,
                                                    height: `${rect.height}px`,
                                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                    pointerEvents: 'none',
                                                    zIndex: 2000,
                                                }}
                                            />
                                        );
                                    })()}

                                <div
                                    style={{
                                        width: '100%',
                                        height: '3px',
                                        backgroundColor: resizeColor,
                                        cursor: 'row-resize',
                                    }}
                                    onMouseDown={handleMouseDown}
                                    onMouseEnter={(e) => {
                                        setTimeout(() => {
                                            setResizeColor(tokens.colorPaletteMarigoldBackground3);
                                        }, 0);
                                    }}
                                    onMouseLeave={(e) => {
                                        setTimeout(() => {
                                            !resizeMouseDown && setResizeColor(tokens.colorBrandBackgroundHover);
                                        }, 0);
                                    }}
                                />

                                <div
                                    ref={configViewerRef}
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'nowrap',
                                        overflow: 'hidden',
                                        width: '100%',
                                        height: `${ConfigTrackingViewHeight}px`,
                                        backgroundColor: 'black',
                                        pointerEvents: configTrackingSessionStatus?.status ? 'auto' : 'none',
                                    }}
                                >
                                    <ConfigTrackingViewer
                                        device={device}
                                        text=''
                                        onSessionStatusChange={(status) => {
                                            setConfigTrackingSessionStatus(status);
                                        }}
                                        onDidChangeCursorPosition={(lineNumber, column) => {
                                            setLineNumber(lineNumber);
                                            setColumn(column);
                                        }}
                                        onEditorReady={handleEditorReady}
                                        onDidChangeModelContent={() => {}}
                                        focus={false}
                                        theme='junosTheme'
                                        language='junos'
                                        automaticLayout={true}
                                        readOnly={true}
                                        enableKeyHooks={false}
                                        defaultFontSize={defaultFontSize}
                                        isDiffConfigMode={isDiffConfigModeVisible}
                                        onLoadingComplete={(flag) => {
                                            setIsLoading(flag);
                                        }}
                                        onChangedLines={(lines) => {
                                            onChangeLines(lines);
                                        }}
                                        configFormat={configFormat}
                                    />
                                </div>

                                {/* Dock Section */}
                                <div
                                    style={{
                                        display: 'flex',
                                        color: 'white',
                                        backgroundColor: tokens.colorPaletteGreenBackground3,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            width: '100%',
                                            height: `${dockHeight}px`,
                                            backgroundColor: tokens.colorNeutralBackgroundStatic,
                                            borderTop: `1px solid ${tokens.colorNeutralForeground2}`,
                                            borderBottom: `1px solid ${tokens.colorNeutralForeground2}`,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'flex-start',
                                                marginLeft: '5px',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'flex-end',
                                                    marginRight: '3px',
                                                }}
                                            >
                                                <Tooltip
                                                    content={<Text size={100}>Increase Font Size</Text>}
                                                    relationship='label'
                                                >
                                                    <Button
                                                        shape='circular'
                                                        appearance='transparent'
                                                        size='small'
                                                        icon={
                                                            <IncreaseFontSizeIcon
                                                                style={{
                                                                    color: 'white',
                                                                    fontSize: '16px',
                                                                }}
                                                            />
                                                        }
                                                        onMouseDown={() => {
                                                            const properties = getTabProperties(path);
                                                            const methods = properties?.editorMethods;
                                                            if (methods) {
                                                                const fontSize = methods.getFontSize();
                                                                methods.setFontSize(
                                                                    fontSize + 1 > maxFontSize
                                                                        ? maxFontSize
                                                                        : fontSize + 1
                                                                );
                                                            }
                                                        }}
                                                    />
                                                </Tooltip>

                                                <Tooltip
                                                    content={<Text size={100}>Decrease Font Size</Text>}
                                                    relationship='label'
                                                >
                                                    <Button
                                                        shape='circular'
                                                        appearance='transparent'
                                                        size='small'
                                                        icon={
                                                            <DecreaseFontSizeIcon
                                                                style={{
                                                                    color: 'white',
                                                                    fontSize: '14px',
                                                                }}
                                                            />
                                                        }
                                                        onMouseDown={() => {
                                                            const properties = getTabProperties(path);
                                                            const methods = properties?.editorMethods;
                                                            if (methods) {
                                                                const fontSize = methods.getFontSize();
                                                                methods.setFontSize(
                                                                    fontSize - 1 < minFontSize
                                                                        ? minFontSize
                                                                        : fontSize - 1
                                                                );
                                                            }
                                                        }}
                                                    />
                                                </Tooltip>

                                                <Tooltip
                                                    content={<Text size={100}>Reset to Default Font Size</Text>}
                                                    relationship='label'
                                                >
                                                    <Button
                                                        shape='circular'
                                                        appearance='transparent'
                                                        size='small'
                                                        icon={
                                                            <DefaultFontSizeIcon
                                                                style={{
                                                                    color: 'white',
                                                                    fontSize: '14px',
                                                                }}
                                                            />
                                                        }
                                                        onMouseDown={() => {
                                                            const properties = getTabProperties(path);
                                                            const methods = properties?.editorMethods;
                                                            if (methods) {
                                                                methods?.setFontSize(defaultFontSize);
                                                            }
                                                        }}
                                                    />
                                                </Tooltip>

                                                {!isLoading && (
                                                    <Tooltip
                                                        content={
                                                            <Text size={100}>
                                                                {configFormat === 'text'
                                                                    ? 'Text format configuration'
                                                                    : 'Set format configuration'}
                                                            </Text>
                                                        }
                                                        relationship='label'
                                                    >
                                                        <Button
                                                            shape='circular'
                                                            appearance='transparent'
                                                            icon={
                                                                configFormat === 'text' ? (
                                                                    <TextConfigModeIcon
                                                                        style={{
                                                                            color: 'white',
                                                                            fontSize: '12px',
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <SetConfigModeIcon
                                                                        style={{
                                                                            color: 'white',
                                                                            fontSize: '12px',
                                                                        }}
                                                                    />
                                                                )
                                                            }
                                                            onMouseDown={() => {
                                                                setConfigFormat(
                                                                    configFormat === 'text' ? 'set' : 'text'
                                                                );
                                                            }}
                                                            style={{
                                                                marginLeft: '50px',
                                                            }}
                                                        >
                                                            <Text style={{ color: 'white', fontSize: '10px' }}>
                                                                {configFormat === 'text'
                                                                    ? 'Text Format'
                                                                    : 'Set Format'}
                                                            </Text>
                                                        </Button>
                                                    </Tooltip>
                                                )}

                                                {!isLoading && (
                                                    <Tooltip
                                                        content={
                                                            <Text size={100}>
                                                                {!isDiffConfigModeVisible
                                                                    ? 'View the current configuration'
                                                                    : 'Compare changes with previous configurations'}
                                                            </Text>
                                                        }
                                                        relationship='label'
                                                    >
                                                        <Button
                                                            shape='circular'
                                                            appearance='transparent'
                                                            icon={
                                                                isDiffConfigModeVisible ? (
                                                                    <NoDiffConfigIcon
                                                                        style={{
                                                                            color: 'white',
                                                                            fontSize: '12px',
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <DiffConfigIcon
                                                                        style={{
                                                                            color: 'white',
                                                                            fontSize: '12px',
                                                                        }}
                                                                    />
                                                                )
                                                            }
                                                            onMouseDown={() => {
                                                                setIsDiffConfigModeVisible(!isDiffConfigModeVisible);
                                                            }}
                                                            style={{
                                                                marginLeft: '20px',
                                                            }}
                                                        >
                                                            <Text style={{ color: 'white', fontSize: '10px' }}>
                                                                {isDiffConfigModeVisible
                                                                    ? 'Config Diff Mode'
                                                                    : 'Config View Mode'}
                                                            </Text>
                                                        </Button>
                                                    </Tooltip>
                                                )}



                                                {!isLoading && isDiffConfigModeVisible && (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginLeft: '0px',
                                                            gap: '0px',
                                                            transform: 'scale(0.8)',
                                                            transformOrigin: 'center',
                                                            backgroundColor: tokens.colorNeutralForeground1Static,
                                                            borderRadius: `${dockHeight}px`,
                                                        }}
                                                    >
                                                        <Tooltip
                                                            content={<Text size={100}>Previous changes</Text>}
                                                            relationship='label'
                                                        >
                                                            <Button
                                                                disabled={
                                                                    changedLines?.length === 0 ||
                                                                    changedLinesIndex === 0
                                                                }
                                                                shape='circular'
                                                                appearance='transparent'
                                                                size='small'
                                                                icon={
                                                                    <PrevChangesIcon
                                                                        style={{
                                                                            fontSize: '14px',
                                                                            color:
                                                                                changedLines?.length === 0 ||
                                                                                changedLinesIndex === 0
                                                                                    ? tokens.colorPaletteMinkBorderActive
                                                                                    : 'white',
                                                                        }}
                                                                    />
                                                                }
                                                                onMouseDown={() => {
                                                                    moveToPrevChange();
                                                                }}
                                                            />
                                                        </Tooltip>

                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                flexDirection: 'row',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}
                                                        >
                                                            <Text style={{ fontSize: '10px' }}>
                                                                {changedLines?.length > 0 ? changedLinesIndex + 1 : 0}
                                                            </Text>
                                                            <SlashForwardRegular style={{ fontSize: '10px' }} />
                                                            <Text style={{ fontSize: '10px' }}>
                                                                {changedLines.length}
                                                            </Text>
                                                        </div>

                                                        <Tooltip
                                                            content={<Text size={100}>Next changes</Text>}
                                                            relationship='label'
                                                        >
                                                            <Button
                                                                disabled={
                                                                    changedLines?.length === 0 ||
                                                                    changedLinesIndex === changedLines.length - 1
                                                                }
                                                                shape='circular'
                                                                appearance='transparent'
                                                                size='small'
                                                                icon={
                                                                    <NextChangesIcon
                                                                        style={{
                                                                            fontSize: '14px',
                                                                            color:
                                                                                changedLines?.length === 0 ||
                                                                                changedLinesIndex ===
                                                                                    changedLines.length - 1
                                                                                    ? tokens.colorPaletteMinkBorderActive
                                                                                    : 'white',
                                                                        }}
                                                                    />
                                                                }
                                                                onMouseDown={() => {
                                                                    moveToNextChange();
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    </div>
                                                )}

                                                {!isLoading && isDiffConfigModeVisible && (
                                                    <>
                                                        <Tooltip
                                                            content={
                                                                <Text size={100}>
                                                                    {isHighlight
                                                                        ? 'Highlight changes in the current configuration'
                                                                        : 'View the changes in plain mode'}{' '}
                                                                </Text>
                                                            }
                                                            relationship='label'
                                                        >
                                                            <Button
                                                                shape='circular'
                                                                appearance='transparent'
                                                                size='small'
                                                                icon={
                                                                    isHighlight ? (
                                                                        <HighlightChangesIcon
                                                                            style={{
                                                                                fontSize: '16px',
                                                                                color: 'white',
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <NonHighlightChangesIcon
                                                                            style={{
                                                                                fontSize: '16px',
                                                                                color: 'white',
                                                                            }}
                                                                        />
                                                                    )
                                                                }
                                                                onMouseDown={() => {
                                                                    const v = !isHighlight;
                                                                    setIsHighlight(v);
                                                                    getTabProperties(
                                                                        path
                                                                    )?.editorMethods?.highlightChanges(v);
                                                                }}
                                                            >
                                                                <Text style={{ color: 'white', fontSize: '10px' }}>
                                                                    {isHighlight ? 'Highlighted View' : 'Plain View'}
                                                                </Text>
                                                            </Button>
                                                        </Tooltip>

                                                        <Tooltip
                                                            content={
                                                                <Text size={100}>
                                                                    Set a new baseline for future comparisons
                                                                </Text>
                                                            }
                                                            relationship='label'
                                                        >
                                                            <Button
                                                                disabled={changedLines?.length === 0}
                                                                shape='circular'
                                                                appearance='transparent'
                                                                size='small'
                                                                icon={
                                                                    <ResetChangesIcon
                                                                        style={{
                                                                            fontSize: '14px',
                                                                            color:
                                                                                changedLines?.length === 0
                                                                                    ? tokens.colorPaletteMinkBorderActive
                                                                                    : 'white',
                                                                        }}
                                                                    />
                                                                }
                                                                onMouseDown={() => {
                                                                    getTabProperties(
                                                                        path
                                                                    )?.editorMethods?.resetChanges();
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            changedLines?.length === 0
                                                                                ? tokens.colorPaletteMinkBorderActive
                                                                                : 'white',
                                                                        fontSize: '10px',
                                                                    }}
                                                                >
                                                                    Set Baseline
                                                                </Text>
                                                            </Button>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end',
                                                marginRight: '10px',
                                                gap: '10px',
                                            }}
                                        >
                                            {!configTrackingSessionStatus?.status && (
                                                <Tooltip
                                                    content={
                                                        <Text size={100}>{configTrackingSessionStatus?.message}</Text>
                                                    }
                                                    relationship='label'
                                                >
                                                    <Text
                                                        style={{
                                                            color: tokens.colorNeutralBackground2Hover,
                                                            fontSize: '10px',
                                                        }}
                                                    >
                                                        Configuration Viewer is
                                                        {configTrackingSessionStatus?.status ? ' active' : ' inactive'}
                                                    </Text>
                                                </Tooltip>
                                            )}

                                            {!isLoading && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        justifyContent: 'flex-end',
                                                        alignItems: 'center',
                                                        marginRight: '5px',
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: tokens.colorNeutralBackground2Hover,
                                                            fontSize: '10px',
                                                        }}
                                                    >
                                                        {`Ln ${lineNumber}, Col ${column}`}
                                                    </Text>
                                                </div>
                                            )}

                                            <Tooltip
                                                content={<Text size={100}>Close Configuration Viewer</Text>}
                                                relationship='label'
                                            >
                                                <Button
                                                    icon={<CloseConfig2Icon />}
                                                    size='small'
                                                    shape='circular'
                                                    appearance='transparent'
                                                    style={{
                                                        color: 'white',
                                                        transform: 'scale(0.8)',
                                                        transformOrigin: 'right',
                                                    }}
                                                    onClick={() => {
                                                        setTimeout(() => {
                                                            setIsConfigTrackingOpen(false);
                                                            setIsDiffConfigModeVisible(false);
                                                        }, 0);
                                                    }}
                                                />
                                            </Tooltip>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Panels;
