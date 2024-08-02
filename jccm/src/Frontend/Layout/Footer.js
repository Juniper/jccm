import React, { useEffect } from 'react';

import { Label, Button, tokens } from '@fluentui/react-components';
import { HexagonThreeRegular, HexagonThreeFilled, bundleIcon } from '@fluentui/react-icons';

import useStore from '../Common/StateStore';
import { BastionHostButton } from './BastionHostButton';

export default () => {
    const { inventory, deviceFacts, cloudDevices } = useStore();
    const countOfDeviceFacts = Object.keys(deviceFacts).length;
    const countOfAdoptedDevices = Object.values(deviceFacts).filter(
        (facts) => cloudDevices[facts?.serialNumber]
    ).length;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                paddingLeft: '10px',
                justifyContent: 'flex-start',
                alignItems: 'center',
                overflow: 'visible',
            }}
        >
            {/* <BastionHostButton/> */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', paddingLeft: '5px' }}>
                <Label
                    size='small'
                    style={{ color: tokens.colorNeutralForeground4 }}
                >
                    Total Local Inventory Devices: {inventory.length}
                </Label>
                <Label
                    size='small'
                    style={{ color: tokens.colorNeutralForeground4 }}
                >
                    Local Devices with Facts: {countOfDeviceFacts}
                </Label>
                <Label
                    size='small'
                    style={{ color: tokens.colorNeutralForeground4 }}
                >
                    Adopted Devices: {countOfAdoptedDevices}
                </Label>
            </div>
        </div>
    );
};
