import React, { useState, useRef, useEffect } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import _, { set } from 'lodash';

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
    CounterBadge,
    Input,
    tokens,
} from '@fluentui/react-components';
import {
    ArrowCircleDownFilled,
    ArrowCircleDownRegular,
    ArrowCircleUpFilled,
    ArrowCircleUpLeftFilled,
    ArrowCircleUpLeftRegular,
    ArrowCircleUpRegular,
    ArrowCollapseAllFilled,
    ArrowCollapseAllRegular,
    ArrowCurveDownLeftFilled,
    ArrowCurveDownLeftRegular,
    ArrowCurveUpRightFilled,
    ArrowCurveUpRightRegular,
    DismissFilled,
    DismissRegular,
    FilterFilled,
    FilterRegular,
    bundleIcon,
} from '@fluentui/react-icons';

const { electronAPI } = window;

import { useNotify } from '../../Common/NotificationContext';
import { SubnetInputForm } from './SubnetInputForm';
import { InventorySearchControl } from './InventorySearchControl';
import { InventorySearchResult } from './InventorySearchResult';
import { SubnetResult } from './SubnetResult';
import { cleanupSubnet } from './InventorySearchUtils';

const Dismiss = bundleIcon(DismissFilled, DismissRegular);
const FilterIcon = bundleIcon(FilterFilled, FilterRegular);
const CollapseFilterIcon = bundleIcon(ArrowCurveDownLeftFilled, ArrowCurveDownLeftRegular);
const CloseFilterIcon = bundleIcon(ArrowCurveUpRightFilled, ArrowCurveUpRightRegular);

