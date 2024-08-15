import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
    FlatTree,
    Tree,
    TreeItem,
    TreeItemLayout,
    useHeadlessFlatTree_unstable,
    HeadlessFlatTreeItemProps,
    CounterBadge,
    Label,
    Text,
    Tag,
    Avatar,
    Body1,
    Body1Strong,
    Body1Stronger,
    Body2,
    Caption1,
    Caption1Strong,
    Caption1Stronger,
    Caption2,
    Caption2Strong,
    Display,
    LargeTitle,
    Subtitle1,
    Subtitle2,
    Subtitle2Stronger,
    Title1,
    Title2,
    Title3,
    Button,
    Menu,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
    MenuDivider,
    MenuGroup,
    MenuGroupHeader,
    MenuButton,
    Tooltip,
    Popover,
    PopoverTrigger,
    PopoverSurface,
    Field,
    Input,
    InteractionTag,
    Dialog,
    DialogTrigger,
    DialogSurface,
    DialogTitle,
    DialogContent,
    DialogBody,
    DialogActions,
    Divider,
    useId,
    Toaster,
    useToastController,
    Toast,
    ToastTitle,
    ToastBody,
    ToastFooter,
    Link,
    useRestoreFocusTarget,
    Spinner,
    ProgressBar,
    Accordion,
    AccordionHeader,
    AccordionItem,
    AccordionPanel,
    tokens,
} from '@fluentui/react-components';
import {
    AddSquare16Regular,
    SubtractSquare16Regular,
    BoxFilled,
    Box16Filled,
    AddCircle24Regular,
    Add16Regular,
    Subtract16Regular,
    FluentIcon,
    DesktopKeyboard16Regular,
    DesktopKeyboard16Filled,
    PlugConnectedRegular,
    PlugConnectedFilled,
    PlugDisconnected16Regular,
    BoxArrowUp20Regular,
    BoxArrowUp20Filled,
    Dismiss16Regular,
    Dismiss16Filled,
    DismissCircle16Filled,
    DismissCircle16Regular,
    TagMultipleRegular,
    InfoRegular,
    InfoFilled,
    PersonRegular,
    PersonCircleRegular,
    CloudCubeRegular,
    LocationRegular,
    OrganizationRegular,
    GroupRegular,
    PersonDeleteRegular,
    MoreHorizontalFilled,
    MoreHorizontalRegular,
    AddCircleFilled,
    AddCircleRegular,
    MapRegular,
    MapFilled,
    RenameRegular,
    RenameFilled,
    DeleteDismissRegular,
    DeleteDismissFilled,
    CutRegular,
    CutFilled,
    ClipboardPasteRegular,
    ClipboardPasteFilled,
    EditRegular,
    EditFilled,
    ArrowClockwiseFilled,
    ArrowClockwiseRegular,
    CopyFilled,
    CopyRegular,
    LinkMultipleRegular,
    LinkMultipleFilled,
    RecycleRegular,
    RecycleFilled,
    CursorClickFilled,
    CursorClickRegular,
    Edit20Regular,
    MoreHorizontal20Regular,
    BorderOutsideRegular,
    SquareMultipleRegular,
    SquareMultipleFilled,
    SquareRegular,
    GridRegular,
    BoxCheckmarkFilled,
    BoxCheckmarkRegular,
    BoxSearchFilled,
    CloudLinkFilled,
    CloudLinkRegular,
    CheckmarkCircleRegular,
    CheckmarkCircleFilled,
    CheckmarkRegular,
    CheckmarkFilled,
    QuestionCircleRegular,
    QuestionCircleFilled,
    CloudAddFilled,
    CloudAddRegular,
    BoxArrowUpRegular,
    BoxRegular,
    SearchInfoRegular,
    SearchRegular,
    SearchInfoFilled,
    BoxDismissRegular,
    ArrowSyncRegular,
    PlugConnectedCheckmarkFilled,
    PlugConnectedCheckmarkRegular,
    ArrowSyncFilled,
    ArrowSyncDismissRegular,
    ArrowSyncDismissFilled,
    DismissFilled,
    TriangleRegular,
    PentagonRegular,
    BoxToolboxFilled,
    BoxToolboxRegular,
    EqualOffRegular,
    EqualOffFilled,
    FlagOffFilled,
    OrganizationFilled,
    WarningFilled,
    WarningRegular,
    ErrorCircleRegular,
    FlagFilled,
    WeatherThunderstormRegular,
    WeatherPartlyCloudyDayRegular,
    CloudRegular,
    bundleIcon,
} from '@fluentui/react-icons';
import _ from 'lodash';
const { electronAPI } = window;

