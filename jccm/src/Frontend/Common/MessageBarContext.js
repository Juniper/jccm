import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FluentProvider, MessageBar, MessageBarTitle, MessageBarBody } from '@fluentui/react-components'; // Ensure correct import path
import useStore from './StateStore';
import { getActiveTheme } from './CommonVariables';

const MessageBarContext = createContext();

export const MessageBarProvider = ({ children }) => {
    const { currentActiveThemeName } = useStore();

    const [messageBarProps, setMessageBarProps] = useState({
        isVisible: false,
        message: '',
        intent: 'info',
        timeout: 3000,
        position: 'bottom',
    });

    const showMessageBar = useCallback(({message, intent = 'info', timeout = 3000, position = 'bottom'}) => {
        setMessageBarProps({
            isVisible: true,
            message,
            intent,
            timeout,
            position,
        });
    }, []);

    const hideMessageBar = useCallback(() => {
        setMessageBarProps((prevProps) => ({
            ...prevProps,
            isVisible: false,
        }));
    }, []);

    useEffect(() => {
        if (messageBarProps.isVisible && messageBarProps.timeout > 0) {
            const timer = setTimeout(() => {
                hideMessageBar();
            }, messageBarProps.timeout);
            return () => clearTimeout(timer);
        }
    }, [messageBarProps.isVisible]);

    const renderMessageBar = () => {
        const { isVisible, message, intent, position } = messageBarProps;
        const id = Date.now(); // Simple unique ID

        return isVisible
            ? ReactDOM.createPortal(
                  <FluentProvider theme={getActiveTheme(currentActiveThemeName).theme}>
                      <div
                          style={
                              position == 'bottom'
                                  ? {
                                        position: 'fixed',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        width: '100vw',
                                        zIndex: 9000000,
                                    }
                                  : {
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        width: '100vw',
                                        zIndex: 9000000,
                                    }
                          }
                      >
                          <MessageBar
                              key={id}
                              intent={intent}
                              style={{
                                  width: '100%',
                                  maxWidth: '100vw',
                                  boxSizing: 'border-box', // Include padding and border in the element's total width
                              }}
                          >
                              <MessageBarBody>
                                  <MessageBarTitle>Intent {intent}</MessageBarTitle>
                                  {message}
                              </MessageBarBody>
                          </MessageBar>
                      </div>
                  </FluentProvider>,
                  document.body // Mounting to body to avoid overflow issues
              )
            : null;
    };

    return (
        <MessageBarContext.Provider value={{ showMessageBar, hideMessageBar }}>
            {children}
            {renderMessageBar()}
        </MessageBarContext.Provider>
    );
};

export const useMessageBar = () => useContext(MessageBarContext);
