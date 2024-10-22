import React, { useEffect, useState, useRef } from 'react';
import {
    Persona,
    Button,
    Tooltip,
    Text,
    Portal,
    Menu,
    MenuTrigger,
    MenuList,
    MenuItem,
    MenuPopover,
    MenuItemRadio,
    MenuGroup,
    MenuGroupHeader,
    MenuDivider,
    tokens,
} from '@fluentui/react-components';
import _, { set } from 'lodash';

import {
    CloudAddFilled,
    CloudAddRegular,
    ArrowCircleRightFilled,
    ArrowCircleRightRegular,
    LeafThreeRegular,
    LeafThreeFilled,
    PersonQuestionMarkFilled,
    PersonQuestionMarkRegular,
    bundleIcon,
} from '@fluentui/react-icons';

import {
    LeftSideSpaceWidth,
    HeaderSpaceHeight,
    FooterSpaceHeight,
    RightSideSpaceWidth,
} from './Common/CommonVariables';
import Header from './Layout/Header';
import Footer from './Layout/Footer';
import LeftSide from './Layout/LeftSide';
import UserAvatar from './Components/UserAvatar';
import useStore from './Common/StateStore';
import Login from './Components/Login';
import TerminalLayout from './Components/Terminals/TerminalLayout';
import eventBus from './Common/eventBus';
import { ConsoleWindow } from './ConsoleWindow';
import { AboutWindow } from './AboutWindow';
import { VersionUpdateCheckNotification } from './VersionUpdateCheckNotification';
import { ConfirmWindow } from './ConfirmWindow';
import { is } from 'immutable';

