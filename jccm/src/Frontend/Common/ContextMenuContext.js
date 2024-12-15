import React, { createContext, useContext, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
    FluentProvider,
    Menu,
    MenuPopover,
    MenuItem,
    MenuList,
    MenuTrigger,
    MenuDivider,
    MenuGroup,
    MenuGroupHeader,
    MenuButton,
    Button,
} from '@fluentui/react-components';

import useStore from './StateStore';
import { getActiveTheme } from './CommonVariables';

const ContextMenuContext = createContext();

export const ContextMenuProvider = ({ children }) => {
    const { currentActiveThemeName } = useStore();

    const [contextMenuState, setContextMenuState] = useState({
        isVisible: false,
        menuContent: null, // Changed from items to menuContent
        position: { x: 0, y: 0 },
    });

    const showContextMenu = useCallback((clientX, clientY, menuContent) => {
        setContextMenuState({
            isVisible: true,
            menuContent,
            position: { x: clientX, y: clientY },
        });
    }, []);

    const handleOnOpenChange = (event, data) => {
        event.stopPropagation();
        if (data.open === false && data.type === 'clickOutside') {
            setContextMenuState((prev) => ({ ...prev, isVisible: false }));
        }
    };

    const wrapMenuItemClicks = useCallback((content) => {
        const processChildren = (children) => {
            return React.Children.map(children, (child) => {
                if (!React.isValidElement(child)) return child;

                let newProps = {};

                // If the child is a MenuTrigger, return it without modifications
                if (child.type.displayName === 'MenuTrigger') {
                    return child;
                }

                // If the child is a MenuItem or has an onClick prop, wrap the onClick
                if (child.type.displayName === 'MenuItem' || child.props.onClick) {
                    newProps.onClick = (...args) => {
                        // Call the original onClick if it exists
                        if (child.props.onClick) {
                            child.props.onClick(...args);
                        }
                        // Close the context menu
                        setContextMenuState((prev) => ({ ...prev, isVisible: false }));
                    };
                }

                // If the child has its own children, process them recursively
                if (child.props.children) {
                    newProps.children = processChildren(child.props.children);
                }

                return React.cloneElement(child, newProps);
            });
        };

        // Check if menuContent is a function and execute it to get the JSX
        const jsxContent = typeof content === 'function' ? content() : content;

        // Process JSX to wrap MenuItem onClicks recursively, excluding MenuTrigger
        const wrappedContent = processChildren(jsxContent.props.children);

        // Return the processed JSX
        return React.cloneElement(jsxContent, {}, wrappedContent);
    }, []);
    const renderContextMenu = () => {
        const { isVisible, menuContent, position } = contextMenuState;

        return (
            contextMenuState.isVisible &&
            ReactDOM.createPortal(
                <FluentProvider theme={getActiveTheme(currentActiveThemeName).theme}>
                    <div style={{ overflow: 'hidden' }}>                        
                        <Menu open={isVisible} onOpenChange={handleOnOpenChange} positioning={{ autoSize: true }}>
                            <MenuTrigger>
                                <Button
                                    style={{
                                        position: 'fixed',
                                        top: `${position.y}px`,
                                        left: `${position.x}px`,
                                        zIndex: 100000, // Ensure it appears above other content
                                        margin: 0,
                                        padding: 0,
                                        maxWidth: 0,
                                        maxHeight: 0,
                                        border: 0,
                                    }}
                                />
                            </MenuTrigger>
                            <MenuPopover>{wrapMenuItemClicks(menuContent)}</MenuPopover>
                        </Menu>
                    </div>
                </FluentProvider>,
                document.body // Mounting to body to avoid overflow issues
            )
        );
    };

    return (
        <ContextMenuContext.Provider value={{ showContextMenu }}>
            {children}
            {renderContextMenu()}
        </ContextMenuContext.Provider>
    );
};

export const useContextMenu = () => useContext(ContextMenuContext);
