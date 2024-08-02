import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
    Button,
    Text,
    Table,
    TableBody,
    TableCell,
    TableRow,
    TableHeader,
    TableHeaderCell,
    TableCellActions,
    Tooltip,
    createTableColumn,
    useTableFeatures,
    useFluent,
    useScrollbarWidth,
    useTableSelection,
    tokens,
} from '@fluentui/react-components';

import { DeleteFilled, DeleteRegular, bundleIcon } from '@fluentui/react-icons';

const DeleteIcon = bundleIcon(DeleteFilled, DeleteRegular);

const RenderRow = ({ index, style, data, columns, onDeleteSubnet, disabled }) => {
    const row = data[index];
    const [showPassword, setShowPassword] = useState(false);

    const handleDoubleClick = () => {
        setShowPassword((prevState) => !prevState);
    };

    const firstColumnName = columns[0].name;

    return (
        <div
            style={{ ...style, display: 'flex', width: '100%', overflow: 'hidden' }}
            key={row.item.subnet}
        >
            <TableRow
                style={{
                    display: 'flex',
                    width: '100%',
                }}
            >
                {columns.map((col) => (
                    <TableCell
                        key={col.name}
                        style={{
                            flex: `0 1 ${col.width}%`,
                        }}
                    >
                        {onDeleteSubnet && col.name === firstColumnName ? (
                            <TableCellActions>
                                <Button
                                    disabled={disabled}
                                    icon={<DeleteIcon style={{ fontSize: '15px' }} />}
                                    appearance='transparent'
                                    onClick={() => onDeleteSubnet(index)}
                                    size='small'
                                />
                            </TableCellActions>
                        ) : undefined}

                        {col.name === 'password' ? (
                            <Text
                                truncate
                                wrap={false}
                                size={200}
                                font='numeric'
                                onDoubleClick={handleDoubleClick}
                            >
                                {showPassword ? row.item.password : '•'.repeat(row.item?.password?.length)}
                            </Text>
                        ) : (
                            <Text
                                truncate
                                wrap={false}
                                size={200}
                                font='numeric'
                            >
                                {row.item[col.name]}
                            </Text>
                        )}
                    </TableCell>
                ))}
            </TableRow>
        </div>
    );
};

export const RWTable = ({
    columns,
    items,
    rowHeight = 30,
    size = 'extra-small',
    onDeleteSubnet = undefined,
    headerBackgroundColor = tokens.colorNeutralBackground1,
    backgroundColor = tokens.colorNeutralBackground1,
    disabled,
}) => {
    const { targetDocument } = useFluent();
    const scrollbarWidth = useScrollbarWidth({ targetDocument });
    const containerRef = useRef(null);
    const [adjustedWidth, setAdjustedWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const [delayRender, setDelayRender] = useState(true);

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });

            // Introduce delay when the window size changes to ensure accurate container size calculation.
            setDelayRender(false);
            const timer = setTimeout(() => {
                setDelayRender(true);
            }, 300);
            return () => clearTimeout(timer);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useLayoutEffect(() => {
        if (containerRef.current) {
            const listHeight = containerRef.current.clientHeight;
            setContainerHeight(listHeight - rowHeight * 1.2);
            const contentHeight = items.length * rowHeight;

            if (contentHeight > listHeight) {
                setAdjustedWidth(scrollbarWidth);
            } else {
                setAdjustedWidth(0);
            }
        }
    }, [items.length, scrollbarWidth, windowSize]);

    const {
        getRows,
        selection: { toggleRow, isRowSelected },
    } = useTableFeatures(
        {
            columns: columns.map((col) => createTableColumn({ columnId: col.name, header: col.name })),
            items,
        },
        [
            useTableSelection({
                selectionMode: 'single',
                defaultSelectedItems: new Set([0, 1]),
            }),
        ]
    );

    const rows = getRows((row) => {
        return {
            ...row,
        };
    });

    return (
        <div
            ref={containerRef}
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                background: backgroundColor,
            }}
        >
            <Table
                noNativeElements
                style={{ width: '100%', height: '100%' }}
                size={size}
            >
                <TableHeader
                    style={{
                        width: '100%',
                        background: headerBackgroundColor,
                        borderBottom: `1px solid ${tokens.colorBrandBackground}`,
                    }}
                >
                    <TableRow style={{ display: 'flex', width: `calc(100% - ${adjustedWidth}px)` }}>
                        {columns.map((col) => (
                            <TableHeaderCell
                                key={col.name}
                                style={{ flex: `0 1 ${col.width}%` }}
                            >
                                {col.name === 'password' ? (
                                    <Tooltip
                                        content='Double-click to show the password'
                                        relationship='label'
                                        withArrow
                                        positioning='above-start'
                                    >
                                        <span>{col.label}</span>
                                    </Tooltip>
                                ) : (
                                    col.label
                                )}
                            </TableHeaderCell>
                        ))}
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {delayRender && (
                        <List
                            height={containerHeight}
                            itemCount={items.length}
                            itemSize={rowHeight}
                            itemData={rows}
                            width='100%'
                        >
                            {(props) => (
                                <RenderRow
                                    {...props}
                                    disabled={disabled}
                                    columns={columns}
                                    onDeleteSubnet={onDeleteSubnet}
                                />
                            )}
                        </List>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};
