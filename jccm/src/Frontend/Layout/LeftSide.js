import React, { useEffect, useRef, useState } from 'react';
import { read, utils, writeFile } from 'xlsx';

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
    TableMoveBelowFilled,
    TableMoveBelowRegular,
    TriangleDownFilled,
    TriangleDownRegular,
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
import { RotatingIcon } from './ChangeIcon';

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
const ExportInventoryIcon = bundleIcon(TriangleDownFilled, TriangleDownRegular);

const LeftSide = () => {
    const { notify } = useNotify();
    const {
        isUserLoggedIn,
        deviceFacts,
        cloudInventory,
        cloudInventoryFilterApplied,
        isInventoryLoading,
        isChecking,
        settings,
        showConfigViewer,
        setShowConfigViewer,
    } = useStore();

    const [selectedTree, setSelectedTree] = useState('local');
    const [isOpenOrgFilterMenu, setIsOpenOrgFilterMenu] = useState(false);
    const [countOfDeviceWithFacts, setCountOfDeviceWithFacts] = useState(0);
    const [isExporting, setIsExporting] = useState(false);

    const ignoreCaseInName = settings.ignoreCase || false;

    useEffect(() => {
        const count = Object.keys(deviceFacts).length;
        setCountOfDeviceWithFacts(count);
    }, [deviceFacts]);

    const onTabSelect = (event, data) => {
        setSelectedTree(data.value);
    };

    const handleExport = async () => {
        setIsExporting(true);
        const deviceStats = [];
        const sites = new Set(
            Array.from(
                cloudInventory
                    .reduce((map, org) => {
                        org.inventory
                            .filter((device) => device.site_id?.length > 0)
                            .forEach((device) => {
                                const siteKey = device.site_id;
                                if (!map.has(siteKey)) {
                                    map.set(siteKey, {
                                        name: device.site_name,
                                        id: device.site_id,
                                        org: { name: org.name, id: org.id },
                                    });
                                }
                            });
                        return map;
                    }, new Map())
                    .values()
            )
        );

        for (const site of sites) {
            const orgName = site.org.name;
            const siteName = site.name;
            const siteId = site.id;
            const devices = await electronAPI.saGetDeviceStats({ siteId });
            deviceStats.push({ orgName, siteName, devices });
        }

        const inventoryForExport = [];
        const uniqueSet = new Set();

        for (const state of deviceStats) {
            const orgName = state.orgName;
            const siteName = state.siteName;
            const devices = state.devices;
            for (const dev of devices) {
                const { ip, name, model, serial, version, management_ip } = dev;

                // Create a unique key for deduplication
                const uniqueKey = `${orgName}-${siteName}-${ip}-${serial}`;

                // Add only if the key doesn't exist in the Set
                if (!uniqueSet.has(uniqueKey)) {
                    uniqueSet.add(uniqueKey);
                    inventoryForExport.push({
                        orgName,
                        siteName,
                        username: 'Your username',
                        password: 'Your password',
                        port: 22,
                        ip: ip?.length > 0 ? ip : management_ip?.length > 0 ? management_ip : 'Not Available yet',
                        name,
                        model,
                        serial,
                        version,
                    });
                }
            }
        }

        const columnMapping = {
            orgName: 'organization',
            siteName: 'site',
            ip: 'address',
            port: 'port',
            username: 'username',
            password: 'password',
            model: 'hardware model',
            version: 'os version',
            serial: 'serial number',
            name: 'host name',
        };

        // Create columnOrder for consistency and ordering in the Excel file
        const columnOrder = Object.keys(columnMapping);

        const orderedData = inventoryForExport.map((item) => {
            const orderedRow = {};
            columnOrder.forEach((key) => {
                const keys = key.split('.');
                let value = item;
                keys.forEach((k) => {
                    value = value && value[k] ? value[k] : '';
                });
                orderedRow[columnMapping[key]] = value;
            });
            return orderedRow;
        });

        // Generate worksheet from the ordered JSON data
        const ws = utils.json_to_sheet(orderedData, { header: Object.values(columnMapping), skipHeader: false });

        // Calculate column widths based on the header names
        const cols = Object.values(columnMapping).map((header) => ({
            wch: Math.max(
                header.length,
                ...orderedData.map((row) => (row[header] ? row[header].toString().length : 0))
            ),
        }));

        // Set the column widths
        ws['!cols'] = cols;

        // Create a new workbook and append the worksheet
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, 'Cloud Inventory');

        // Write the workbook to a file
        const dateStr = new Date().toISOString().slice(0, 10); // format YYYY-MM-DD
        const fileName = `cloud-inventory-${dateStr}.xlsx`;

        writeFile(wb, fileName);

        // Notify the user of the success
        notify(
            <Toast>
                <ToastTitle>The cloud inventory data has been successfully exported to an Excel file.</ToastTitle>
            </Toast>,
            { intent: 'success' }
        );
        setIsExporting(false);
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
                <TabList selectedValue={selectedTree} onTabSelect={onTabSelect} size='medium'>
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
                            <Tab id='local' value='local' icon={<StackIcon fontSize='15px' />}>
                                Local
                            </Tab>
                            {isUserLoggedIn ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Tab id='cloud' value='cloud' icon={<CloudIcon fontSize='15px' />}>
                                        Cloud
                                    </Tab>
                                    {isInventoryLoading && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'row',
                                                gap: '5px',
                                                alignItems: 'center',
                                                leftMargin: '10px',
                                            }}
                                        >
                                            <RotatingIcon
                                                Icon={ArrowSyncCircleRegular}
                                                size={12}
                                                rotationDuration='1000ms'
                                                color={tokens.colorNeutralForeground2BrandHover}
                                            />
                                            <Text size={100}>Loading large cloud inventory...</Text>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Tooltip
                                    content='Please login to a cloud service for the cloud inventory display'
                                    relationship='label'
                                >
                                    <Tab id='cloud' value='cloud' icon={<CloudIcon fontSize='15px' />} disabled={true}>
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
                            <Tooltip content='Remove Device Facts' relationship='label'>
                                <Button
                                    disabled={countOfDeviceWithFacts === 0 && Object.keys(isChecking).length === 0}
                                    appearance='subtle'
                                    icon={<ResetFactsIcon fontSize='15px' />}
                                    onClick={async () => {
                                        await eventBus.emit('reset-device-facts', { notification: true });
                                        await eventBus.emit('device-network-access-check-reset');
                                    }}
                                />
                            </Tooltip>

                            <Tooltip content='Refresh Local Inventory' relationship='label'>
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
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                justifyItems: 'center',
                                gap: '5px',
                            }}
                        >
                            <Tooltip content='Export Cloud Inventory' relationship='label'>
                                <Button
                                    style={{ paddingRight: '10px' }}
                                    appearance='subtle'
                                    disabled={isExporting}
                                    icon={
                                        isExporting ? (
                                            <RotatingIcon
                                                Icon={ArrowSyncCircleRegular}
                                                size={15}
                                                rotationDuration='1000ms'
                                                color={tokens.colorPaletteDarkOrangeForeground3}
                                            />
                                        ) : (
                                            <ExportInventoryIcon fontSize='15px' />
                                        )
                                    }
                                    onClick={() => {
                                        handleExport();
                                    }}
                                    shape='circular'
                                />
                            </Tooltip>

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
                            <Tooltip content='Refresh Cloud Inventory' relationship='label'>
                                <Button
                                    style={{ paddingRight: '15px' }}
                                    appearance='subtle'
                                    icon={<CloudSyncIcon fontSize='16px' style={{ paddingTop: '5px' }} />}
                                    onClick={async () => {
                                        await eventBus.emit('cloud-inventory-refresh', {
                                            notification: true,
                                            ignoreCaseInName,
                                        });
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
                    <div
                        style={{
                            display: selectedTree === 'cloud' ? 'flex' : 'none',
                            flexDirection: 'column',
                        }}
                    >
                        {cloudInventory.length > 0 && <InventoryTreeMenuCloud />}
                    </div>
                    <div
                        style={{
                            display: selectedTree === 'cloud' ? 'flex' : 'none',
                            flexDirection: 'column',
                        }}
                    >
                        {isOpenOrgFilterMenu && (
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
