import React, { useEffect, useRef, useState } from 'react';
import {
    Text,
    Label,
    TabList,
    Tab,
    Tooltip,
    Button,
    CompoundButton,
    Toast,
    ToastTitle,
    ToastBody,
    tokens,
} from '@fluentui/react-components';
import {
    CloudRegular,
    CloudFilled,
    TreeEvergreenRegular,
    StackRegular,
    StackFilled,
    ArrowClockwiseFilled,
    ArrowClockwiseRegular,
    ArrowSyncCircleFilled,
    ArrowSyncCircleRegular,
    CloudSyncFilled,
    CloudSyncRegular,
    FilterFilled,
    FilterRegular,
    FilterAddFilled,
    FilterAddRegular,
    MultiselectLtrFilled,
    MultiselectLtrRegular,
    TextBulletListCheckmarkFilled,
    TextBulletListCheckmarkRegular,
    SubtractCircleFilled,
    SubtractCircleRegular,
    CircleEraserRegular,
    CircleEraserFilled,
    ArrowResetFilled,
    ArrowResetRegular,
    BackspaceFilled,
    BackspaceRegular,
    bundleIcon,
} from '@fluentui/react-icons';
const { electronAPI } = window;
import _ from 'lodash';

import useStore from '../Common/StateStore';
import { useNotify } from '../Common/NotificationContext';
import InventoryTreeMenuCloud from './InventoryTreeMenuCloud';
import OrgFilterMenu from './OrgFilterMenu';
import InventoryTreeMenuLocal from './InventoryTreeMenuLocal';
import eventBus from '../Common/eventBus';

const StackIcon = bundleIcon(StackFilled, StackRegular);
const CloudIcon = bundleIcon(CloudFilled, CloudRegular);
const ArrowClockwiseIcon = bundleIcon(ArrowClockwiseFilled, ArrowClockwiseRegular);
const ArrowSyncCircleIcon = bundleIcon(ArrowSyncCircleFilled, ArrowSyncCircleRegular);
const CloudSyncIcon = bundleIcon(CloudSyncFilled, CloudSyncRegular);
const FilterIcon = bundleIcon(FilterFilled, FilterRegular);
const FilterAddIcon = bundleIcon(FilterAddFilled, FilterAddRegular);
const MultiselectIcon = bundleIcon(MultiselectLtrFilled, MultiselectLtrRegular);
const TextBulletListCheckmark = bundleIcon(TextBulletListCheckmarkFilled, TextBulletListCheckmarkRegular);
const ResetFactsIcon = bundleIcon(BackspaceFilled, BackspaceRegular);

