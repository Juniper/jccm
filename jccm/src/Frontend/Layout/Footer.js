import React, { useEffect, useState } from 'react';

import {
    Label,
    Button,
    Tooltip,
    Text,
    tokens,
} from '@fluentui/react-components';
import {
    HexagonThreeRegular,
    HexagonThreeFilled,
    WindowDevToolsRegular,
    WindowDevToolsFilled,
    WrenchRegular,
    WrenchFilled,
    bundleIcon,
} from '@fluentui/react-icons';

import useStore from '../Common/StateStore';
import { BastionHostButton } from './BastionHostButton';
import { CircleIcon } from './ChangeIcon';
import DeviceModels from './DeviceModels';

const { electronAPI } = window;
const ConsoleWindowIcon = bundleIcon(WrenchRegular, WrenchFilled);

export default () => {
    const {
        settings,
        isUserLoggedIn,
        inventory,
        deviceFacts,
        cloudDevices,
        cloudInventory,
        consoleWindowOpen,
        setConsoleWindowOpen,
    } = useStore();

    const [isBastionHostEmpty, setIsBastionHostEmpty] = useState(false);
    const [countOfOrgOrSiteUnmatched, setCountOfOrgOrSiteUnmatched] =
        useState(0);

    const countOfDeviceFacts = Object.keys(deviceFacts).length;
    const countOfAdoptedDevices = Object.values(deviceFacts).filter((fact) => {
        if (fact.vc) {
            for (const member of fact.vc) {
                const device = cloudDevices[member.serial];
                if (device) return device;
            }
        }

        return cloudDevices[fact.systemInformation?.serialNumber];
    }).length;

    const doesSiteNameExist = (orgName, siteName) => {
        const org = cloudInventory.find((item) => item?.name === orgName);

        // If the organization is not found, return false
        if (!org) {
            return false;
        }

        // Check if the site name exists within the organization's sites array
        const siteExists = org.sites?.some((site) => site?.name === siteName);

        return siteExists;
    };

    const countNonMatchingInventoryItems = () => {
        let nonMatchingCount = 0;
        inventory.forEach((item) => {
            const existence = doesSiteNameExist(item.organization, item.site);
            if (!existence) {
                nonMatchingCount++;
            }
        });

        return nonMatchingCount;
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            const count = countNonMatchingInventoryItems();
            setCountOfOrgOrSiteUnmatched(count);
        }, 3000); // 3 seconds delay

        return () => clearTimeout(timer); // Cleanup timer on component unmount
    }, [inventory, cloudDevices]);

    useEffect(() => {
        const bastionHost = settings?.bastionHost || {};
        const isEmpty = Object.keys(bastionHost).length === 0;
        setIsBastionHostEmpty(isEmpty);
    }, [settings]);

    const handleOnConsoleWindow = () => {
        setConsoleWindowOpen(!consoleWindowOpen);
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: '100%',
                alignItems: 'center',
                overflow: 'visible',
            }}
        >
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
                {!isBastionHostEmpty && <BastionHostButton />}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '20px',
                        paddingLeft: '5px',
                    }}
                >
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
                    {isUserLoggedIn && countOfOrgOrSiteUnmatched > 0 && (
                        <Label
                            size='small'
                            style={{ color: tokens.colorNeutralForeground4 }}
                        >
                            Devices with unmatched organization or site:{' '}
                            {countOfOrgOrSiteUnmatched}
                        </Label>
                    )}
                </div>
            </div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div style={{ display: 'flex', paddingRight: '15px' }}>
                    <DeviceModels />
                </div>
                <div
                    style={{
                        display:
                            settings?.consoleWindowButtonShow || false
                                ? 'flex'
                                : 'none',
                        flexDirection: 'row',
                        marginRight: '10px',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        overflow: 'visible',
                    }}
                >
                    <Tooltip
                        content={
                            <Text size={100}>
                                {!consoleWindowOpen
                                    ? 'Open Console Window'
                                    : 'Close Console Window'}
                            </Text>
                        }
                        positioning='before'
                        withArrow
                    >
                        <Button
                            icon={
                                <CircleIcon
                                    Icon={ConsoleWindowIcon}
                                    size='16px'
                                    iconSize='12px'
                                    color={
                                        tokens.colorNeutralForeground3BrandPressed
                                    }
                                />
                            }
                            size='small'
                            appearance='subtle'
                            shape='circular'
                            onClick={handleOnConsoleWindow}
                        />
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};
