import React, { useEffect } from 'react';
import { Button, Tooltip, tokens } from '@fluentui/react-components';
import { HexagonThreeFilled, HexagonThreeRegular } from '@fluentui/react-icons';

import useStore from '../Common/StateStore';
import { RotatingIcon } from './ChangeIcon';

export const BastionHostButton = () => {
    const { settings, toggleBastionHostActive } = useStore();
    const bastionHost = settings?.bastionHost || {};

    // Determine the status of bastionHost
    const bastionHostStatus = () => {
        if (Object.keys(bastionHost).length === 0) return 'not configured';
        return bastionHost.active ? 'active' : 'inactive';
    };

    // Get button details based on bastionHost status
    const getButtonDetails = () => {
        const status = bastionHostStatus();

        switch (status) {
            case 'not configured':
                return {
                    icon: <HexagonThreeRegular fontSize={18} />,
                    color: tokens.colorNeutralStroke1Hover,
                };
            case 'active':
                return {
                    icon: (
                        <RotatingIcon
                            Icon={HexagonThreeFilled}
                            size={18}
                            rotationDuration='7000ms'
                            color={tokens.colorNeutralForeground2BrandHover}
                        />
                    ),

                    color: tokens.colorNeutralForeground2BrandHover,
                };
            case 'inactive':
                return {
                    icon: <HexagonThreeFilled fontSize={15} />,
                    color: tokens.colorNeutralStrokeAccessibleHover,
                };
            default:
                return {
                    icon: <HexagonThreeRegular fontSize={18} />,
                    color: tokens.colorNeutralStroke1Hover,
                };
        }
    };

    const { icon, color } = getButtonDetails();

    // useEffect(() => {
    //     if (process.env.NODE_ENV !== 'production') {
    //         console.log('BastionHostButton: bastionHost:', settings?.bastionHost);
    //     }
    // }, [settings?.bastionHost]);

    return (
        <Tooltip
            content={`Bastion Host is ${bastionHostStatus()}.`}
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