const LeftSide = () => {
    const { notify } = useNotify();
    const {
        isUserLoggedIn,
        inventory,
        setInventory,
        deviceFacts,
        cloudInventory,
        setCloudInventory,
        cloudInventoryFilterApplied,
        setCloudInventoryFilterApplied,
        currentActiveThemeName,
    } = useStore();

    const [selectedTree, setSelectedTree] = useState('local');
    const [isOpenOrgFilterMenu, setIsOpenOrgFilterMenu] = useState(false);
    const [countOfDeviceWithFacts, setCountOfDeviceWithFacts] = useState(0);

    useEffect(() => {
        const count = Object.keys(deviceFacts).length;
        setCountOfDeviceWithFacts(count);
    }, [deviceFacts]);

    const onTabSelect = (event, data) => {
        setSelectedTree(data.value);
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                width: '100%',
                height: '100%',
                whiteSpace: 'pre-wrap', // Corrected property for wrapping text
                overflow: 'hidden',
                resize: 'none',
                marginLeft: '8px',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    height: '100%',
                }}
            >
                <TabList
                    selectedValue={selectedTree}
                    onTabSelect={onTabSelect}
                    size='medium'
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            width: '100%',
                            marginBottom: '10px',
                            backgroundColor: tokens.colorNeutralBackground1Hover,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                            }}
                        >
                            <Tab
                                id='local'
                                value='local'
                                icon={<StackIcon fontSize='15px' />}
                            >
                                Local
                            </Tab>
                            {isUserLoggedIn ? (
                                <Tab
                                    id='cloud'
                                    value='cloud'
                                    icon={<CloudIcon fontSize='15px' />}
                                >
                                    Cloud
                                </Tab>
                            ) : (
                                <Tooltip
                                    content='Please login to a cloud service for the cloud inventory display'
                                    relationship='label'
                                >
                                    <Tab
                                        id='cloud'
                                        value='cloud'
                                        icon={<CloudIcon fontSize='15px' />}
                                        disabled={true}
                                    >
                                        Cloud
                                    </Tab>
                                </Tooltip>
                            )}
                        </div>
                        <div
                            style={{
                                display: selectedTree === 'local' ? 'flex' : 'none',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center',
                                justifyItems: 'center',
                                gap: '5px',
                            }}
                        >
                            <Tooltip
                                content='Remove Device Facts'
                                relationship='label'
                            >
                                <Button
                                    disabled={countOfDeviceWithFacts === 0}
                                    appearance='subtle'
                                    icon={<ResetFactsIcon fontSize='15px' />}
                                    onClick={async () => {
                                        await eventBus.emit('reset-device-facts', { notification: true });
                                    }}
                                />
                            </Tooltip>

                            <Tooltip
                                content='Refresh Local Inventory'
                                relationship='label'
                            >
                                <Button
                                    style={{ paddingRight: '15px' }}
                                    appearance='subtle'
                                    icon={<ArrowSyncCircleIcon fontSize='15px' />}
                                    onClick={async () => {
                                        await eventBus.emit('local-inventory-refresh', { notification: true });
                                    }}
                                />
                            </Tooltip>
                        </div>
                        <div
                            style={{
                                display: selectedTree === 'cloud' ? 'flex' : 'none',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center',
                                justifyItems: 'center',
                                gap: '5px',
                            }}
                        >
                            <Tooltip
                                content={
                                    cloudInventoryFilterApplied
                                        ? 'Filter is active - Click to review or modify settings.'
                                        : 'Apply filter to organizations view settings.'
                                }
                                relationship='label'
                            >
                                <Button
                                    style={{ paddingRight: '15px' }}
                                    appearance='subtle'
                                    icon={
                                        cloudInventoryFilterApplied ? (
                                            <TextBulletListCheckmark fontSize='15px' />
                                        ) : (
                                            <MultiselectIcon fontSize='15px' />
                                        )
                                    }
                                    onClick={() => setIsOpenOrgFilterMenu(true)}
                                    shape='circular'
                                />
                            </Tooltip>
                            <Tooltip
                                content='Refresh Cloud Inventory'
                                relationship='label'
                            >
                                <Button
                                    style={{ paddingRight: '15px' }}
                                    appearance='subtle'
                                    icon={
                                        <CloudSyncIcon
                                            fontSize='16px'
                                            style={{ paddingTop: '5px' }}
                                        />
                                    }
                                    onClick={async () => {
                                        await eventBus.emit('cloud-inventory-refresh', { notification: true });
                                    }}
                                />
                            </Tooltip>
                        </div>
                    </div>
                </TabList>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        height: '100%',
                        overflowX: 'hidden',
                        overflowY: 'auto',
                    }}
                >
                    <div
                        style={{
                            display: selectedTree === 'local' ? 'flex' : 'none',
                            flexDirection: 'column',
                            height: '100%',
                        }}
                    >
                        <InventoryTreeMenuLocal />
                    </div>
                    <div style={{ display: selectedTree === 'cloud' ? 'flex' : 'none', flexDirection: 'column' }}>
                        {cloudInventory.length > 0 && <InventoryTreeMenuCloud />}
                    </div>
                    <div style={{ display: selectedTree === 'cloud' ? 'flex' : 'none', flexDirection: 'column' }}>
                        {cloudInventory.length > 0 && isOpenOrgFilterMenu && (
                            <OrgFilterMenu
                                isOpen={isOpenOrgFilterMenu}
                                onClose={() => {
                                    setIsOpenOrgFilterMenu(false);
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeftSide;
