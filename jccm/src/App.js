import React from 'react';
import { FluentProvider } from '@fluentui/react-components';
import { getActiveTheme } from './Frontend/Common/CommonVariables';
import { MessageBarProvider } from './Frontend/Common/MessageBarContext';
import { NotificationProvider } from './Frontend/Common/NotificationContext';
import { ContextMenuProvider } from './Frontend/Common/ContextMenuContext';
import { MainEventProcessor } from './Frontend/MainEventProcessor';
import { Main } from './Frontend/Main';
import useStore from './Frontend/Common/StateStore';

function App() {
    const { currentActiveThemeName } = useStore();
    const zIndex = {
        background: 0,
        content: 1,
        overlay: 1000,
        popup: 2000,
        messages: 3000,
        floating: 4000,
        priority: 5000,
        debug: 6000,
      };
    
    
    return (
        <div style={{ overflow: 'hidden' }}>
            <FluentProvider zIndex={zIndex} theme={getActiveTheme(currentActiveThemeName).theme}>
                <MessageBarProvider>
                    <NotificationProvider>
                        <ContextMenuProvider>
                            <MainEventProcessor />
                            <Main />
                        </ContextMenuProvider>
                    </NotificationProvider>
                </MessageBarProvider>
            </FluentProvider>
        </div>
    );
}

export default App;