const CloudAdd = bundleIcon(CloudAddFilled, CloudAddRegular);
const ArrowCircleRight = bundleIcon(ArrowCircleRightRegular, ArrowCircleRightRegular);
const LeafThree = bundleIcon(LeafThreeFilled, LeafThreeRegular);
const PersonQuestionMark = bundleIcon(PersonQuestionMarkFilled, PersonQuestionMarkRegular);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const Main = () => {
    const { isUserLoggedIn } = useStore();
    const { consoleWindowOpen, consoleWindowWidth, setConsoleWindowWidth, getConsoleWindowWidth } = useStore();
    const { checkingForUpdate, updateDownloaded } = useStore();

    const containerRef = useRef(null);
    const leftRef = useRef(null);
    const centerRef = useRef(null);

    const [isUserLoginCardVisible, setIsUserLoginCardVisible] = useState(false);

    const [isLeftOpen, setIsLeftOpen] = useState(true);
    const [leftWidth, setLeftWidth] = useState(LeftSideSpaceWidth);
    const [leftResizerColor, setLeftResizerColor] = useState(tokens.colorNeutralBackground1Pressed);
    const [isLeftResizerHovered, setIsLeftResizerHovered] = useState(false);
    const [isLeftResizerActive, setIsLeftResizerActive] = useState(false);
    const resizeColorTimeoutRef = useRef(null); // Ref to store the timeout ID

    const [isOpenAbout, setIsOpenAbout] = useState(false);
    const [isOpenCheckUpdates, setIsOpenCheckUpdates] = useState(false);
    const [isOpenResetAppData, setIsOpenResetAppData] = useState(false);
    const [isOpenRestartApp, setIsOpenRestartApp] = useState(false);
    const [isOpenQuitApp, setIsOpenQuitApp] = useState(false);

    const [isCheckUpdatesDisabled, setIsCheckUpdatesDisabled] = useState(true);

    const [centerWidth, setCenterWidth] = useState(`calc(100% - ${LeftSideSpaceWidth}px)`);
    const { isAutoUpdateSupport } = useStore();

    const leftMinWidth = 250;
    const leftMaxWidth = 900;
    const resizeKnobWidthInOpen = 4;
    const resizeKnobWidthInClose = 50;

    const sidebarHeight = `calc(100vh - ${HeaderSpaceHeight}px - ${FooterSpaceHeight}px)`;

    useEffect(() => {
        const generateEvents = async () => {
            await eventBus.emit('check-for-auto-update-support');

            await delay(1000); // Delay for 1 second
            await eventBus.emit('user-session-check');
            await eventBus.emit('local-inventory-refresh');
            await eventBus.emit('device-facts-refresh');
            await eventBus.emit('device-models-refresh');
            await eventBus.emit('check-for-updates');
        };

        generateEvents();
    }, []);

    useEffect(() => {
        // Set interval to check for updates every hour
        const intervalId = setInterval(async () => {
            await eventBus.emit('check-for-updates');
        }, 60 * 60 * 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsCheckUpdatesDisabled(false);
        }, 15000); // 15-second delay

        return () => clearTimeout(timer); // Cleanup timer on unmount
    }, []);

    const handleLeftMouseMove = (e) => {
        if (!containerRef.current) return;

        // Calculate new width based on mouse position
        const newWidth = e.clientX;
        if (newWidth >= leftMinWidth && newWidth <= leftMaxWidth) {
            setLeftWidth(newWidth);
            setCenterWidth(`calc(100% - ${newWidth}px)`);
        }
    };

    const handleLeftMouseUp = () => {
        setIsLeftResizerActive(false);

        window.removeEventListener('mousemove', handleLeftMouseMove);
        window.removeEventListener('mouseup', handleLeftMouseUp);
    };

    const handleLeftMouseDown = (e) => {
        setIsLeftResizerActive(true);

        window.addEventListener('mousemove', handleLeftMouseMove);
        window.addEventListener('mouseup', handleLeftMouseUp);
        e.preventDefault();
    };

    const handleMouseEnter = () => {
        setIsLeftResizerHovered(true);
        clearTimeout(resizeColorTimeoutRef.current);
        resizeColorTimeoutRef.current = setTimeout(() => {
            setLeftResizerColor(tokens.colorPaletteMarigoldBackground3);
        }, 300);
    };

    const handleMouseLeave = () => {
        setIsLeftResizerHovered(false);
        if (!isLeftResizerActive) setLeftResizerColor(tokens.colorNeutralBackground1Pressed);
        clearTimeout(resizeColorTimeoutRef.current);
    };

    const handleDoubleClick = () => {
        setIsLeftResizerHovered(false);
        setIsLeftOpen(!isLeftOpen);
        // I don't know why center panel width for terminal should be divided by 2 and plus 1 for the proper width calcuation.
        // TODO: visit later and dig out
        setCenterWidth(`calc(100% - ${resizeKnobWidthInClose / 2 - 1}px)`);
    };

    window.addEventListener('error', (event) => {
        console.error('Error event:', event);
        event.preventDefault(); // Prevents the default handling (e.g., the popup)
        // You can add additional logic here to log the error to a file, or display a custom error message
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled rejection:', event);
        event.preventDefault(); // Prevents the default handling (e.g., the popup)
        // You can add additional logic here to log the error to a file, or display a custom error message
    });

    // Mouse down handler
    const handleConsoleResizeStart = (e) => {
        // Add mousemove and mouseup event listeners to handle resizing
        window.addEventListener('mousemove', handleConsoleResize);
        window.addEventListener('mouseup', handleConsoleResizeEnd);
        e.preventDefault();
    };

    // Mouse move handler (resize logic)
    const handleConsoleResize = (e) => {
        const newWidth = window.innerWidth - e.clientX; // Calculate new width based on cursor position
        if (newWidth >= 250 && newWidth <= 800) {
            // Set min and max width
            setConsoleWindowWidth(newWidth);
        }
    };

    // Mouse up handler
    const handleConsoleResizeEnd = () => {
        // Remove the mousemove and mouseup event listeners after resizing
        window.removeEventListener('mousemove', handleConsoleResize);
        window.removeEventListener('mouseup', handleConsoleResizeEnd);
    };

    useEffect(() => {
        const savedWidth = localStorage.getItem('consoleWindowWidth');
        if (savedWidth) {
            setConsoleWindowWidth(Number(savedWidth));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('consoleWindowWidth', consoleWindowWidth);
    }, [consoleWindowWidth]);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                width: '100vw',
                height: '100vh',
                overflow: 'hidden',
                margin: '0 0 0 0',
                padding: '0 0 0 0',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: `calc(100% - ${getConsoleWindowWidth()}px)`,
                    height: '100vh',
                    overflow: 'hidden',
                    margin: '0 0 0 0',
                    padding: '0 0 0 0',
                    // backgroundColor: 'green',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                        height: `${HeaderSpaceHeight}px`,
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        position: 'relative',
                        overflow: 'hidden',
                        top: 0,
                        left: 0,
                        backgroundColor: tokens.colorNeutralBackground1Selected,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            height: '100%',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            marginLeft: '10px',
                        }}
                    >
                        <Menu>
                            <MenuTrigger>
                                <Button icon={<LeafThree />} appearance='transparent' shape='circular' size='large' />
                            </MenuTrigger>
                            <MenuPopover>
                                <MenuList>
                                    <MenuItem onClick={() => setIsOpenAbout(true)}>
                                        <Text style={{ fontSize: '12px' }}>About JCCM</Text>
                                    </MenuItem>
                                    {isAutoUpdateSupport && (
                                        <>
                                            <MenuDivider />
                                            {updateDownloaded ? (
                                                <MenuItem onClick={async () => await eventBus.emit('quit-and-install')}>
                                                    <Text style={{ fontSize: 12 }}>Restart to Apply Update</Text>
                                                </MenuItem>
                                            ) : checkingForUpdate ? (
                                                <MenuItem disabled>
                                                    <Text style={{ fontSize: 12 }}>Downloading Update...</Text>
                                                </MenuItem>
                                            ) : (
                                                <MenuItem
                                                    disabled={isCheckUpdatesDisabled}
                                                    onClick={() => setIsOpenCheckUpdates(true)}
                                                >
                                                    <Text style={{ fontSize: 12 }}>
                                                        {isCheckUpdatesDisabled
                                                            ? 'Preparing update service...'
                                                            : 'Check for Updates'}
                                                    </Text>
                                                </MenuItem>
                                            )}
                                        </>
                                    )}
                                    <MenuDivider />
                                    <MenuItem onClick={() => setIsOpenResetAppData(true)}>
                                        <Tooltip content={'This will clear all data and restart the app.'}>
                                            <Text style={{ fontSize: 12 }}>Reset App Data</Text>
                                        </Tooltip>
                                    </MenuItem>
                                    <MenuItem onClick={() => setIsOpenRestartApp(true)}>
                                        <Text style={{ fontSize: '12px' }}>Restart</Text>
                                    </MenuItem>
                                    <MenuItem onClick={() => setIsOpenQuitApp(true)}>
                                        <Text style={{ fontSize: '12px' }}>Quit</Text>
                                    </MenuItem>
                                </MenuList>
                            </MenuPopover>
                        </Menu>
                    </div>
                    {updateDownloaded && (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                marginLeft: '10px',
                                marginRight: '10px',
                            }}
                        >
                            <Tooltip
                                content='A new update is available. Click the button to restart and apply the latest version.'
                                relationship='label'
                                withArrow
                                positioning='after'
                            >
                                <Button
                                    shape='circular'
                                    appearance='primary'
                                    size='small'
                                    onClick={async () => await eventBus.emit('quit-and-install')}
                                    style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                >
                                    Restart to Update
                                </Button>
                            </Tooltip>
                        </div>
                    )}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            width: '100%',
                            height: '100%',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                        }}
                    >
                        <Header />
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            width: `${RightSideSpaceWidth}px`,
                            height: '100%',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            paddingRight: '10px',
                        }}
                    >
                        {isUserLoggedIn ? (
                            <UserAvatar />
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    height: '100%',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    marginLeft: '10px',
                                }}
                            >
                                <Tooltip
                                    content='User is not logged in.'
                                    relationship='label'
                                    withArrow
                                    positioning='above-end'
                                >
                                    <Button
                                        icon={<PersonQuestionMark />}
                                        appearance='transparent'
                                        shape='circular'
                                        size='large'
                                        onClick={() => {
                                            setIsUserLoginCardVisible(true);
                                        }}
                                    />
                                </Tooltip>
                                {isUserLoginCardVisible && (
                                    <div>
                                        <Login
                                            isOpen={isUserLoginCardVisible}
                                            onClose={() => {
                                                setIsUserLoginCardVisible(false);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div
                    ref={containerRef}
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                        height: sidebarHeight,
                        resize: 'none',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        ref={leftRef}
                        style={{
                            display: isLeftOpen ? 'flex' : 'none',
                            flexDirection: 'row',
                            width: `${leftWidth}px`,
                            height: '100%',
                            backgroundColor: tokens.colorNeutralBackground2,
                        }}
                    >
                        <LeftSide />
                    </div>
                    <Tooltip content={isLeftOpen ? 'Resize Left Sidebar' : 'Open Left Sidebar'} relationship='label'>
                        {isLeftOpen ? (
                            <div
                                onMouseDown={handleLeftMouseDown}
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                                onDoubleClick={handleDoubleClick}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: `${isLeftOpen ? resizeKnobWidthInOpen : resizeKnobWidthInClose}px`,
                                    height: '100%',
                                    cursor: 'ew-resize',
                                    backgroundColor:
                                        isLeftResizerHovered || isLeftResizerActive
                                            ? leftResizerColor
                                            : tokens.colorNeutralBackground1Pressed,
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-start',
                                    alignItems: 'center',
                                    height: '100%',
                                    backgroundColor: tokens.colorNeutralBackground1Selected,
                                }}
                            >
                                <Button
                                    shape='circular'
                                    appearance='subtle'
                                    size='small'
                                    icon={<ArrowCircleRight />}
                                    onClick={() => {
                                        setIsLeftOpen(true);
                                        setCenterWidth(`calc(100% - ${leftWidth}px)`);
                                    }}
                                />
                            </div>
                        )}
                    </Tooltip>

                    <div
                        ref={centerRef}
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            width: centerWidth,
                            height: '100%',
                        }}
                    >
                        <TerminalLayout />
                    </div>
                </div>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: `calc(100% - ${getConsoleWindowWidth()}px)`,
                        height: `${FooterSpaceHeight}px`,
                        alignItems: 'center',
                        position: 'fixed',
                        left: 0,
                        bottom: 0,
                        backgroundColor: tokens.colorNeutralBackground1Selected,
                    }}
                >
                    <Footer />
                </div>
            </div>
            <div
                style={{
                    display: consoleWindowOpen ? 'flex' : 'none',
                    flexDirection: 'column',
                    position: 'fixed', // Keeps the window fixed to the viewport
                    right: '0', // Aligns the window to the right edge
                    top: '0', // Aligns the window to the top edge
                    width: `${getConsoleWindowWidth()}px`, // Sets the width based on your function
                    height: '100vh', // Full viewport height
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    margin: 0,
                    padding: 0,
                    zIndex: 1000001, // Ensures it stays above other elements (FYO. Fluent React v9's Dialog component has a z-index of 1000000)
                    backgroundColor: tokens.colorNeutralBackground4Selected,
                }}
            >
                <ConsoleWindow />

                {/* Resizer */}
                <div
                    onMouseDown={handleConsoleResizeStart}
                    style={{
                        width: '2px',
                        cursor: 'ew-resize',
                        backgroundColor: tokens.colorNeutralBackground1Selected,
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                    }}
                />
            </div>
            {isOpenAbout && <AboutWindow isOpen={isOpenAbout} onClose={() => setIsOpenAbout(false)} />}
            {isOpenCheckUpdates && (
                <VersionUpdateCheckNotification
                    isOpen={isOpenCheckUpdates}
                    onClose={() => {
                        setIsOpenCheckUpdates(false);
                    }}
                />
            )}
            {isOpenResetAppData && (
                <ConfirmWindow
                    isOpen={isOpenResetAppData}
                    onClose={() => setIsOpenResetAppData(false)}
                    message='This will reset all app data to default settings. Are you sure you want to proceed?'
                    onConfirm={async () => await eventBus.emit('clear-database-and-restart-app')}
                />
            )}
            {isOpenRestartApp && (
                <ConfirmWindow
                    isOpen={isOpenRestartApp}
                    onClose={() => setIsOpenRestartApp(false)}
                    message='The application will be restarted. Do you want to continue?'
                    onConfirm={async () => await eventBus.emit('restart-app')}
                />
            )}
            {isOpenQuitApp && (
                <ConfirmWindow
                    isOpen={isOpenQuitApp}
                    onClose={() => setIsOpenQuitApp(false)}
                    message='Are you sure you want to quit the app?'
                    onConfirm={async () => await eventBus.emit('quit-app')}
                />
            )}
        </div>
    );
};
