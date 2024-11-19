import React, { useState, useRef } from 'react';

import {
    Dialog,
    DialogSurface,
    Button,
    Label,
    Text,
    Field,
    SpinButton,
    Toast,
    ToastTitle,
    ToastBody,
    Tooltip,
    Divider,
    Checkbox,
    tokens,
} from '@fluentui/react-components';

import {
    ArrowCircleRightRegular,
    PlayCircleHintRegular,
    PlayCircleHintFilled,
    ErrorCircleRegular,
    ErrorCircleFilled,
    bundleIcon,
} from '@fluentui/react-icons';

import { read, utils, writeFile } from 'xlsx';

import { RWTable } from './RWTable';
import { useNotify } from '../../Common/NotificationContext';

const ExportButtonIcon = bundleIcon(PlayCircleHintFilled, PlayCircleHintRegular);
const LogExportButtonIcon = bundleIcon(ErrorCircleFilled, ErrorCircleRegular);

export const InventorySearchResult = ({ columns, items, rowHeight, disabled, undiscoveredList }) => {
    const { notify } = useNotify(); // Correctly use the hook here
    const [isRemoveDuplicatedDevices, setIsRemoveDuplicatedDevices] = useState(false);

    const aggregateByHardwareModel = (items) => {
        return items.reduce((acc, item) => {
            const model =
                item.hardwareModel !== null &&
                typeof item.hardwareModel === 'object' &&
                !Array.isArray(item.hardwareModel)
                    ? item.hardwareModel.label
                    : item.hardwareModel;

            if (acc[model]) {
                acc[model] += 1;
            } else {
                acc[model] = 1;
            }
            return acc;
        }, {});
    };

    const aggregatedCounts = aggregateByHardwareModel(items);

    const handleExport = () => {
        if (!isRemoveDuplicatedDevices) {
            handleExportAll();
        } else {
            handleExportNoDuplicatedDevices();
        }
    };

    const handleExportAll = () => {
        // Define a mapping from object keys to Excel column names
        const columnMapping = {
            organization: 'organization',
            site: 'site',
            address: 'address',
            port: 'port',
            username: 'username',
            password: 'password',
            hardwareModel: 'hardware model',
            osName: 'os name',
            osVersion: 'os version',
            serialNumber: 'serial number',
            hostName: 'host name',
            routerId: 'router id',
            interfaceName: 'interface name',
        };

        // Create columnOrder for consistency and ordering in the Excel file
        const columnOrder = Object.keys(columnMapping);

        const orderedData = items.map((item) => {
            const orderedRow = {};
            columnOrder.forEach((key) => {
                const keys = key.split('.');
                let value = item;

                keys.forEach((k) => {
                    value = value && value[k] ? value[k] : `Your ${k}`;
                    value =
                        value !== null && typeof value === 'object' && !Array.isArray(value)
                            ? value.values.join(', ')
                            : value;
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
        utils.book_append_sheet(wb, ws, 'Local Inventory');

        // Generate a date string for the filename
        const dateStr = new Date().toISOString().slice(0, 10); // format YYYY-MM-DD
        const fileName = `found-inventory-${dateStr}.xlsx`;

        writeFile(wb, fileName);
    };

    const handleExportNoDuplicatedDevices = () => {
        // Define a mapping from object keys to Excel column names
        const columnMapping = {
            organization: 'Organization',
            site: 'Site',
            address: 'Address',
            port: 'Port',
            username: 'Username',
            password: 'Password',
            hardwareModel: 'Hardware Model',
            osName: 'OS Name',
            osVersion: 'OS Version',
            serialNumber: 'Serial Number',
            hostName: 'Host Name',
            routerId: 'Router ID',
            interfaceName: 'Interface Name',
            prunedAddresses: 'Pruned Addresses', // New column for removed addresses
        };

        // Helper function to compare IPv4 addresses numerically
        const compareIPv4 = (ip1, ip2) => {
            const toNumeric = (ip) => ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0);
            return toNumeric(ip1) - toNumeric(ip2);
        };

        // Deduplicate items based on routerId and prioritize addresses
        const deduplicatedItems = Object.values(
            items.reduce((acc, item) => {
                const { routerId, address, interfaceName } = item;

                if (!routerId) {
                    // Skip items without a routerId
                    return acc;
                }

                if (!acc[routerId]) {
                    // First occurrence of this routerId
                    acc[routerId] = { ...item, prunedAddresses: [] }; // Initialize prunedAddresses
                } else {
                    const currentItem = acc[routerId];
                    const isLoopback = (name) => name && name.toLowerCase().startsWith('lo');

                    // Decide whether to prune the current item or replace the existing one
                    if (isLoopback(currentItem.interfaceName) && !isLoopback(interfaceName)) {
                        currentItem.prunedAddresses.push(`${currentItem.address}@${currentItem.interfaceName}`);
                        acc[routerId] = { ...item, prunedAddresses: [...currentItem.prunedAddresses] };
                    } else if (!isLoopback(currentItem.interfaceName) && !isLoopback(interfaceName)) {
                        if (compareIPv4(currentItem.address, address) > 0) {
                            currentItem.prunedAddresses.push(`${currentItem.address}@${currentItem.interfaceName}`);
                            acc[routerId] = { ...item, prunedAddresses: [...currentItem.prunedAddresses] };
                        } else {
                            currentItem.prunedAddresses.push(`${address}@${interfaceName}`);
                        }
                    } else {
                        currentItem.prunedAddresses.push(`${address}@${interfaceName}`);
                    }
                }

                return acc;
            }, {})
        );

        // Prepare data for export
        const columnOrder = Object.keys(columnMapping);
        const orderedData = deduplicatedItems.map((item) => {
            const orderedRow = {};
            columnOrder.forEach((key) => {
                if (key === 'prunedAddresses') {
                    // Join pruned addresses into a single string
                    orderedRow[columnMapping[key]] = item.prunedAddresses.join(', ') || 'N/A';
                } else {
                    const value = item[key] ?? 'N/A';
                    orderedRow[columnMapping[key]] = value;
                }
            });
            return orderedRow;
        });

        // Generate worksheet from the ordered JSON data
        const ws = utils.json_to_sheet(orderedData, {
            header: Object.values(columnMapping),
            skipHeader: false,
        });

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
        utils.book_append_sheet(wb, ws, 'Local Inventory');

        // Generate a date string for the filename
        const dateStr = new Date().toISOString().slice(0, 10); // format YYYY-MM-DD
        const fileName = `found-inventory-${dateStr}.xlsx`;

        writeFile(wb, fileName);
    };

    const logExport = () => {
        console.log('Exporting log data...');
        console.log('Undiscovered list:', undiscoveredList);

        // Define the column headers
        const columnMapping = {
            device: 'Device',
            status: 'Status',
            message: 'Message',
        };

        // Prepare the data for Excel
        const orderedData = undiscoveredList.map((item) =>
            Object.fromEntries(
                Object.entries(columnMapping).map(([key, header]) => [
                    header,
                    item[key] !== undefined ? item[key] : 'N/A',
                ])
            )
        );

        // Generate the worksheet and set column headers
        const ws = utils.json_to_sheet(orderedData, { header: Object.values(columnMapping) });

        // Auto-adjust column widths
        ws['!cols'] = Object.values(columnMapping).map((header) => ({
            wch: Math.max(
                header.length,
                ...orderedData.map((row) => (row[header] ? row[header].toString().length : 0))
            ),
        }));

        // Create a workbook and append the worksheet
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, 'Log Data');

        // Create the filename and export
        const fileName = `log-data-${new Date().toISOString().slice(0, 10)}.xlsx`;
        writeFile(wb, fileName);
    };

    const onChangeIsRemoveDuplicatedDevices = async (event) => {
        const checked = event.currentTarget.checked;
        setIsRemoveDuplicatedDevices(checked === true);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', margin: 0, padding: 0 }}>
            <RWTable columns={columns} items={items} rowHeight={rowHeight} size='extra-small' />

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '100%',
                    marginTop: '0px',
                }}
            >
                <div
                    style={{
                        width: '100%',
                        height: 0,
                        overflow: 'hidden',
                        borderBottom: `1px solid ${tokens.colorBrandBackground2Hover}`,
                        marginBottom: '5px',
                    }}
                />

                <div
                    style={{
                        display: 'flex',
                        width: '100%',
                        // overflow: 'hidden',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingLeft: '10px',
                        paddingRight: '10px',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '10px',
                            width: 'calc(100% - 100px)',
                            alignItems: 'center',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '10px',
                                width: '130px',
                            }}
                        >
                            <Text size={100} font='numeric'>
                                {'Total devices: '}
                                <Text size={100} font='monospace' weight='bold'>
                                    {items?.length}
                                </Text>
                            </Text>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                                gap: '10px',
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                width: '100%',
                            }}
                        >
                            {Object.entries(aggregatedCounts).map(([model, count]) => (
                                <div
                                    key={model}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text size={100} font='numeric' wrap={false}>
                                        {`${model}: `}
                                        <Text size={100} font='monospace' weight='bold' wrap={false}>
                                            {count}
                                        </Text>
                                    </Text>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '10px',
                        }}
                    >
                        <Tooltip
                            content={
                                <Text align='center' size={200}>
                                    Export the address list of devices that have not been discovered.
                                </Text>
                            }
                            positioning='above'
                        >
                            <Button
                                disabled={undiscoveredList?.length === 0 || disabled}
                                icon={<LogExportButtonIcon />}
                                shape='circular'
                                appearance='subtle'
                                size='small'
                                style={{ whiteSpace: 'nowrap' }}
                                onClick={logExport}
                            >
                                Log Export
                            </Button>
                        </Tooltip>

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                            }}
                        >
                            <Tooltip
                                content={
                                    <Text align='center' size={200}>
                                        Export found devices and facts to an inventory file in Excel format.
                                    </Text>
                                }
                                positioning='above'
                            >
                                <Button
                                    disabled={items?.length === 0 || disabled}
                                    icon={<ExportButtonIcon />}
                                    shape='circular'
                                    appearance='subtle'
                                    size='small'
                                    onClick={handleExport}
                                >
                                    Export
                                </Button>
                            </Tooltip>

                            <Tooltip
                                content={
                                    <Text align='center' size={200}>
                                        Use Router-ID to identify duplicate devices and retain only one address.
                                        Addresses on non-loopback interfaces are prioritized, with the lowest IP address
                                        selected for uniqueness.
                                    </Text>
                                }
                                positioning='above'
                            >
                                <Checkbox
                                    disabled={items?.length === 0 || disabled}
                                    shape='square'
                                    style={{
                                        transform: 'scale(0.7)',
                                        transformOrigin: 'left',
                                        whiteSpace: 'nowrap',
                                        marginRight: '-70px', // Reduce extra space caused by scaling
                                    }}
                                    label='Remove Duplicated Devices'
                                    checked={isRemoveDuplicatedDevices}
                                    onChange={onChangeIsRemoveDuplicatedDevices}
                                />
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
