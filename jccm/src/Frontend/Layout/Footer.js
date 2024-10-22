import React, { useEffect, useState } from 'react';

import {
    Label,
    Button,
    Tooltip,
    Text,
    ToolbarDivider,
    CounterBadge,
    makeStyles,
    Link,
    tokens,
} from '@fluentui/react-components';
import {
    HexagonThreeRegular,
    HexagonThreeFilled,
    WindowDevToolsRegular,
    WindowDevToolsFilled,
    WrenchRegular,
    WrenchFilled,
    CheckmarkCircleFilled,
    FireFilled,
    bundleIcon,
} from '@fluentui/react-icons';

import useStore from '../Common/StateStore';
import { BastionHostButton } from './BastionHostButton';
import { CircleIcon } from './ChangeIcon';
import DeviceModels from './DeviceModels';
import eventBus from '../Common/eventBus';

const { electronAPI } = window;
const ConsoleWindowIcon = bundleIcon(WrenchRegular, WrenchFilled);

const tooltipStyles = makeStyles({
    tooltipMaxWidthClass: {
        maxWidth: '800px',
    },
});

export default () => {
    const styles = tooltipStyles();

    const {
        settings,
        isUserLoggedIn,
        inventory,
        deviceFacts,
        cloudDevices,
        cloudInventory,
        consoleWindowOpen,
        setConsoleWindowOpen,
        deviceNetworkCondition,
        resetDeviceNetworkConditionAll,
        supportedDeviceModels,
    } = useStore();

    const [isBastionHostEmpty, setIsBastionHostEmpty] = useState(false);
    const [countOfOrgOrSiteUnmatched, setCountOfOrgOrSiteUnmatched] = useState(0);

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

    const deviceConditions = Object.values(deviceNetworkCondition);
    const countOfDeviceNetworkCondition = deviceConditions.length;

    const deviceModelsValidation = settings?.deviceModelsValidation || false;

    const validateDeviceModel = (deviceModel) => {
        if (!deviceModelsValidation) return true;
        if (!isUserLoggedIn) return true;
        return deviceModel?.toUpperCase() in supportedDeviceModels;
    };

    let countOfDnsIssue = 0;
    let countOfRouteIssue = 0;
    let countOfAccessIssue = 0;
    let countOfNoIssue = 0;

    const { countOfInvalidModel, unsupportedModels } = Object.values(deviceFacts).reduce(
        (acc, { systemInformation: { hardwareModel } = {} }) => {
            if (!validateDeviceModel(hardwareModel)) {
                acc.countOfInvalidModel++;
                if (hardwareModel) acc.unsupportedModels.add(hardwareModel);
            }
            return acc;
        },
        { countOfInvalidModel: 0, unsupportedModels: new Set() }
    );

    deviceConditions.forEach((device) => {
        if (device.dns === false) {
            countOfDnsIssue++;
        } else if (device.route === false) {
            countOfRouteIssue++;
        } else if (device.access === false) {
            countOfAccessIssue++;
        } else {
            countOfNoIssue++;
        }
    });

    const countOfUnknownIssue =
        countOfDeviceNetworkCondition - countOfDnsIssue - countOfRouteIssue - countOfAccessIssue - countOfNoIssue;

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
                        alignItems: 'center',
                    }}
                >
                    <Label size='small' style={{ color: tokens.colorNeutralForeground4 }}>
                        Total Local Inventory Device{inventory.length > 1 ? 's' : ''}: {inventory.length}
                    </Label>
                    <Label size='small' style={{ color: tokens.colorNeutralForeground4 }}>
                        Local Device{countOfDeviceFacts > 1 ? 's' : ''} with Facts: {countOfDeviceFacts}
                    </Label>
                    <Label size='small' style={{ color: tokens.colorNeutralForeground4 }}>
                        Adopted Device{countOfAdoptedDevices > 1 ? 's' : ''}: {countOfAdoptedDevices}
                    </Label>
                    {isUserLoggedIn && (
                        <>
                            {countOfInvalidModel > 0 && (
                                <Tooltip
                                    content={
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: `repeat(${Math.min(
                                                    3,
                                                    unsupportedModels.size
                                                )}, 1fr)`, // Adjust columns based on size
                                                gap: '8px',
                                            }}
                                        >
                                            {Array.from(unsupportedModels).map((model, index) => (
                                                <Text key={index} size={100}>
                                                    {model}
                                                </Text>
                                            ))}
                                        </div>
                                    }
                                    relationship='label'
                                    withArrow='above'
                                >
                                    <Label size='small' style={{ color: tokens.colorNeutralForeground4 }}>
                                        Product Model{countOfInvalidModel > 1 ? 's' : ''} Unsupported :{' '}
                                        {countOfInvalidModel}
                                    </Label>
                                </Tooltip>
                            )}
                            {countOfOrgOrSiteUnmatched > 0 && (
                                <Label size='small' style={{ color: tokens.colorNeutralForeground4 }}>
                                    Device{countOfOrgOrSiteUnmatched > 1 ? 's' : ''} with unmatched organization or
                                    site: {countOfOrgOrSiteUnmatched}
                                </Label>
                            )}
                        </>
                    )}
                </div>
                {countOfDeviceNetworkCondition > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingLeft: '5px',
                        }}
                    >
                        <ToolbarDivider />

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '20px',
                                paddingLeft: '5px',
                                alignItems: 'center',
                            }}
                        >
                            <Tooltip
                                content={{
                                    className: styles.tooltipMaxWidthClass,
                                    children: (
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            {countOfNoIssue > 0 && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'flex-start',
                                                        gap: '5px',
                                                    }}
                                                >
                                                    <CheckmarkCircleFilled
                                                        style={{
                                                            color: tokens.colorPaletteLightGreenForeground3,
                                                            fontSize: '11px',
                                                        }}
                                                    />

                                                    <Text
                                                        style={{
                                                            color: tokens.colorNeutralForeground4,
                                                            fontSize: '10px',
                                                        }}
                                                    >
                                                        {`Access to the service endpoint is ready: ${countOfNoIssue}`}
                                                    </Text>
                                                </div>
                                            )}
                                            {countOfDnsIssue > 0 && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'flex-start',
                                                        gap: '5px',
                                                    }}
                                                >
                                                    <FireFilled
                                                        style={{
                                                            fontSize: '12px',
                                                            color: tokens.colorPaletteRedForeground3,
                                                        }}
                                                    />
                                                    <Text
                                                        style={{
                                                            color: tokens.colorNeutralForeground4,
                                                            fontSize: '10px',
                                                        }}
                                                    >
                                                        {`DNS lookup failure for the service endpoint: ${countOfDnsIssue}`}
                                                    </Text>
                                                </div>
                                            )}
                                            {countOfRouteIssue > 0 && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'flex-start',
                                                        gap: '5px',
                                                    }}
                                                >
                                                    <FireFilled
                                                        style={{
                                                            fontSize: '12px',
                                                            color: tokens.colorPaletteRedForeground3,
                                                        }}
                                                    />
                                                    <Text
                                                        style={{
                                                            color: tokens.colorNeutralForeground4,
                                                            fontSize: '10px',
                                                        }}
                                                    >
                                                        {`No route to the service endpoint: ${countOfRouteIssue}`}
                                                    </Text>
                                                </div>
                                            )}
                                            {countOfAccessIssue > 0 && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'flex-start',
                                                        gap: '5px',
                                                    }}
                                                >
                                                    <FireFilled
                                                        style={{
                                                            fontSize: '12px',
                                                            color: tokens.colorPaletteRedForeground3,
                                                        }}
                                                    />
                                                    <Text
                                                        style={{
                                                            color: tokens.colorNeutralForeground4,
                                                            fontSize: '10px',
                                                        }}
                                                    >
                                                        {`No access to the service endpoint: ${countOfAccessIssue}`}
                                                    </Text>
                                                </div>
                                            )}
                                            {countOfUnknownIssue > 0 && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'flex-start',
                                                        gap: '5px',
                                                    }}
                                                >
                                                    <FireFilled
                                                        style={{
                                                            fontSize: '12px',
                                                            color: tokens.colorPaletteRedForeground3,
                                                        }}
                                                    />
                                                    <Text
                                                        style={{
                                                            color: tokens.colorNeutralForeground4,
                                                            fontSize: '10px',
                                                        }}
                                                    >
                                                        {`Unknown issue: ${countOfUnknownIssue}`}
                                                    </Text>
                                                </div>
                                            )}
                                        </div>
                                    ),
                                }}
                                relationship='description'
                                withArrow
                                positioning='above'
                                appearance='normal'
                            >
                                <Link
                                    appearance='subtle'
                                    style={{
                                        fontSize: '12px',
                                        color: tokens.colorNeutralForeground4,
                                    }}
                                    onClick={() => eventBus.emit('device-network-access-check-reset')}
                                >
                                    {`Reset Network Access Check: ${countOfDeviceNetworkCondition} Devices`}
                                </Link>
                            </Tooltip>
                        </div>
                    </div>
                )}
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
                        display: settings?.consoleWindowButtonShow || false ? 'flex' : 'none',
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
                                {!consoleWindowOpen ? 'Open Console Window' : 'Close Console Window'}
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
                                    color={tokens.colorNeutralForeground3BrandPressed}
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
