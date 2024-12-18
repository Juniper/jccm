import * as React from 'react';
import Panels from './Panels';
import { Text } from '@fluentui/react-components';
import useStore from '../../Common/StateStore';
const TerminalLayout = () => {
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
            <Panels />
        </div>
    );
};

export default TerminalLayout;