const InventorySearchCard = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const [isSearchRun, setIsSearchRun] = useState(false);
    const [isOpenFilter, setIsOpenFilter] = useState(false);
    const [checkedModelTypes, setCheckedModelTypes] = useState([]);
    const deviceTypes = ['EX', 'ACX', 'PTX', 'SRX', 'QFX', 'MX'];
    const [customModelName, setCustomModelName] = useState('');
    const customInputRef = useRef(null);

    const Title = () => <Text size={500}>Network Search</Text>;
    const { notify } = useNotify();

    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        const enableTabKeyEventCapture = async () => {
            await electronAPI.saAddKeyDownEvent(['Escape']);
        };
        const disableTabKeyEventCapture = async () => {
            await electronAPI.saDeleteKeyDownEvent();
        };

        enableTabKeyEventCapture();

        return () => {
            disableTabKeyEventCapture();
        };
    }, []);

    electronAPI.onEscKeyDown(() => {
        onClose();
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);

        // Cleanup the event listener when the component unmounts
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [subnets, setSubnets] = useState([]);

    const subnetColumns = [
        { label: 'Subnet', name: 'subnet', width: 30 },
        { label: 'Port', name: 'port', width: 20 },
        { label: 'Username', name: 'username', width: 30 },
        { label: 'Password', name: 'password', width: 20 },
    ];

    const [facts, setFacts] = useState([]);
    const [filteredFacts, setFilteredFacts] = useState([]);
    const [undiscoveredList, setUndiscoveredList] = useState([]);

    const factsColumns = [
        { label: 'Address', name: 'address', width: 12 },
        { label: 'Port', name: 'port', width: 5 },
        { label: 'Username', name: 'username', width: 8 },
        { label: 'Password', name: 'password', width: 8 },
        { label: 'Host Name', name: 'hostName', width: 10 },
        { label: 'Hardware Model', name: 'hardwareModel', width: 10 },
        { label: 'Serial Number', name: 'serialNumber', width: 10 },
        { label: 'OS Name', name: 'osName', width: 10 },
        { label: 'OS Version', name: 'osVersion', width: 10 },
        { label: 'Router Id', name: 'routerId', width: 10 },
        { label: 'Interface', name: 'interfaceName', width: 10 },
    ];

    const containerRef = useRef(null);

    const initialLeftSideWidth = 500;
    const [leftWidth, setLeftWidth] = useState(initialLeftSideWidth);
    const [leftResizerColor, setLeftResizerColor] = useState(tokens.colorNeutralBackground1Pressed);
    const [isLeftResizerHovered, setIsLeftResizerHovered] = useState(false);
    const [isLeftResizerActive, setIsLeftResizerActive] = useState(false);
    const resizeColorTimeoutRef = useRef(null); // Ref to store the timeout ID

    const leftMinWidth = 450;
    const leftMaxWidth = 800;
    const resizeKnobWidth = 3;

    useEffect(() => {
        const loadSubnets = async () => {
            try {
                const result = await electronAPI.saLoadSubnets();
                if (result.status && Array.isArray(result.subnets)) {
                    setSubnets(result.subnets);
                } else {
                    console.error('Failed to load subnets or subnets is not an array');
                }
            } catch (error) {
                console.error('Error loading subnets:', error);
            }
        };

        loadSubnets();
    }, []); // Empty dependency array ensures this runs once on mount

    useEffect(() => {
        const updatedFacts = facts.filter((fact) => {
            const hardwareModelLower = fact.hardwareModel.toLowerCase();
            const customModelLower = customModelName.trim().toLowerCase();

            const matchesModelType =
                checkedModelTypes.length > 0 &&
                checkedModelTypes.some((type) => hardwareModelLower.includes(type.toLowerCase()));

            const matchesCustomModelName = customModelLower && hardwareModelLower.includes(customModelLower);

            // ✅ Exclude if it matches either → keep only if it matches neither
            return !matchesModelType && !matchesCustomModelName;
        });

        setFilteredFacts(updatedFacts);
    }, [customModelName, checkedModelTypes, facts]);

    const handleLeftMouseMove = (e) => {
        if (!containerRef.current) return;

        // console.log('leftMouseMove', e.clientX, e.clientY);
        // Calculate new width based on mouse position
        const newWidth = e.clientX;
        if (newWidth >= leftMinWidth && newWidth <= leftMaxWidth) {
            // console.log('newWidth', newWidth);

            setLeftWidth(newWidth - 50);
        }
    };

    const handleLeftMouseUp = () => {
        setIsLeftResizerActive(false);
        // console.log('mouse up');

        window.removeEventListener('mousemove', handleLeftMouseMove);
        window.removeEventListener('mouseup', handleLeftMouseUp);
    };

    const handleLeftMouseDown = (e) => {
        setIsLeftResizerActive(true);
        // console.log('mouse down');

        window.addEventListener('mousemove', handleLeftMouseMove);
        window.addEventListener('mouseup', handleLeftMouseUp);
        e.preventDefault();
    };

    const handleMouseEnter = () => {
        setIsLeftResizerHovered(true);
        // console.log('mouse enter');

        clearTimeout(resizeColorTimeoutRef.current);
        resizeColorTimeoutRef.current = setTimeout(() => {
            setLeftResizerColor(tokens.colorPaletteMarigoldBackground3);
        }, 300);
    };

    const handleMouseLeave = () => {
        setIsLeftResizerHovered(false);
        if (!isLeftResizerActive) setLeftResizerColor(tokens.colorNeutralBackground1Pressed);
        clearTimeout(resizeColorTimeoutRef.current);
    };

    const onAddSubnet = (inputSubnet) => {
        setSubnets((prevSubnets) => {
            const cleanSubnet = cleanupSubnet(inputSubnet.subnet);
            const newSubnet = { ...inputSubnet, subnet: cleanSubnet };

            // Check if the new subnet already exists in the list
            const subnetExists = prevSubnets.some(
                (subnet) =>
                    subnet.subnet === newSubnet.subnet &&
                    `${subnet.port}` === `${newSubnet.port}` &&
                    subnet.username === newSubnet.username &&
                    subnet.password === newSubnet.password
            );

            // If it doesn't exist, add the new subnet to the list
            if (!subnetExists) {
                const v = [...prevSubnets, newSubnet];
                electronAPI.saSaveSubnets({ subnets: v });
                return v;
            }

            // If it exists, return the previous list unchanged
            notify(
                <Toast>
                    <ToastTitle>Subnet addition</ToastTitle>
                    <ToastBody subtitle='Addition failed'>
                        <Text>The Subnet was not added for overlapping.</Text>
                    </ToastBody>
                </Toast>,
                { intent: 'error' }
            );
            return prevSubnets;
        });
    };

    const deleteSubnet = async (index) => {
        const updatedSubnets = subnets.filter((_, i) => i !== index);
        setSubnets(updatedSubnets);
        await electronAPI.saSaveSubnets({ subnets: updatedSubnets });
    };

    const onDeleteSubnet = (index) => {
        // console.log('onDeleteSubnet: ', index);
        deleteSubnet(index);
        notify(
            <Toast>
                <ToastTitle>Subnet deleted</ToastTitle>
                <ToastBody subtitle='Deletion Successful'>
                    <Text>The Subnet is deleted successfully.</Text>
                </ToastBody>
            </Toast>,
            { intent: 'success' }
        );
    };

    const onImportSubnet = (importedSubnets) => {
        const allowedKeys = ['subnet', 'port', 'username', 'password'];

        const filteredSubnets = importedSubnets.map((subnetObj) => {
            return Object.keys(subnetObj)
                .filter((key) => allowedKeys.includes(key))
                .reduce((obj, key) => {
                    obj[key] = subnetObj[key];
                    return obj;
                }, {});
        });

        setSubnets(filteredSubnets);
    };

    const startCallback = async (flag) => {
        setIsSearchRun(flag);
        setFacts([]);
        setFilteredFacts([]);
    };

    const endCallback = async (flag) => {
        setIsSearchRun(flag);
    };

    const onAddFact = async (fact) => {
        setFacts((prevFacts) => {
            return [...prevFacts, fact];
        });
    };

    const onAddUndiscoveredList = async (undiscoveredList) => {
        setUndiscoveredList((prevUndiscoveredList) => {
            return [...prevUndiscoveredList, undiscoveredList];
        });
    };

    const handleCheckModelToogle = (label) => {
        let updatedTypes;
        if (checkedModelTypes.includes(label)) {
            updatedTypes = checkedModelTypes.filter((l) => l !== label);
        } else {
            updatedTypes = [...checkedModelTypes, label];
        }
        setCheckedModelTypes(updatedTypes);
    };

    const handleCustomModelFilter = (value) => {
        setCustomModelName(value);
    };

    return (
        <Dialog open={isOpen} onDismiss={onClose} modalProps={{ isBlocking: true }}>
            <DialogSurface
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    minWidth: `${windowSize.width * 0.98}px`,
                    height: `${windowSize.height * 0.9}px`,
                    overflow: 'hidden', // Hide overflowed footer block edges
                    padding: 0,
                    border: 0, // Hide border lines
                    background: tokens.colorNeutralBackground1,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        height: '100%',
                        flex: 1,
                        padding: '15px 15px 5px 15px',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Header - Dismiss */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                        }}
                    >
                        <Title />
                        <Button
                            onClick={onClose}
                            shape='circular'
                            appearance='subtle'
                            icon={<Dismiss />}
                            size='small'
                        />
                    </div>

                    {/* Center - Main content panel */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            height: '100%',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Subnet input/output */}
                        <div
                            ref={containerRef}
                            style={{
                                display: 'flex',
                                flexDirection: 'column', // Align items vertically
                                justifyContent: 'flex-start', // Align items at the start of the main axis (top)
                                alignItems: 'flex-start', // Align items at the start of the cross axis (left)
                                alignContent: 'flex-start', // Align lines of items at the start of the cross axis (left)
                                gap: '10px', // Space between items
                                marginRight: '10px', // Right margin for the container
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    width: `${leftWidth}px`,
                                    height: '100%',
                                    background: tokens.colorNeutralBackground1,
                                }}
                            >
                                {/* Subnet Input Form */}
                                <div style={{ width: '100%', margin: 0, padding: 0 }}>
                                    <SubnetInputForm onAddSubnet={onAddSubnet} disabled={isSearchRun} />
                                </div>

                                <div style={{ width: '100%', marginTop: '10px', marginBottom: '5px', padding: 0 }}>
                                    <Divider appearance='strong'>Subnets</Divider>
                                </div>

                                {/* Subnet Table Display */}
                                <div
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        margin: 0,
                                        padding: 0,
                                        overflow: 'hidden',
                                    }}
                                >
                                    <SubnetResult
                                        disabled={isSearchRun}
                                        columns={subnetColumns}
                                        items={subnets}
                                        onDeleteSubnet={onDeleteSubnet}
                                        onImportSubnet={onImportSubnet}
                                        rowHeight={30}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Resizer knob */}
                        <div
                            onMouseDown={handleLeftMouseDown}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: `${resizeKnobWidth}px`,
                                height: '100%',
                                cursor: 'ew-resize',
                                backgroundColor:
                                    isLeftResizerHovered || isLeftResizerActive
                                        ? leftResizerColor
                                        : tokens.colorNeutralBackground1Pressed,
                            }}
                        />

                        {/* Facts search/output */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                width: '100%',
                                height: '100%',
                                marginLeft: '10px',
                                overflow: 'visible',
                            }}
                        >
                            {/* Search Control */}
                            <InventorySearchControl
                                subnets={subnets}
                                startCallback={startCallback}
                                endCallback={endCallback}
                                onAddFact={onAddFact}
                                onAddUndiscoveredList={onAddUndiscoveredList}
                            />

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    width: '100%',
                                    alignItems: 'center',
                                    marginTop: '5px',
                                    marginBottom: '5px',
                                    padding: 0,
                                }}
                            >
                                <Divider appearance='strong'>
                                    <Text size={200}>Facts</Text>
                                </Divider>
                                <Button
                                    disabled={isSearchRun}
                                    size='small'
                                    appearance='transparent'
                                    onClick={() => {
                                        setIsOpenFilter(!isOpenFilter);
                                    }}
                                    iconPosition='after'
                                    icon={
                                        isOpenFilter ? (
                                            <CloseFilterIcon style={{ fontSize: '16px' }} />
                                        ) : (
                                            <CollapseFilterIcon style={{ fontSize: '16px' }} />
                                        )
                                    }
                                >
                                    <Text size={100} wrap={false} style={{ width: '150px' }}>
                                        {isOpenFilter ? 'Hide Device Model Filter' : 'Show Device Model Filter'}
                                    </Text>
                                </Button>
                                <CounterBadge
                                    count={checkedModelTypes.length + (customModelName.trim() ? 1 : 0)}
                                    size='small'
                                    shape='circular'
                                    color={
                                        checkedModelTypes.length > 0 || customModelName.trim().length > 0
                                            ? 'brand'
                                            : 'informative'
                                    }
                                    showZero
                                />
                            </div>

                            {isOpenFilter && (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        width: '100%',
                                        height: '50px',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            width: '100%',
                                            gap: '10px',
                                        }}
                                    >
                                        <Text style={{ fontSize: '12px', paddingRight: '5px' }}>
                                            Please check for model filter:
                                        </Text>
                                        {deviceTypes.sort().map((label) => (
                                            <span key={label}>
                                                <Checkbox
                                                    size='medium'
                                                    key={label}
                                                    checked={checkedModelTypes.includes(label)}
                                                    onChange={() => handleCheckModelToogle(label)}
                                                    style={{
                                                        transform: 'scale(0.8)', // Zoom out effect
                                                        transformOrigin: 'center right',
                                                    }}
                                                />
                                                <Text style={{ fontSize: '11px' }}>{label}</Text>
                                            </span>
                                        ))}
                                        <span style={{ paddingLeft: '20px' }}>
                                            <Tooltip
                                                content={
                                                    <Text size={100} align='center'>
                                                        Custom model name (case insensitive) used to filter facts.
                                                    </Text>
                                                }
                                                positioning='above'
                                            >
                                                <Text style={{ fontSize: '10px', paddingRight: '10px' }}>
                                                    Custom Model Name:
                                                </Text>
                                            </Tooltip>
                                            <Input
                                                ref={customInputRef}
                                                size='small'
                                                placeholder='Enter model name'
                                                value={customModelName}
                                                onClick={() => {
                                                    setTimeout(() => {
                                                        customInputRef.current?.focus();
                                                    }, 100);
                                                }}
                                                onChange={(_, data) => handleCustomModelFilter(data.value)}
                                                style={{
                                                    transform: 'scale(0.8)', // Zoom out effect
                                                    transformOrigin: 'center left',
                                                }}
                                            />
                                        </span>
                                    </div>

                                    <div style={{ width: '100%', marginTop: '10px', marginBottom: '10px', padding: 0 }}>
                                        <Divider appearance='strong' />
                                    </div>
                                </div>
                            )}

                            {/* Facts Display */}
                            <div
                                style={{
                                    width: '100%',
                                    height: isOpenFilter ? 'calc(100% - 146px)' : '100%',
                                    margin: 0,
                                    padding: 0,
                                }}
                            >
                                <InventorySearchResult
                                    columns={factsColumns}
                                    items={filteredFacts}
                                    rowHeight={30}
                                    disabled={isSearchRun}
                                    undiscoveredList={undiscoveredList}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </DialogSurface>
        </Dialog>
    );
};

export default InventorySearchCard;