import useStore from '../Common/StateStore';
import { useNotify } from '../Common/NotificationContext';
import { useContextMenu } from '../Common/ContextMenuContext';
import { copyToClipboard, capitalizeFirstChar } from '../Common/CommonVariables';
import { adoptDevices, executeJunosCommand, getDeviceFacts, releaseDevices } from './Devices';
import { RotatingIcon, CircleIcon } from './ChangeIcon';
import eventBus from '../Common/eventBus';

const MapIcon = bundleIcon(MapFilled, MapRegular);
const Rename = bundleIcon(RenameFilled, RenameRegular);
const DeleteDismiss = bundleIcon(DeleteDismissFilled, DeleteDismissRegular);
const CutIcon = bundleIcon(CutFilled, CutRegular);
const PasteIcon = bundleIcon(ClipboardPasteFilled, ClipboardPasteRegular);
const ArrowClockwise = bundleIcon(ArrowClockwiseFilled, ArrowClockwiseRegular);
const CopyIcon = bundleIcon(CopyFilled, CopyRegular);
const EditIcon = bundleIcon(EditFilled, EditRegular);
const LinkIcon = bundleIcon(LinkMultipleFilled, LinkMultipleRegular);
const RecycleIcon = bundleIcon(RecycleFilled, RecycleRegular);
const AdoptDeviceIcon = bundleIcon(BoxArrowUpRegular, BoxRegular);
const JsiAdoptDeviceIcon = bundleIcon(BoxToolboxFilled, BoxToolboxRegular);
const CloudLink = bundleIcon(CloudLinkFilled, CloudLinkRegular);
const GetFactsIcon = bundleIcon(SearchInfoRegular, SearchRegular);
const CloudAdd = bundleIcon(CloudAddFilled, CloudAddRegular);
const ReleaseDeviceIcon = bundleIcon(BoxDismissRegular, BoxRegular);

const RenderCounterBadge = ({ counterValue }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', columnGap: '5px' }}>
            <CounterBadge
                count={counterValue}
                color='informative'
                size='small'
                overflowCount={10000}
            />
        </div>
    );
};

const AsideView = ({ path, device }) => {
    const { tabs, selectedTabValue, removeTab } = useStore();
    const isOpen = tabs.some((item) => item.path === path);
    const isSelected = path === selectedTabValue;

    const handleMouseDown = (event) => {
        event.stopPropagation();
        removeTab(path);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
            {isOpen && (
                <>
                    {isSelected ? (
                        <DismissCircle16Filled
                            color={tokens.colorNeutralForeground2BrandHover}
                            onClick={handleMouseDown}
                        />
                    ) : (
                        <DismissCircle16Regular
                            color={tokens.colorNeutralForeground3Hover}
                            onClick={handleMouseDown}
                        />
                    )}
                </>
            )}
        </div>
    );
};

const convertToFlatTreeItems = (localInventory) => {
    if (!localInventory || !Array.isArray(localInventory) || localInventory.length === 0) return [];

    const flatTreeItems = [];
    const organizationMap = new Map();

    // Add root node
    flatTreeItems.push({ value: '/Inventory', content: 'Inventory Layout', icon: null, counter: 0, type: 'root' });

    localInventory.forEach((item) => {
        const { organization, site, address, port, username, password, _path, facts } = item;

        if (!organizationMap.has(organization)) {
            organizationMap.set(organization, { sites: new Map(), counter: 0 });
        }
        const orgData = organizationMap.get(organization);

        if (!orgData.sites.has(site)) {
            orgData.sites.set(site, { devices: [], counter: 0 });
        }
        const siteData = orgData.sites.get(site);

        // Add device
        siteData.devices.push({
            value: `/Inventory/${organization}/${site}/${address}/${port}`,
            parentValue: `/Inventory/${organization}/${site}`,
            content: port === 22 ? address : `${address}:${port}`,
            icon: <Map style={{ fontSize: '14px' }} />, // Placeholder for icon, replace with actual icon if needed
            type: 'device',
            data: {
                address,
                port,
                username,
                password,
                orgName: organization,
                siteName: site,
                _path,
                facts,
            },
        });

        // Increment counters
        siteData.counter++;
        orgData.counter++;
    });

    // Convert organization and site data to flatTreeItems format
    organizationMap.forEach((orgData, organization) => {
        flatTreeItems.push({
            value: `/Inventory/${organization}`,
            parentValue: '/Inventory',
            content: organization,
            icon: (
                <OrganizationRegular style={{ fontSize: '14px', color: tokens.colorPaletteLightGreenBorderActive }} />
            ), // Placeholder for icon, replace with actual icon if needed
            counter: orgData.counter,
            type: 'org',
        });

        orgData.sites.forEach((siteData, site) => {
            flatTreeItems.push({
                value: `/Inventory/${organization}/${site}`,
                parentValue: `/Inventory/${organization}`,
                content: site,
                icon: (
                    <SquareMultipleRegular
                        style={{ fontSize: '14px', color: tokens.colorPaletteLightGreenBorderActive }}
                    />
                ), // Placeholder for icon, replace with actual icon if needed
                counter: siteData.counter,
                type: 'site',
            });

            flatTreeItems.push(...siteData.devices);
        });
    });

    // Update root counter
    flatTreeItems[0].counter = flatTreeItems.reduce((acc, item) => acc + (item.type === 'device' ? 1 : 0), 0);

    return flatTreeItems;
};

