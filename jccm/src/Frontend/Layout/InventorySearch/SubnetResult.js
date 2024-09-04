import React, { useState, useRef, useEffect } from 'react';

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
    PlayCircleRegular,
    bundleIcon,
} from '@fluentui/react-icons';

import { read, utils, writeFile } from 'xlsx';

import useStore from '../../Common/StateStore';
import { RWTable } from './RWTable';
import { useNotify } from '../../Common/NotificationContext';
import { getHostCountMultiple } from './InventorySearchUtils';
import { BastionHostButton } from '../BastionHostButton';

const RotatePlayCircleFilled = (props) => (
    <PlayCircleHintFilled
        style={{ transform: 'rotate(180deg)' }}
        {...props}
    />
);
const RotatePlayCircleRegular = (props) => (
    <PlayCircleRegular
        style={{ transform: 'rotate(180deg)' }}
        {...props}
    />
);

const ExportButtonIcon = bundleIcon(PlayCircleHintFilled, PlayCircleRegular);
const ImportButtonIcon = bundleIcon(RotatePlayCircleFilled, RotatePlayCircleRegular);

export const SubnetResult = ({ columns, items, onDeleteSubnet, onImportSubnet = undefined, rowHeight, disabled }) => {
    const { notify } = useNotify(); // Correctly use the hook here
    const fileInputRef = useRef(null);
    const { settings } = useStore();
    const [isBastionHostEmpty, setIsBastionHostEmpty] = useState(false);

    // Calculate the total sum of hostCounts
    const totalHostCount = getHostCountMultiple(items);

    const onFileImport = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileImport = (event) => {
        const file = event.target.files[0]; // Get the first file
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                let json = utils.sheet_to_json(worksheet);

                // Eliminate redundant rows
                const uniqueRows = Array.from(new Set(json.map(JSON.stringify))).map(JSON.parse);

                // Count organizations, sites, and devices
                const subnets = new Set();
                const ports = new Set();
                const usernames = new Set();
                const passwords = new Set();

                uniqueRows.forEach((row) => {
                    subnets.add(row.subnet);
                    ports.add(row.port);
                    usernames.add(row.username);
                    passwords.add(row.password);
                });

                onImportSubnet(uniqueRows);

                notify(
                    <Toast>
                        <ToastTitle>
                            The local subnets file has been successfully imported into the local subnets view.
                            <br />
                            {subnets.size} subnets were imported.
                        </ToastTitle>
                    </Toast>,
                    { intent: 'success' }
                );
            };
            reader.readAsArrayBuffer(file);
        }
        fileInputRef.current.value = '';
    };

    const handleExport = () => {
        // Define a mapping from object keys to Excel column names
        const columnMapping = {
            subnet: 'subnet',
            port: 'port',
            username: 'username',
            password: 'password',
        };

        // Create columnOrder for consistency and ordering in the Excel file
        const columnOrder = Object.keys(columnMapping);

        const orderedData = items.map((item) => {
            const orderedRow = {};
            columnOrder.forEach((key) => {
                const keys = key.split('.');
                let value = item;
                keys.forEach((k) => {
                    // value = value && value[k] ? value[k] : '';
                    value = value && value[k] ? value[k] : `Your ${k}`;
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
        utils.book_append_sheet(wb, ws, 'Network Subnets');

        // Generate a date string for the filename
        const dateStr = new Date().toISOString().slice(0, 10); // format YYYY-MM-DD
        const fileName = `network-subnets-${dateStr}.xlsx`;

        writeFile(wb, fileName);
    };

    useEffect(() => {
        const bastionHost = settings?.bastionHost || {};
        const isEmpty = Object.keys(bastionHost).length === 0;
        setIsBastionHostEmpty(isEmpty);
    }, [settings]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', margin: 0, padding: 0 }}>
            <RWTable
                columns={columns}
                items={items}
                rowHeight={rowHeight}
                onDeleteSubnet={onDeleteSubnet}
                size='extra-small'
                disabled={disabled}
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
                        overflow: 'hidden',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '10px',
                            alignItems: 'center',
                            marginLeft: '5px',
                        }}
                    >
                        {!isBastionHostEmpty && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    height: '20px',
                                    overflow: 'visible',
                                }}
                            >
                                <BastionHostButton />
                            </div>
                        )}

                        <Text size={100}>Total Subnets: {items?.length}</Text>
                        <Text size={100}>Total Hosts: {totalHostCount.toLocaleString()}</Text>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                        <Tooltip
                            content={<Text align='center'>Import network subnets to the subnet table.</Text>}
                            positioning='above'
                        >
                            <Button
                                disabled={disabled}
                                icon={<ImportButtonIcon />}
                                shape='circular'
                                appearance='subtle'
                                size='small'
                                onClick={() => {
                                    onFileImport();
                                }}
                            >
                                Import
                            </Button>
                        </Tooltip>

                        <Tooltip
                            content={<Text align='center'>Export network subnets to a file in Excel format.</Text>}
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

                        <input
                            type='file'
                            ref={fileInputRef}
                            onChange={handleFileImport}
                            style={{ display: 'none' }}
                            accept='.xlsx, .xls'
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
