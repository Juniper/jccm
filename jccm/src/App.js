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

    return (
        <div>
            <FluentProvider theme={getActiveTheme(currentActiveThemeName).theme}>
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