const InventoryTreeMenuLocal = () => {
    const { showContextMenu } = useContextMenu();
    const { notify } = useNotify();
    const { isUserLoggedIn, orgs, settings } = useStore();
    const { tabs, addTab, setSelectedTabValue, adoptConfig, inventory, setInventory } = useStore();
    const { cloudInventory, setCloudInventory, setCloudInventoryFilterApplied, cloudDevices } = useStore();

    const { isChecking, setIsChecking, resetIsChecking } = useStore();
    const { deviceFacts, setDeviceFacts, deleteDeviceFacts } = useStore();
    const { isAdopting, setIsAdopting, resetIsAdopting } = useStore();
    const { isReleasing, setIsReleasing, resetIsReleasing } = useStore();

    const [flatTreeItems, setFlatTreeItems] = useState([]);
    const [expandedItems, setExpandedItems] = useState(() => {
        return new Set(flatTreeItems.map((item) => item.value));
    });

    const deviceFactsRef = useRef(deviceFacts);

    useEffect(() => {
        deviceFactsRef.current = deviceFacts;
    }, [deviceFacts]);

    useEffect(() => {
        const result = convertToFlatTreeItems(inventory);
        const openItems = new Set(result.map((item) => item.value));

        setFlatTreeItems(result);
        setExpandedItems(openItems);
    }, [inventory]);

    const onClickDevice = async (data) => {
        const path = data.value;

        const isOpen = tabs.some((item) => item.path === path);
        if (isOpen) {
            setSelectedTabValue(path);
        } else {
            addTab({ path: data.value });
        }
    };

    const renderObjectValue = (objectValue) => {
        return Object.entries(objectValue).map(([key, value]) => (
            <div
                key={key}
                style={{ display: 'flex', alignItems: 'center' }}
            >
                <Text
                    weight='semibold'
                    size={100}
                    font='monospace'
                >
                    {key}:
                </Text>
                <Text
                    size={100}
                    font='monospace'
                >
                    {value}
                </Text>
            </div>
        ));
    };

    const ProtocolIcon = ({ path, device }) => {
        const { tabs } = useStore();
        const isOpen = tabs.some((item) => item.path === path);
        const [isAdopted, setIsAdopted] = useState(false);
        const [isOrgMatch, setIsOrgMatch] = useState(true);
        const [isSiteMatch, setIsSiteMatch] = useState(true);

        useEffect(() => {
            const isFact = !!deviceFacts[device._path];

            const deviceSerial = deviceFacts[device._path]?.serialNumber;
            const deviceHostname = deviceFacts[device._path]?.hostname;

            // First method using serialNumber
            let adopted = isFact ? !!cloudDevices[deviceSerial] : false;

            if (!adopted && isFact) {
                // Second method using hostname - used if the first method fails
                // Now includes check for is_vmac_enabled being true
                const namesMatchingHostname = Object.values(cloudDevices).filter(
                    (d) => d.name === deviceHostname && d.is_vmac_enabled === true
                );

                if (namesMatchingHostname.length > 0) console.log('namesMatchingHostname', namesMatchingHostname);

                // Set adopted to true only if there is a unique match
                adopted = namesMatchingHostname.length === 1;
            }

            if (adopted) {
                const cloudDevice = cloudDevices[deviceFacts[device._path]?.serialNumber];
                const cloudOrgName = cloudDevice.org_name;
                const cloudSiteName = cloudDevice.site_name;
                const deviceOrgName = device.orgName;
                const deviceSiteName = device.siteName;

                setIsOrgMatch(cloudOrgName === deviceOrgName);
                setIsSiteMatch(cloudSiteName === deviceSiteName);
            }
            setIsAdopted(adopted);
        }, [cloudDevices, device]);

        const IconWithTooltip = ({ content, relationship, Icon, size, color }) => (
            <Tooltip
                content={content}
                relationship={relationship}
                withArrow
                positioning='above-end'
            >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Icon style={{ fontSize: size, color: color }} />
                </div>
            </Tooltip>
        );

        const CircleIconWithTooltip = ({ content, relationship, Icon, color, size = '10px' }) => (
            <Tooltip
                content={content}
                relationship={relationship}
                withArrow
                positioning='above-end'
            >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <CircleIcon
                        Icon={Icon}
                        size={size}
                        color={color}
                    />
                </div>
            </Tooltip>
        );

        const orgMismatchContent = (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Text size={200}>
                    The organization name (<i>{device.orgName}</i>) does not exist in your account:
                </Text>
                <Text
                    size={100}
                    font='monospace'
                >
                    {`"${device.orgName}" ≠ "${cloudDevices[deviceFacts[device._path]?.serialNumber]?.org_name}"`}
                </Text>
            </div>
        );

        const siteMismatchContent = (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Text size={200}>
                    The site name (<i>{device.siteName}</i>) does not exist in your account:
                </Text>
                <Text
                    size={100}
                    font='monospace'
                >
                    {`"${device.siteName}" ≠ "${cloudDevices[deviceFacts[device._path]?.serialNumber]?.site_name}"`}
                </Text>
            </div>
        );

        const getIcon = () => {
            if (isAdopted) {
                return (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignContent: 'center',
                            alignItems: 'center',
                            justifyContent: 'center',
                            // gap: '5px',
                        }}
                    >
                        {!isOrgMatch ? (
                            <IconWithTooltip
                                content={orgMismatchContent}
                                relationship='label'
                                Icon={WeatherThunderstormRegular}
                                color={tokens.colorPaletteRedForeground1}
                                size='16px'
                            />
                        ) : !isSiteMatch ? (
                            <IconWithTooltip
                                content={siteMismatchContent}
                                relationship='label'
                                Icon={WeatherThunderstormRegular}
                                color={tokens.colorPaletteRedForeground1}
                                size='16px'
                            />
                        ) : null}

                        <Tooltip
                            content={
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {renderObjectValue(cloudDevices[deviceFacts[device._path]?.serialNumber])}
                                </div>
                            }
                            relationship='description'
                            withArrow
                            positioning='above-end'
                        >
                            {isOpen ? (
                                <PlugConnectedCheckmarkFilled
                                    fontSize='16px'
                                    color={
                                        !isOrgMatch || !isSiteMatch
                                            ? tokens.colorPaletteRedForeground1
                                            : tokens.colorNeutralForeground2BrandHover
                                    }
                                />
                            ) : (
                                <PlugConnectedCheckmarkRegular
                                    fontSize='16px'
                                    color={
                                        !isOrgMatch || !isSiteMatch
                                            ? tokens.colorPaletteRedForeground1
                                            : tokens.colorNeutralForeground3Hover
                                    }
                                />
                            )}
                        </Tooltip>
                    </div>
                );
            } else {
                return isOpen ? (
                    <PlugConnectedFilled
                        fontSize='16px'
                        color={tokens.colorNeutralForeground2BrandHover}
                    />
                ) : (
                    <PlugConnectedRegular
                        fontSize='16px'
                        color={tokens.colorNeutralForeground3Hover}
                    />
                );
            }
        };

        return getIcon();
    };

    const DeviceName = ({ path, device }) => {
        const isChecking = useStore((state) => state.isChecking[path]);

        const { selectedTabValue } = useStore();
        const isSelected = path === selectedTabValue;
        const deviceFact = deviceFacts[path] ? useStore((state) => state.deviceFacts?.[path]) : null;
        const deviceName = device.port === 22 ? device.address : `${device.address}:${device.port}`;
        const cloudDevice = cloudDevices[deviceFact?.serialNumber];

        // if (cloudDevice?.is_vmac_enabled) {
        //     console.log('CloudDevice:', cloudDevice);
        // }

        let facts = [];
        if (deviceFact) {
            facts = [
                { key: 'Hardware Model', value: deviceFact.hardwareModel },
                { key: 'OS Name', value: deviceFact.osName },
                { key: 'OS Version', value: deviceFact.osVersion },
                { key: 'Serial Number', value: deviceFact.serialNumber },
                { key: 'Host Name', value: deviceFact.hostName },
            ];
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'row', gap: '5px', alignItems: 'center' }}>
                {deviceFact && !isChecking?.status ? (
                    <Label
                        required={isSelected}
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '10px',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Tooltip
                            content={
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {facts.map((fact, index) => (
                                        <div
                                            key={index}
                                            style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}
                                        >
                                            <Text
                                                weight='semibold'
                                                size={100}
                                                font='monospace'
                                            >
                                                {fact.key}:
                                            </Text>
                                            <Text
                                                size={100}
                                                font='monospace'
                                            >
                                                {fact.value}
                                            </Text>
                                        </div>
                                    ))}
                                </div>
                            }
                            relationship='description'
                            withArrow
                            positioning='above-end'
                        >
                            <Text
                                size={100}
                                font='numeric'
                                weight='semibold'
                                style={{ color: tokens.colorPaletteLightGreenForeground1 }}
                            >
                                {deviceName}
                            </Text>
                        </Tooltip>
                        <Text
                            size={100}
                            font='monospace'
                            weight='normal'
                        >
                            {deviceFact.hardwareModel}
                        </Text>
                        {cloudDevice?.is_vmac_enabled ? (
                            // <Text
                            //     size={100}
                            //     font='numeric'
                            //     weight='normal'
                            // >
                            //     {`${deviceFact.serialNumber} ↔ `}
                            //     <span style={{ fontWeight: '500', color: tokens.colorPaletteLightGreenForeground1 }}>
                            //         {cloudDevice.serial}
                            //     </span>
                            // </Text>
                            <Text
                                size={100}
                                font='numeric'
                                weight='normal'
                                style={{ color: tokens.colorPaletteLightGreenForeground1 }}
                            >
                                {cloudDevice.serial}
                            </Text>
                        ) : (
                            <Text
                                size={100}
                                font='numeric'
                                weight='normal'
                            >
                                {deviceFact.serialNumber}
                            </Text>
                        )}
                        <Text
                            size={100}
                            font='numeric'
                            weight='normal'
                        >
                            {deviceFact.hostName}
                        </Text>
                    </Label>
                ) : (
                    <Label
                        required={isSelected}
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '10px',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Text
                            size={100}
                            font='numeric'
                            weight='normal'
                        >
                            {deviceName}
                        </Text>
                    </Label>
                )}
                {isChecking?.status ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Spinner size='extra-tiny' />
                        {isChecking.retry > 0 && (
                            <Text
                                size={100}
                                font='numeric'
                                style={{ color: 'red' }}
                            >
                                Retry attempt {isChecking.retry}
                            </Text>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {isChecking?.retry < 0 && (
                            <Text
                                size={100}
                                font='numeric'
                                style={{ color: 'purple' }}
                            >
                                🐞 Failed to retrieve facts. Please verify your inventory or device settings and try
                                again.
                            </Text>
                        )}
                    </div>
                )}
                {isAdopting[path] ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <RotatingIcon
                            Icon={ArrowSyncFilled}
                            rotationDuration='1300ms'
                            color={tokens.colorCompoundBrandBackground}
                        />
                        {isAdopting[path]?.retry > 0 && (
                            <Text
                                size={100}
                                font='numeric'
                                style={{ color: 'red' }}
                            >
                                Retry attempt {isAdopting[path].retry}
                            </Text>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {isAdopting[path]?.retry < 0 && (
                            <Text
                                size={100}
                                font='numeric'
                                style={{ color: 'red' }}
                            >
                                🐞 Failed to adopt. Please verify your inventory or device settings and try again.
                            </Text>
                        )}
                    </div>
                )}

                {isReleasing[path] && (
                    <RotatingIcon
                        Icon={TriangleRegular}
                        size='12px'
                        rotationDuration='500ms'
                        color={tokens.colorPaletteDarkOrangeBorder2}
                    />
                )}
            </div>
        );
    };

    const fetchDeviceFacts = async (device) => {
        const maxRetries = 3;
        const retryInterval = 10000; // 10 seconds in milliseconds
        let response;

        setIsChecking(device._path, { status: true, retry: 0 });

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            response = await getDeviceFacts({ ...device, timeout: 5000 }, true);
            if (response.status) {
                setDeviceFacts(device._path, response.result);
                resetIsChecking(device._path);
                return;
            } else {
                console.log(`${device.address} facts getting error on attempt ${attempt}:`, response);
                setIsChecking(device._path, { status: true, retry: attempt });
                await new Promise((resolve) => setTimeout(resolve, retryInterval));
            }
        }

        setIsChecking(device._path, { status: false, retry: -1 });
        notify(
            <Toast>
                <ToastTitle>Device Facts Retrieval Failure</ToastTitle>
                <ToastBody subtitle='Error Details'>
                    <Text>
                        An error occurred while retrieving the device facts. Please check the device configuration and
                        try again.
                    </Text>
                    <Text>Error Message: {response.result.message}</Text>
                </ToastBody>
            </Toast>,
            { intent: 'error' }
        );
    };

    const getFacts = async (node, rate = 10) => {
        const targetDevices = inventory.filter((device) => device._path.startsWith(node.value));

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const rateLimit = 1000 / rate; // Rate in calls per second
        const maxConcurrentCalls = 100; // Maximum number of concurrent async calls

        const fetchDeviceFactsWithRateLimit = async () => {
            const promises = [];
            let runningCalls = 0;

            const executeCall = async (device) => {
                const promise = fetchDeviceFacts(device).then(() => {
                    runningCalls--;
                    promises.splice(promises.indexOf(promise), 1); // Remove the resolved promise
                });
                promises.push(promise);
                runningCalls++;

                if (runningCalls >= maxConcurrentCalls) {
                    await Promise.race(promises);
                }

                await delay(rateLimit);
            };

            for (const device of targetDevices) {
                await executeCall(device);
            }

            await Promise.all(promises);
        };

        await fetchDeviceFactsWithRateLimit();

        await electronAPI.saSaveDeviceFacts({ facts: deviceFactsRef.current });
    };

    const actionAdoptDevice = async (device, jsiTerm = false, deleteOutboundSSHTerm = false) => {
        const maxRetries = 6;
        const retryInterval = 15 * 1000; // 15 seconds in milliseconds

        setIsAdopting(device._path, { status: true, retry: 0 });

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const result = await adoptDevices(device, jsiTerm, deleteOutboundSSHTerm);
            if (result.status) {
                resetIsAdopting(device.path, false);
                return;
            } else {
                setIsAdopting(device._path, { status: true, retry: attempt });
                await new Promise((resolve) => setTimeout(resolve, retryInterval)); // Wait before retrying
            }
        }

        // setIsAdopting(device._path, { status: false, retry: -1 });
        resetIsAdopting(device.path, false);

        notify(
            <Toast>
                <ToastTitle>Device Adoption Failure</ToastTitle>
                <ToastBody subtitle='Device Adoption'>
                    <Text>The device could not be adopted into the organization: "{device.organization}".</Text>
                </ToastBody>
            </Toast>,
            { intent: 'error' }
        );
    };

    const actionAdoptDevices = async (node, jsiTerm = false, rate = 10) => {
        const inventoryWithPath = inventory.map((item) => {
            const path = `/Inventory/${item.organization}/${item.site}/${item.address}/${item.port}`;
            return {
                ...item,
                path: path,
            };
        });

        const targetDevices = inventoryWithPath.filter((device) => {
            const orgName = device.organization;
            const siteName = device.site;

            const siteExists = doesSiteNameExist(orgName, siteName);
            const serialNumber = deviceFacts[device.path]?.serialNumber;

            return siteExists && device.path.startsWith(node.value) && !!!cloudDevices[serialNumber];
        });

        const targetOrgs = new Set();

        targetDevices.forEach((device) => {
            targetOrgs.add(device.organization);
        });

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const rateLimit = 1000 / rate; // Rate in calls per second
        const maxConcurrentCalls = 100; // Maximum number of concurrent async calls

        const adoptDeviceFactsWithRateLimit = async () => {
            const promises = [];
            let runningCalls = 0;

            const executeCall = async (device) => {
                const promise = new Promise(async (resolve) => {
                    await actionAdoptDevice(device, jsiTerm, settings.deleteOutboundSSHTerm);
                    resolve();
                }).then(() => {
                    runningCalls--;
                });
                promises.push(promise);
                runningCalls++;

                if (runningCalls >= maxConcurrentCalls) {
                    await Promise.race(promises);
                    runningCalls -= promises.filter((p) => p instanceof Promise).length;
                    promises.length = promises.filter((p) => p instanceof Promise).length;
                }

                await delay(rateLimit);
            };

            for (const device of targetDevices) {
                await executeCall(device);
            }

            await Promise.all(promises);
        };

        await adoptDeviceFactsWithRateLimit();

        setTimeout(async () => {
            await eventBus.emit('cloud-inventory-refresh', { targetOrgs: Array.from(targetOrgs), notification: false });
        }, 3000);
    };

    const actionReleaseDevice = async (device) => {
        setIsReleasing(device.path, true);

        const deviceFact = deviceFacts[device.path];
        const cloudDevice = cloudDevices[deviceFact?.serialNumber];

        const serialNumber = cloudDevice?.serial;
        const organization = cloudDevice?.org_name;

        const result = await releaseDevices({ organization, serialNumber });
        if (result.status) {
            // setTimeout(async () => {
            //     const fetchAndUpdateCloudInventory = async () => {
            //         try {
            //             const data = await electronAPI.saGetCloudInventory();
            //             if (data.cloudInventory) {
            //                 setCloudInventory(data.inventory);
            //                 setCloudInventoryFilterApplied(data.isFilterApplied);
            //             }
            //         } catch (error) {
            //             console.error('Error fetching cloud inventory:', error);
            //         }
            //     };

            //     await fetchAndUpdateCloudInventory();
            // }, 3000); // Delay of 3 seconds (3000 milliseconds)
            console.log(`Device(${serialNumber}) released successfully`);
        } else {
            notify(
                <Toast>
                    <ToastTitle>Device Releasing Failure</ToastTitle>
                    <ToastBody subtitle='Device Releasing'>
                        <Text>The device could not be released from the organization: "{device.organization}".</Text>
                    </ToastBody>
                </Toast>,
                { intent: 'error' }
            );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsReleasing(device.path, false);
    };

    const actionReleaseDevices = async (node, rate = 5) => {
        const inventoryWithPath = inventory.map((item) => {
            const path = `/Inventory/${item.organization}/${item.site}/${item.address}/${item.port}`;
            return {
                ...item,
                path: path,
            };
        });

        const targetDevices = inventoryWithPath.filter((device) => {
            const serialNumber = deviceFacts[device.path]?.serialNumber;
            return device.path.startsWith(node.value) && !!cloudDevices[serialNumber];
        });

        const targetOrgs = new Set();

        targetDevices.forEach((device) => {
            targetOrgs.add(device.organization);
        });

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const rateLimit = 1000 / rate; // Rate in calls per second
        const maxConcurrentCalls = 100; // Maximum number of concurrent async calls

        const releaseDeviceFactsWithRateLimit = async () => {
            const promises = [];
            let runningCalls = 0;

            const executeCall = async (device) => {
                const promise = new Promise(async (resolve) => {
                    await actionReleaseDevice(device);
                    resolve();
                }).then(() => {
                    runningCalls--;
                });
                promises.push(promise);
                runningCalls++;

                if (runningCalls >= maxConcurrentCalls) {
                    await Promise.race(promises);
                    runningCalls -= promises.filter((p) => p instanceof Promise).length;
                    promises.length = promises.filter((p) => p instanceof Promise).length;
                }

                await delay(rateLimit);
            };

            for (const device of targetDevices) {
                await executeCall(device);
            }

            await Promise.all(promises);
        };

        await releaseDeviceFactsWithRateLimit();
        setTimeout(async () => {
            await eventBus.emit('cloud-inventory-refresh', { targetOrgs: Array.from(targetOrgs), notification: false });
        }, 3000);
    };

    const contextMenuContent = (event, node) => {
        const devices = inventory.filter(
            (device) => device._path.startsWith(node.value) && !!deviceFacts[device._path]
        );
        const devicesAdopted = devices.filter((device) => !!cloudDevices[deviceFacts[device._path]?.serialNumber]);

        const isTargetDeviceAvailable = () => {
            return devices.length > 0;
        };

        const isDeviceAdoptedAvailable = () => {
            return devicesAdopted.length > 0;
        };

        const isOrgSiteMatch = () => {
            const splitParentValue = node.parentValue ? node.parentValue.split('/') : [];

            switch (node.type) {
                case 'root':
                    return true;
                case 'org':
                    return doesOrgNameExist(node.content);
                case 'site':
                    return doesSiteNameExist(splitParentValue.pop(), node.content);
                case 'device':
                    return doesSiteNameExist(
                        splitParentValue[splitParentValue.length - 2],
                        splitParentValue[splitParentValue.length - 1]
                    );
                default:
                    return false;
            }
        };

        return (
            <MenuList>
                <MenuGroup>
                    <MenuGroupHeader>{capitalizeFirstChar(node.type)} Actions</MenuGroupHeader>
                    <MenuDivider />
                    <MenuItem
                        icon={<GetFactsIcon style={{ fontSize: '16px' }} />}
                        onClick={() => {
                            getFacts(node);
                        }}
                    >
                        <Text
                            size={200}
                            font='numeric'
                        >
                            Get Facts
                        </Text>
                    </MenuItem>

                    {!isUserLoggedIn && (
                        <MenuGroupHeader>
                            <Text size={100}>Please log in to perform following actions.</Text>
                        </MenuGroupHeader>
                    )}

                    <MenuItem
                        disabled={!isUserLoggedIn || !isTargetDeviceAvailable() || !isOrgSiteMatch()}
                        icon={<AdoptDeviceIcon style={{ fontSize: '14px' }} />}
                        onClick={async () => {
                            actionAdoptDevices(node);
                        }}
                    >
                        <Text
                            size={200}
                            font='numeric'
                        >
                            Adopt Device
                        </Text>
                    </MenuItem>

                    {settings.jsiTerm && (
                        <MenuItem
                            disabled={!isUserLoggedIn || !isTargetDeviceAvailable() || !isOrgSiteMatch()}
                            icon={<JsiAdoptDeviceIcon style={{ fontSize: '14px' }} />}
                            onClick={async () => {
                                actionAdoptDevices(node, true);
                            }}
                        >
                            <Text
                                size={200}
                                font='numeric'
                            >
                                JSI Adopt Device
                            </Text>
                        </MenuItem>
                    )}

                    <MenuItem
                        disabled={!isUserLoggedIn || !isDeviceAdoptedAvailable()}
                        icon={<ReleaseDeviceIcon style={{ fontSize: '14px' }} />}
                        onClick={async () => {
                            actionReleaseDevices(node);
                        }}
                    >
                        <Text
                            size={200}
                            font='numeric'
                        >
                            Release Device
                        </Text>
                    </MenuItem>
                </MenuGroup>
            </MenuList>
        );
    };

    const onNodeRightClick = (event, node) => {
        event.preventDefault(); // Prevent the default context menu
        showContextMenu(event.clientX, event.clientY, contextMenuContent(event, node));
    };

    const handleToggleExpand = (itemValue) => {
        setExpandedItems((prevExpandedItems) => {
            const newExpandedItems = new Set(prevExpandedItems);
            if (newExpandedItems.has(itemValue)) {
                newExpandedItems.delete(itemValue);
            } else {
                newExpandedItems.add(itemValue);
            }
            return newExpandedItems;
        });
    };

    const flatTree = useHeadlessFlatTree_unstable(flatTreeItems, {
        openItems: expandedItems,
    });
    const treeProps = flatTree.getTreeProps();

    const doesOrgNameExist = (orgName) => {
        // Iterate over the values of the orgs object
        for (const name of Object.values(orgs)) {
            if (name === orgName) {
                return true; // Return true if the orgName exists
            }
        }
        return false; // Return false if the orgName does not exist
    };

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

    return (
        <FlatTree
            {...treeProps}
            aria-label='Local Inventory Tree'
            style={{
                width: '100%',
                height: '100%',
            }}
            size='small'
        >
            {Array.from(flatTree.items(), (item) => {
                const rowData = item.getTreeItemProps();

                return rowData.type === 'root' ? (
                    <TreeItem
                        {...rowData}
                        key={rowData.value}
                        onClick={() => handleToggleExpand(rowData.value)}
                    >
                        <TreeItemLayout
                            aside={<RenderCounterBadge counterValue={rowData.counter} />}
                            onContextMenu={(event) => onNodeRightClick(event, rowData)}
                        >
                            <Text size={200}>{rowData.content}</Text>
                        </TreeItemLayout>
                    </TreeItem>
                ) : rowData.type === 'org' ? (
                    <TreeItem
                        {...rowData}
                        key={rowData.value}
                        onClick={() => handleToggleExpand(rowData.value)}
                    >
                        <TreeItemLayout
                            aside={<RenderCounterBadge counterValue={rowData.counter} />}
                            iconBefore={rowData.icon}
                            onContextMenu={(event) => onNodeRightClick(event, rowData)}
                        >
                            {!isUserLoggedIn || doesOrgNameExist(rowData.content) ? (
                                <Text size={100}>{rowData.content}</Text>
                            ) : (
                                <Tooltip
                                    content='Organization name does not exist in the cloud.'
                                    relationship='label'
                                    withArrow
                                    positioning='above-end'
                                >
                                    <Text
                                        size={100}
                                        strikethrough
                                        style={{ color: tokens.colorStatusDangerForeground3 }}
                                    >
                                        {rowData.content}
                                    </Text>
                                </Tooltip>
                            )}
                        </TreeItemLayout>
                    </TreeItem>
                ) : rowData.type === 'site' ? (
                    <TreeItem
                        {...rowData}
                        key={rowData.value}
                        onClick={() => handleToggleExpand(rowData.value)}
                    >
                        <TreeItemLayout
                            aside={<RenderCounterBadge counterValue={rowData.counter} />}
                            iconBefore={rowData.icon}
                            onContextMenu={(event) => onNodeRightClick(event, rowData)}
                        >
                            {!isUserLoggedIn ||
                            doesSiteNameExist(rowData.parentValue.split('/').pop(), rowData.content) ? (
                                <Text size={100}>{rowData.content}</Text>
                            ) : (
                                <Tooltip
                                    content='Site name does not exist in the cloud.'
                                    relationship='label'
                                    withArrow
                                    positioning='above-end'
                                >
                                    <Text
                                        size={100}
                                        strikethrough
                                        style={{ color: tokens.colorStatusDangerForeground3 }}
                                    >
                                        {rowData.content}
                                    </Text>
                                </Tooltip>
                            )}
                        </TreeItemLayout>
                    </TreeItem>
                ) : rowData.type === 'device' ? (
                    <TreeItem
                        {...rowData}
                        key={rowData.value}
                        onClick={() => {
                            onClickDevice(rowData);
                        }}
                    >
                        <TreeItemLayout
                            expandIcon={
                                <ProtocolIcon
                                    path={rowData.value}
                                    device={rowData.data}
                                />
                            }
                            aside={
                                <AsideView
                                    path={rowData.value}
                                    device={rowData.data}
                                />
                            }
                            onContextMenu={(event) => onNodeRightClick(event, rowData)}
                        >
                            <DeviceName
                                path={rowData.value}
                                device={rowData.data}
                            />
                        </TreeItemLayout>
                    </TreeItem>
                ) : (
                    <TreeItem
                        {...rowData}
                        key={rowData.value}
                        onClick={() => handleToggleExpand(rowData.value)}
                    >
                        <TreeItemLayout
                            aside={<RenderCounterBadge counterValue={rowData.counter} />}
                            iconBefore={rowData.icon}
                        >
                            {rowData.content}
                        </TreeItemLayout>
                    </TreeItem>
                );
            })}
        </FlatTree>
    );
};

export default InventoryTreeMenuLocal;
