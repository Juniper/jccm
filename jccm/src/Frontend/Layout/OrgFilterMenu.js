import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogSurface,
    Button,
    Input,
    Field,
    Text,
    Textarea,
    Label,
    Switch,
    SpinButton,
    TableBody,
    TableCell,
    TableRow,
    Table,
    TableHeader,
    TableHeaderCell,
    TableCellLayout,
    TableCellActions,
    TableSelectionCell,
    useTableFeatures,
    TableColumnDefinition,
    TableRowId,
    useTableSelection,
    createTableColumn,
} from '@fluentui/react-components';
const { electronAPI } = window;

import {
    AttachTextRegular,
    AttachTextFilled,
    Dismiss24Regular,
    Dismiss24Filled,
    SendCopyFilled,
    SendCopyRegular,
    PersonInfoFilled,
    PersonInfoRegular,
    FilterFilled,
    FilterRegular,
    PersonCircleRegular,
    CloudCubeRegular,
    LocationRegular,
    OrganizationRegular,
    DirectionsRegular,
    ArrowSyncCircleFilled,
    ArrowSyncCircleRegular,
    bundleIcon,
} from '@fluentui/react-icons';
import _ from 'lodash';

import { useMessageBar } from '../Common/MessageBarContext';
import useStore from '../Common/StateStore';
import eventBus from '../Common/eventBus';

const AttachText = bundleIcon(AttachTextFilled, AttachTextRegular);
const Dismiss24 = bundleIcon(Dismiss24Filled, Dismiss24Regular);
const SendCopy = bundleIcon(SendCopyFilled, SendCopyRegular);
const PersonInfo = bundleIcon(PersonInfoFilled, PersonInfoRegular);
const FilterIcon = bundleIcon(FilterFilled, FilterRegular);
const ArrowSyncCircle = bundleIcon(ArrowSyncCircleFilled, ArrowSyncCircleRegular);

export const OrgFilterMenu = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const { cloudInventory, setCloudInventory, setCloudInventoryFilterApplied } = useStore();
    const [selectedRows, setSelectedRows] = useState(() => new Set([]));
    const [orgList, setOrgList] = useState([]);
    const [orgFilters, setOrgFilters] = useState([]);

    const { showMessageBar } = useMessageBar();

    useEffect(() => {
        const fetchOrgFilter = async () => {
            try {
                const data = await electronAPI.saOrgFilter({ method: 'GET', body: null });
                if (data.orgFilter) {
                    setOrgList(data.orgs);
                    const filters = data.filters;
                    setOrgFilters(filters);

                    const selectedIndices = data.orgs
                        .map((org, index) => (!filters[org.id] ? index : -1))
                        .filter((index) => index !== -1);

                    setSelectedRows(new Set(selectedIndices));
                }
            } catch (error) {
                console.error('Failed to fetch organization filter!', error);
            }
        };

        fetchOrgFilter();
    }, []); // Dependency array is empty, so this runs only once on mount

    const columns = [
        { columnKey: 'path', label: 'Path' },
        { columnKey: 'name', label: 'Organization' },
    ];

    const items = orgList.map((org) => ({
        path: { label: org.path, icon: <DirectionsRegular /> },
        name: { label: org.name, icon: <OrganizationRegular /> },
    }));

    const {
        getRows,
        selection: { allRowsSelected, someRowsSelected, toggleAllRows, toggleRow, isRowSelected },
    } = useTableFeatures(
        {
            columns,
            items,
        },
        [
            useTableSelection({
                selectionMode: 'multiselect',
                selectedItems: selectedRows,
                onSelectionChange: (e, data) => setSelectedRows(data.selectedItems),
            }),
        ]
    );

    const rows = getRows((row) => {
        const selected = isRowSelected(row.rowId);
        return {
            ...row,
            onClick: (e) => toggleRow(e, row.rowId),
            selected,
            appearance: selected ? 'brand' : 'none',
        };
    });

    const refreshCloudInventory = async () => {
        await eventBus.emit('user-session-check');
    };

    const onSave = async () => {
        const unselectedOrgs = {};
        const unselectedRowIndexes = [];

        orgList.forEach((org, index) => {
            if (!selectedRows.has(index)) {
                unselectedRowIndexes.push(index);
            }
        });

        unselectedRowIndexes.forEach((unselectedIndex) => {
            const org = orgList[unselectedIndex];
            unselectedOrgs[org.id] = org; // Changed from filters to unselectedOrgs for clarity
        });

        try {
            const data = await electronAPI.saOrgFilter({ method: 'SET', body: { filters: unselectedOrgs } });
            if (data.orgFilter) {
                console.log('Organization filter was updated successfully.');
                showMessageBar({ message: 'Organization filter was updated successfully.', intent: 'success' });

                await refreshCloudInventory();
            } else {
                console.log('No changes were made to the organization filter.');
                showMessageBar({ message: 'No changes were made to the organization filter.', intent: 'warning' });
            }
        } catch (error) {
            console.error('Failed to save organization filter:', error);
            showMessageBar({ message: 'Failed to save organization filter. Please try again.', intent: 'error' });
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
        onClose();
    };

    return isOpen ? (
        <Dialog
            modalType='non-modal' // modelType must be 'non-model' to allow input working.
            open={isOpen}
            modalProps={{
                isBlocking: true,
            }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                minWidth: '50%',
                minHeight: '70%',
            }}
        >
            <DialogSurface
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minWidth: '50%',
                    minHeight: '70%',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        resize: 'none',
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '5px', alignItems: 'center' }}>
                            <FilterIcon style={{ fontSize: '20px' }} />
                            <Text size={400}>Cloud Inventory Filter Settings Panel</Text>
                        </div>
                        <Button
                            appearance='subtle'
                            shape='circular'
                            onClick={() => setTimeout(onClose, 0)}
                            icon={<Dismiss24 />}
                        ></Button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                icon={<ArrowSyncCircle />}
                                appearance='subtle'
                                shape='circular'
                                onClick={onSave}
                            >
                                Save
                            </Button>
                        </div>

                        <Table size='extra-small'>
                            <TableHeader>
                                <TableRow>
                                    <TableSelectionCell
                                        checked={allRowsSelected ? true : someRowsSelected ? 'mixed' : false}
                                        onClick={toggleAllRows}
                                    />

                                    {columns.map((column) => (
                                        <TableHeaderCell key={column.columnKey}>{column.label}</TableHeaderCell>
                                    ))}
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {rows.map(({ item, selected, onClick, onKeyDown, appearance }) => (
                                    <TableRow
                                        key={`${item.path.label}/${item.name.label}}`}
                                        onClick={onClick}
                                        appearance={appearance}
                                    >
                                        <TableSelectionCell checked={selected} />
                                        <TableCell>
                                            <TableCellLayout media={item.path.icon}>{item.path.label}</TableCellLayout>
                                        </TableCell>
                                        <TableCell>
                                            <TableCellLayout media={item.name.icon}>{item.name.label}</TableCellLayout>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogSurface>
        </Dialog>
    ) : null;
};

export default OrgFilterMenu;
