import React, { useState, useRef, useEffect, forwardRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import validator from 'validator';
import { read, utils, writeFile } from 'xlsx';
import _ from 'lodash';

import {
    Dialog,
    DialogSurface,
    Button,
    Label,
    Link,
    CounterBadge,
    Text,
    Field,
    Toast,
    ToastTitle,
    ToastBody,
} from '@fluentui/react-components';
import {
    TrayItemAddRegular,
    DismissFilled,
    DismissRegular,
    DismissCircleFilled,
    DismissCircleRegular,
    AddCircleFilled,
    AddCircleRegular,
    SubtractCircleFilled,
    SubtractCircleRegular,
    CheckmarkCircleFilled,
    CheckmarkCircleRegular,
    ArrowSyncCircleFilled,
    ArrowSyncCircleRegular,
    ChevronCircleLeftFilled,
    ChevronCircleLeftRegular,
    ArrowCircleDownFilled,
    ArrowCircleDownRegular,
    ArrowCircleUpFilled,
    ArrowCircleUpRegular,
    SendFilled,
    SendRegular,
    ShareAndroidFilled,
    ShareAndroidRegular,
    MergeFilled,
    MergeRegular,
    ArrowCurveDownLeftFilled,
    ArrowCurveDownLeftRegular,
    bundleIcon,
} from '@fluentui/react-icons';
const { electronAPI } = window;

import * as Constants from '../Common/CommonVariables';
import useStore from '../Common/StateStore';
import { useNotify } from '../Common/NotificationContext';
import eventBus from '../Common/eventBus';

const Dismiss = bundleIcon(DismissFilled, DismissRegular);
const AddCircle = bundleIcon(AddCircleFilled, AddCircleRegular);
const SubtractCircle = bundleIcon(SubtractCircleFilled, SubtractCircleRegular);
const CheckmarkCircle = bundleIcon(CheckmarkCircleFilled, CheckmarkCircleRegular);
const ArrowSyncCircle = bundleIcon(ArrowSyncCircleFilled, ArrowSyncCircleRegular);
const ChevronCircleLeft = bundleIcon(ChevronCircleLeftFilled, ChevronCircleLeftRegular);
const ArrowCircleDown = bundleIcon(ArrowCircleDownFilled, ArrowCircleDownRegular);
const ArrowCircleUp = bundleIcon(ArrowCircleUpFilled, ArrowCircleUpRegular);
const Send = bundleIcon(SendFilled, SendRegular);
const ShareAndroid = bundleIcon(ShareAndroidFilled, ShareAndroidRegular);
const MergeIcon = bundleIcon(MergeFilled, MergeRegular);
const OverrideIcon = bundleIcon(ArrowCurveDownLeftFilled, ArrowCurveDownLeftRegular);

const isValidPort = (port) => {
    const portNum = parseInt(port, 10);
    return portNum >= 1 && portNum <= 65535;
};

// const validateData = (data) => {
//     return data.every((row) => Object.values(row).every((value) => value !== '' && value !== null));
// };

const validateData = (data) => {
    const requiredFields = ['organization', 'site', 'address', 'port', 'username', 'password'];

    return data.every((row, rowIndex) => {
        return requiredFields.every((field) => {
            if (row[field] === '' || row[field] === null) {
                console.log(`Invalid value in row ${rowIndex + 1}, key "${field}": ${row[field]}`);
                return false;
            }
            return true;
        });
    });
};

const InventoryLocalImportForm = ({ isOpen, onClose, title, importedInventory }) => {
    if (!isOpen) return null;
    const { notify } = useNotify(); // Correctly use the hook here
    const { currentActiveThemeName, inventory, setInventory } = useStore();
    const data = JSON.parse(JSON.stringify(importedInventory));
    const [rowData, setRowData] = useState(data);
    const [isValid, setIsValid] = useState(validateData(data));
    const gridRef = useRef(null);

    const PasswordCellRenderer = ({ value, node, api }) => {
        const [isEditing, setIsEditing] = useState(false);

        useEffect(() => {
            // Define event listeners within useEffect to ensure they have access to the current state and props
            const startEditingListener = () => {
                setIsEditing(
                    api
                        .getEditingCells()
                        .some((cell) => cell.rowIndex === node.rowIndex && cell.column.colId === 'password')
                );
            };
            const stopEditingListener = () => {
                setIsEditing(false);
            };

            // Attach event listeners
            api.addEventListener('cellEditingStarted', startEditingListener);
            api.addEventListener('cellEditingStopped', stopEditingListener);

            // Cleanup function to remove event listeners
            return () => {
                if (!api.isDestroyed()) {
                    api.removeEventListener('cellEditingStarted', startEditingListener);
                    api.removeEventListener('cellEditingStopped', stopEditingListener);
                }
            };
        }, [api, node]);

        // I found a workaround that involves using a <Link/> component from Fluent UI React.
        // This component seems to influence how AG Grid handles tab key navigation, allowing it to move focus to the next cell.
        // It appears that the Fluent UI components interact with AG Grid's keyboard event handling in a way that facilitates this improved navigation.
        return (
            <span>
                {isEditing ? value : '•'.repeat(value?.length)}
                <Link />
            </span>
        );
    };

    const onDataChange = (params) => {
        setIsValid(validateData(rowData));
    };

    const onOverride = async () => {
        setInventory(rowData);
        await electronAPI.saSetLocalInventory({inventory: rowData});
        await eventBus.emit('reset-device-facts', { notification: false });

        setTimeout(() => {
            onClose();
        }, 300);
    };

    const onMerge = async () => {
        const createCompositeKey = (item) => {
            return `${item.organization}/${item.site}/${item.address}/${item.port}`;
        };

        const mergedDataMap = new Map();

        inventory.forEach((item) => {
            mergedDataMap.set(createCompositeKey(item), item);
        });

        rowData.forEach((item) => {
            mergedDataMap.set(createCompositeKey(item), item);
        });

        const mergedData = Array.from(mergedDataMap.values());

        setInventory(mergedData);
        await electronAPI.saSetLocalInventory({inventory: mergedData});
        await eventBus.emit('reset-device-facts', { notification: false });

        setTimeout(() => {
            onClose();
        }, 300);
    };

    const getRowStyle = (params) => {
        if (params.node.data.isModified) {
            return { backgroundColor: '#ffcccb' }; // Light red background for changed rows
        }
        return null;
    };

    const columns = [
        {
            headerName: 'No.',
            valueGetter: 'node.rowIndex + 1',
            width: 70,
            pinned: 'left',
        },
        {
            field: 'organization',
            headerName: 'Organization',
            editable: true,
            sortable: true,
            filter: 'agTextColumnFilter',
        },
        {
            field: 'site',
            headerName: 'Site',
            editable: true,
            sortable: true,
            filter: 'agTextColumnFilter',
        },
        {
            field: 'address',
            headerName: 'IP Address',
            width: '150',
            editable: true,
            sortable: true,
            filter: 'agTextColumnFilter',
            valueSetter: (params) => {
                // Trim and check the new value
                const newValue = params.newValue.trim();
                if (validator.isIP(newValue, 4)) {
                    params.data.address = newValue;
                    return true; // value has changed
                } else {
                    notify(
                        <Toast>
                            <ToastTitle>Address Validation Error</ToastTitle>
                            <ToastBody subtitle='Value Validation'>
                                <Text>Ensure your input is a valid IPv4 address.</Text>
                            </ToastBody>
                        </Toast>,
                        { intent: 'error' }
                    );
                    return false; // value has not changed
                }
            },
            cellEditor: 'agTextCellEditor',
        },
        {
            field: 'port',
            headerName: 'Port',
            width: '100',
            editable: true,
            sortable: true,
            filter: 'agNumberColumnFilter',
            valueSetter: (params) => {
                const newValue = parseInt(params.newValue, 10);
                if (isValidPort(newValue)) {
                    params.data.port = newValue;
                    return true; // value has changed
                } else {
                    notify(
                        <Toast>
                            <ToastTitle>Port Validation Error</ToastTitle>
                            <ToastBody subtitle='Value Validation'>
                                <Text>Ensure your input is a valid L4 network port number.</Text>
                            </ToastBody>
                        </Toast>,
                        { intent: 'error' }
                    );
                    return false; // value has not changed, invalid input
                }
            },
        },
        {
            field: 'username',
            headerName: 'Username',
            width: '150',
            editable: true,
            sortable: true,
            filter: 'agTextColumnFilter',
        },
        {
            field: 'password',
            headerName: 'Password',
            width: '150',
            editable: true,
            cellRenderer: PasswordCellRenderer,
        },
    ];

    return (
        <Dialog
            open={isOpen}
            onDismiss={onClose}
            modalProps={{ isBlocking: true }}
        >
            <DialogSurface
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    minWidth: 'calc(100% - 200px)',
                    minHeight: `${Constants.sharedInventoryWindowHeight}px`,
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                    {title}
                    <Button
                        onClick={onClose}
                        shape='circular'
                        appearance='subtle'
                        icon={<Dismiss />}
                        size='small'
                    />
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '10px',
                        justifyContent: 'flex-end',
                        marginTop: '20px',
                    }}
                >
                    <Button
                        onClick={onOverride}
                        shape='circular'
                        appearance='subtle'
                        icon={<OverrideIcon />}
                        size='small'
                        disabled={!isValid}
                    >
                        Override
                    </Button>
                    <Button
                        onClick={onMerge}
                        shape='circular'
                        appearance='subtle'
                        icon={<MergeIcon />}
                        size='small'
                        disabled={!isValid}
                    >
                        Merge
                    </Button>
                </div>
                <div
                    className={
                        currentActiveThemeName.toLowerCase().includes('dark')
                            ? 'ag-theme-balham-dark'
                            : 'ag-theme-balham'
                    }
                    style={{
                        width: '100%',
                        height: `${Constants.sharedInventoryWindowHeight + 50}px`,
                        marginTop: '10px',
                    }}
                    id='commonInventoryGrid'
                >
                    <AgGridReact
                        ref={gridRef}
                        columnDefs={columns}
                        rowData={rowData}
                        rowSelection='multiple'
                        onGridColumnsChanged={(params) => params.api.sizeColumnsToFit()}
                        onGridSizeChanged={(params) => params.api.sizeColumnsToFit()}
                        getRowStyle={getRowStyle}
                        onCellValueChanged={onDataChange}
                        onRowValueChanged={onDataChange}
                        suppressCellFocus={false}
                        tabIndex={0} // Ensures grid can be focused
                        onGridReady={(params) => {
                            const gridDiv = document.querySelector('#commonInventoryGrid'); // the browser's autocomplete event is treated as key input event in AG-grid... causing a event.key undefined error.
                            if (gridDiv) {
                                gridDiv.addEventListener(
                                    'keydown',
                                    (event) => {
                                        if (!event.key) {
                                            event.preventDefault();
                                            event.stopPropagation();
                                        }
                                    },
                                    true
                                );
                            }
                            params.api.sizeColumnsToFit();
                        }}
                    />
                </div>
            </DialogSurface>
        </Dialog>
    );
};

export default InventoryLocalImportForm;
