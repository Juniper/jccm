import * as React from 'react';
import Panels from './Panels';

const TerminalLayout = () => {

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
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
