import React, { useEffect } from 'react';
import { Button, Tooltip, Text, tokens } from '@fluentui/react-components';
import { HexagonThreeFilled, HexagonThreeRegular } from '@fluentui/react-icons';

import useStore from '../Common/StateStore';
import { RotatingIcon } from './ChangeIcon';

export const BastionHostButton = () => {
    const { settings, toggleBastionHostActive } = useStore();

    // Determine the status of bastionHost
    const getBastionHostStatus = () => {
        const bastionHost = settings?.bastionHost || {};
        const status =
            Object.keys(bastionHost).length === 0 ? 'not configured' : bastionHost.active ? 'active' : 'inactive';
        return status;
    };

    const getBastionHostName = () => {
        const name = settings?.bastionHost ? `Host: ${settings.bastionHost.host} Port: ${settings.bastionHost.port}` : '';
        return name;
    };

    // Get button details based on bastionHost status
    const getButtonDetails = () => {
        const status = getBastionHostStatus();

        switch (status) {
            case 'not configured':
                return {
                    icon: <HexagonThreeRegular fontSize={18} />,
                    color: tokens.colorNeutralStroke1Hover,
                };
            case 'inactive':
                return {
                    icon: <HexagonThreeFilled fontSize={15} />,
                    color: tokens.colorNeutralStroke1Hover,
                };
            case 'active':
                return {
                    icon: <HexagonThreeFilled fontSize={15} />,
                    color: tokens.colorNeutralForeground2BrandHover,
                };
            default:
                return {
                    icon: <HexagonThreeRegular fontSize={18} />,
                    color: tokens.colorNeutralStroke1Hover,
                };
        }
    };

    const { icon, color } = getButtonDetails();

    return (
        <Tooltip
            content={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <Text size={200}>
                        Bastion Host is {getBastionHostStatus()}.
                    </Text>
                    <Text size={100}>
                        {getBastionHostName()}
                    </Text>
                </div>
            }
            relationship='label'
            withArrow
            positioning='above-end'
        >
            <Button
                icon={icon}
                appearance='transparent'
                shape='circular'
                onClick={toggleBastionHostActive}
                style={{ color }}
                tabIndex={-1}
            />
        </Tooltip>
    );
};
