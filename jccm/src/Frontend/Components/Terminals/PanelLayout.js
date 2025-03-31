import * as React from 'react';
import Panel from './Panel';
import { Text } from '@fluentui/react-components';
import useStore from '../../Common/StateStore';
const PanelLayout = () => {
    const {
        tabs,
        getTabProperties,
        setTabProperties,
        selectedTabValue,
        removeTab,
        settings,
        getIsConfigTrackingViewOpen,
    } = useStore();

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                width: '100%',
                height: '100%',
                flexWrap: 'nowrap',
                resize: 'none',
                overflow: 'hidden',
            }}
        >
            {tabs.map((tab, index) => {
                const isVisible = tab.path === selectedTabValue;

                return (
                    <div key={index} style={{ display: isVisible ? 'flex' : 'none', width: '100%', height: '100%' }}>
                        <Panel tab={tab} isVisible={isVisible} />
                    </div>
                );
            })}
        </div>
    );
};

export default PanelLayout;
