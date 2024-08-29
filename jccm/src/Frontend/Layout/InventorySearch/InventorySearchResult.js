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
    tokens,
} from '@fluentui/react-components';

import {
    ArrowCircleRightRegular,
    PlayCircleHintRegular,
    PlayCircleHintFilled,
    bundleIcon,
} from '@fluentui/react-icons';

import { read, utils, writeFile } from 'xlsx';

import { RWTable } from './RWTable';
import { useNotify } from '../../Common/NotificationContext';

const ExportButtonIcon = bundleIcon(PlayCircleHintFilled, PlayCircleHintRegular);

export const InventorySearchResult = ({ columns, items, rowHeight, disabled }) => {
    const { notify } = useNotify(); // Correctly use the hook here

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', margin: 0, padding: 0 }}>
            <RWTable
                columns={columns}
                items={items}
                rowHeight={rowHeight}
                size='extra-small'
            />

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
                            <Text
                                size={100}
                                font='numeric'
                            >
                                {'Total devices: '}
                                <Text
                                    size={100}
                                    font='monospace'
                                    weight='bold'
                                >
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
                                    <Text
                                        size={100}
                                        font='numeric'
                                        wrap={false}
                                    >
                                        {`${model}: `}
                                        <Text
                                            size={100}
                                            font='monospace'
                                            weight='bold'
                                            wrap={false}
                                        >
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
                            justifyContent: 'flex-end',
                            gap: '10px',
                        }}
                    >
                        <Tooltip
                            content={
                                <Text align='center'>
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
                    </div>
                </div>
            </div>
        </div>
    );
};
