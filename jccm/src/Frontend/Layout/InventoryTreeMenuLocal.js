import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { makeStyles, shorthands } from '@fluentui/react-components';
import {
    FlatTree,
    Tree,
    TreeItem,
    FlatTreeItem,
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
    CubeLinkRegular,
    LayerDiagonalFilled,
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
    AddSquareRegular,
    ConnectedRegular,
    RectangleLandscapeSyncRegular,
    RectangleLandscapeRegular,
    PortUsbCRegular,
    TriangleRightRegular,
    ToggleRightRegular,
    HeartPulseRegular,
    PulseSquareRegular,
    PulseRegular,
    SubtractRegular,
    LineFilled,
    CloudCheckmarkRegular,
    CloudDismissRegular,
    ArrowExpandFilled,
    MentionRegular,
    MentionFilled,
    DividerTallFilled,
    CircleLineRegular,
    AddFilled,
    SubtractFilled,
    PresenceBlockedRegular,
    FireRegular,
    FireFilled,
    DismissCircleFilled,
    WrenchRegular,
    bundleIcon,
} from '@fluentui/react-icons';
import _, { set } from 'lodash';
const { electronAPI } = window;

import useStore from '../Common/StateStore';
import { useNotify } from '../Common/NotificationContext';
import { useContextMenu } from '../Common/ContextMenuContext';
import { copyToClipboard, capitalizeFirstChar } from '../Common/CommonVariables';
import {
    adoptDevices,
    executeJunosCommand,
    getDeviceFacts,
    getDeviceNetworkCondition,
    releaseDevices,
} from './Devices';
import { RotatingIcon, CircleIcon } from './ChangeIcon';
import eventBus from '../Common/eventBus';
import { customAlert } from './customAlert';
import { getActiveTheme } from '../Common/CommonVariables';

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
const DeviceNetworkConditionIcon = bundleIcon(PulseSquareRegular, PulseRegular);

const tooltipStyles = makeStyles({
    tooltipMaxWidthClass: {
        maxWidth: '800px',
    },
});

const RenderCounterBadge = ({ counterValue }) => {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-end',
                columnGap: '5px',
            }}
        >
            <CounterBadge count={counterValue} color='informative' size='small' overflowCount={90000} />
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
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '5px',
            }}
        >
            {isOpen && (
                <>
                    {isSelected ? (
                        <DismissCircle16Filled
                            color={tokens.colorNeutralForeground2BrandHover}
                            onClick={handleMouseDown}
                        />
                    ) : (
                        <DismissCircle16Regular color={tokens.colorNeutralForeground3Hover} onClick={handleMouseDown} />
                    )}
                </>
            )}
        </div>
    );
};

const convertToFlatTreeItems = (localInventory, deviceFacts) => {
    if (!localInventory || !Array.isArray(localInventory) || localInventory.length === 0) return [];

    const flatTreeItems = [];
    const organizationMap = new Map();

    // Add root node
    flatTreeItems.push({
        value: '/Inventory',
        content: 'Inventory Layout',
        icon: null,
        counter: 0,
        type: 'root',
    });

    localInventory.forEach((item) => {
        const { organization, site, address, port, username, password, _path } = item;
        const facts = deviceFacts[_path] || {};

        if (!organizationMap.has(organization)) {
            organizationMap.set(organization, { sites: new Map(), counter: 0 });
        }
        const orgData = organizationMap.get(organization);

        if (!orgData.sites.has(site)) {
            orgData.sites.set(site, { devices: [], counter: 0 });
        }
        const siteData = orgData.sites.get(site);

        // Add device
        const deviceNode = {
            parentValue: `/Inventory/${organization}/${site}`,
            value: `/Inventory/${organization}/${site}/${address}/${port}`,
            content: port === 22 ? address : `${address}:${port}`,
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
        };

        siteData.devices.push(deviceNode);

        // If the device has a 'vc' key in its 'facts', add the VC members as child nodes
        facts.vc &&
            facts.vc.forEach((member, index) => {
                siteData.devices.push({
                    parentValue: deviceNode.value,
                    value: `${deviceNode.value}/${member.serial}`,
                    content: member,
                    type: 'vc-member',
                    data: member,
                });
            });

        // Increment counters
        siteData.counter++;
        orgData.counter++;
    });

    // Convert organization and site data to flatTreeItems format
    organizationMap.forEach((orgData, organization) => {
        flatTreeItems.push({
            parentValue: '/Inventory',
            value: `/Inventory/${organization}`,
            content: organization,
            icon: (
                <OrganizationRegular
                    style={{
                        fontSize: '14px',
                        color: tokens.colorPaletteLightGreenBorderActive,
                    }}
                />
            ), // Placeholder for icon, replace with actual icon if needed
            counter: orgData.counter,
            type: 'org',
        });

        orgData.sites.forEach((siteData, site) => {
            flatTreeItems.push({
                parentValue: `/Inventory/${organization}`,
                value: `/Inventory/${organization}/${site}`,
                content: site,
                icon: (
                    <SquareMultipleRegular
                        style={{
                            fontSize: '14px',
                            color: tokens.colorPaletteLightGreenBorderActive,
                        }}
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
    const { user, isUserLoggedIn, orgs, settings, setSettings, exportSettings, supportedDeviceModels } = useStore();
    const { tabs, addTab, setSelectedTabValue, adoptConfig, inventory, setInventory } = useStore();
    const { cloudInventory, setCloudInventory, setCloudInventoryFilterApplied, cloudDevices } = useStore();
    const { currentActiveThemeName } = useStore();

    const { isChecking, setIsChecking, resetIsChecking } = useStore();
    const { deviceFacts, setDeviceFacts, deleteDeviceFacts } = useStore();
    const { isAdopting, setIsAdopting, resetIsAdopting } = useStore();
    const { isReleasing, setIsReleasing, resetIsReleasing } = useStore();

    const { isTesting, setIsTesting, resetIsTesting } = useStore();
    const { deviceNetworkCondition, setDeviceNetworkCondition, deleteDeviceNetworkCondition } = useStore();

    const [flatTreeItems, setFlatTreeItems] = useState([]);
    const [expandedItems, setExpandedItems] = useState(() => {
        return new Set(flatTreeItems.map((item) => item.value));
    });

    const theme = getActiveTheme(currentActiveThemeName).theme;

    const ignoreCaseInName = settings?.ignoreCase ?? false;
    const deviceModelsValidation = settings?.deviceModelsValidation ?? false;
    const settingWarningShowForAdoption = settings?.warningShowForAdoption ?? true;

    const deviceFactsRef = useRef(deviceFacts);

    const cloudDescription = user?.cloudDescription || 'Unknown';

    const styles = tooltipStyles();

    const validateDeviceModel = (deviceModel) => {
        if (!deviceModelsValidation) return true;
        if (!isUserLoggedIn) return true;
        if (Object.keys(supportedDeviceModels) === 0) return true;
        return deviceModel?.toUpperCase() in supportedDeviceModels;
    };

    useEffect(() => {
        deviceFactsRef.current = deviceFacts;
    }, [deviceFacts]);

    useEffect(() => {
        const result = convertToFlatTreeItems(inventory, deviceFacts);
        const openItems = new Set(result.map((item) => item.value));

        setFlatTreeItems(result);
        setExpandedItems(openItems);
    }, [inventory, deviceFacts]);

    const onClickDevice = async (path) => {
        const isOpen = tabs.some((item) => item.path === path);
        if (isOpen) {
            setSelectedTabValue(path);
        } else {
            addTab({ path });
        }
    };

    const convertErrorMessage = (message) => {
        if (
            message?.includes('Permission denied') &&
            (message?.includes('publickey') || message?.includes('password') || message?.includes('keyboard-interactive'))
        ) {
            return 'SSH Authentication failed.';
        } else {
            return message;
        }
    };

    const renderObjectValue = (objectValue) => {
        return Object.entries(objectValue).map(
            ([key, value]) =>
                typeof value !== 'object' || value === null ? (
                    <div
                        key={key}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '5px',
                            width: '100%',
                        }}
                    >
                        <Text weight='semibold' size={100} font='monospace' style={{ marginRight: '5px' }}>
                            {key}:
                        </Text>
                        <Text size={100} font='monospace'>
                            {String(value)}
                        </Text>
                    </div>
                ) : null // Skip rendering if the value is an object
        );
    };

    const findFact = (path) => {
        // Find the fact based on the path, considering case sensitivity
        const factKey = Object.keys(deviceFacts).find((key) =>
            ignoreCaseInName ? key.toLowerCase() === path.toLowerCase() : key === path
        );

        if (!factKey) return undefined; // Return an empty object if no match is found
        const fact = deviceFacts[factKey];

        return fact;
    };

    const findCloudDevice = (path) => {
        const fact = findFact(path);
        if (!fact) return undefined; // Return an empty object if no match is found

        if (fact?.vc) {
            for (const member of fact.vc) {
                const device = cloudDevices[member.serial];
                if (device) return device;
            }
        }

        return cloudDevices[fact.systemInformation?.serialNumber];
    };

    const ProtocolIcon = ({ path, device }) => {
        const { tabs } = useStore();
        const isOpen = tabs.some((item) => item.path === path);
        const [isAdopted, setIsAdopted] = useState(false);
        const [isOrgMatch, setIsOrgMatch] = useState(true);
        const [isSiteMatch, setIsSiteMatch] = useState(true);
        const [foundCloudDevice, setFoundCloudDevice] = useState(null);

        useEffect(() => {
            const cloudDevice = findCloudDevice(device._path);
            setFoundCloudDevice(cloudDevice);

            let adopted = !!cloudDevice;

            if (adopted) {
                const cloudOrgName = cloudDevice.org_name;
                const cloudSiteName = cloudDevice.site_name;
                const deviceOrgName = device.orgName;
                const deviceSiteName = device.siteName;

                // Check org and site name with case sensitivity based on ignoreCaseInName
                if (ignoreCaseInName) {
                    setIsOrgMatch(cloudOrgName?.toLowerCase() === deviceOrgName?.toLowerCase());
                    setIsSiteMatch(cloudSiteName?.toLowerCase() === deviceSiteName?.toLowerCase());
                } else {
                    setIsOrgMatch(cloudOrgName === deviceOrgName);
                    setIsSiteMatch(cloudSiteName === deviceSiteName);
                }
            }
            setIsAdopted(adopted);
        }, [cloudDevices, device]);

        const IconWithTooltip = ({ content, relationship, Icon, size, color }) => (
            <Tooltip content={content} relationship={relationship} withArrow positioning='above-end'>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Icon style={{ fontSize: size, color: color }} />
                </div>
            </Tooltip>
        );

        const orgMismatchContent = (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                }}
            >
                <Text size={200}>
                    The organization name (<i>{device.orgName}</i>) does not exist in your account:
                </Text>
                <Text size={100} font='monospace'>
                    {`"${device.orgName}" ≠ "${foundCloudDevice?.org_name}"`}
                </Text>
            </div>
        );

        const siteMismatchContent = (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                }}
            >
                <Text size={200}>
                    The site name (<i>{device.siteName}</i>) does not exist in your account:
                </Text>
                <Text size={100} font='monospace'>
                    {`"${device.siteName}" ≠ "${foundCloudDevice?.site_name}"`}
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
                            content={{
                                className: styles.tooltipMaxWidthClass,
                                children: (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        {renderObjectValue(foundCloudDevice)}
                                    </div>
                                ),
                            }}
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
                    <PlugConnectedFilled fontSize='16px' color={tokens.colorNeutralForeground2BrandHover} />
                ) : (
                    <PlugConnectedRegular fontSize='16px' color={tokens.colorNeutralForeground3Hover} />
                );
            }
        };

        return getIcon();
    };
    const DeviceName = ({ path, device }) => {
        const isChecking = useStore((state) => state.isChecking[path]);

        const { selectedTabValue } = useStore();
        const isSelected = path === selectedTabValue;
        const deviceFact = deviceFacts[path] || null;

        const vcMembers = deviceFact?.vc || [];
        const deviceName = parseInt(device.port, 10) === 22 ? device.address : `${device.address}:${device.port}`;
        const cloudDevice = cloudDevices[deviceFact?.systemInformation?.serialNumber];

        const IsValidDeviceModel = validateDeviceModel(deviceFact?.systemInformation?.hardwareModel);

        let facts = [];
        if (deviceFact) {
            facts = [
                {
                    key: 'Hardware Model',
                    value: deviceFact.systemInformation?.hardwareModel,
                },
                { key: 'OS Name', value: deviceFact.systemInformation?.osName },
                {
                    key: 'OS Version',
                    value: deviceFact.systemInformation?.osVersion,
                },
                {
                    key: 'Serial Number',
                    value: deviceFact.systemInformation?.serialNumber,
                },
                {
                    key: 'Host Name',
                    value: deviceFact.systemInformation?.hostName,
                },
            ];
        }

        const DisplayDeviceNetworkConditionTestResult = () => {
            const isNetworkConditionTestResultAvailable = !!deviceNetworkCondition[path];
            if (!isNetworkConditionTestResultAvailable) return null;

            const result = deviceNetworkCondition[path] || {};

            const message = result?.message?.length > 0 ? result?.message : 'No network condition test result available';
            const isConnectable = result.dns && result.route && result.access && result.curl;

            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                    }}
                >
                    {isConnectable ? (
                        <Tooltip
                            content={{
                                className: styles.tooltipMaxWidthClass,
                                children: (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text size={200} weight='regular'>
                                            {message}
                                        </Text>
                                    </div>
                                ),
                            }}
                            relationship='description'
                            withArrow
                            positioning='above'
                        >
                            <CheckmarkCircleFilled
                                style={{
                                    color: tokens.colorPaletteLightGreenForeground3,
                                    fontSize: '11px',
                                }}
                            />
                        </Tooltip>
                    ) : !result.dns ? (
                        <Tooltip
                            content={{
                                className: styles.tooltipMaxWidthClass,
                                children: (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text
                                            size={200}
                                            weight='regular'
                                            style={{
                                                color: tokens.colorPaletteRedForeground3,
                                            }}
                                        >
                                            {message}
                                        </Text>
                                    </div>
                                ),
                            }}
                            relationship='description'
                            withArrow
                            positioning='above'
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'flex-start',
                                    alignItems: 'center',
                                    gap: '5px',
                                }}
                            >
                                <FireFilled
                                    style={{
                                        fontSize: '12px',
                                        color: tokens.colorPaletteRedForeground3,
                                    }}
                                />
                                <Text
                                    size={100}
                                    weight='regular'
                                    style={{
                                        color: tokens.colorPaletteRedForeground3,
                                    }}
                                >
                                    DNS lookup failure
                                </Text>
                            </div>
                        </Tooltip>
                    ) : !result.route ? (
                        <Tooltip
                            content={{
                                className: styles.tooltipMaxWidthClass,
                                children: (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text
                                            size={200}
                                            weight='regular'
                                            style={{
                                                color: tokens.colorPaletteRedForeground3,
                                            }}
                                        >
                                            {message}
                                        </Text>
                                    </div>
                                ),
                            }}
                            relationship='description'
                            withArrow
                            positioning='above'
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'flex-start',
                                    alignItems: 'center',
                                    gap: '5px',
                                }}
                            >
                                <FireFilled
                                    style={{
                                        fontSize: '12px',
                                        color: tokens.colorPaletteRedForeground3,
                                    }}
                                />
                                <Text
                                    size={100}
                                    weight='regular'
                                    style={{
                                        color: tokens.colorPaletteRedForeground3,
                                    }}
                                >
                                    No Route available
                                </Text>
                            </div>
                        </Tooltip>
                    ) : !result.access ? (
                        <Tooltip
                            content={{
                                className: styles.tooltipMaxWidthClass,
                                children: (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'flex-start',
                                        }}
                                    >
                                        <Text
                                            size={200}
                                            weight='regular'
                                            style={{
                                                color: tokens.colorPaletteRedForeground3,
                                            }}
                                        >
                                            {message}
                                        </Text>
                                        <Text
                                            size={200}
                                            weight='regular'
                                            style={{
                                                color: tokens.colorPaletteRedForeground3,
                                            }}
                                        >
                                            Possible firewall or ACL issue(?)
                                        </Text>
                                    </div>
                                ),
                            }}
                            relationship='description'
                            withArrow
                            positioning='above'
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'flex-start',
                                    alignItems: 'center',
                                    gap: '5px',
                                }}
                            >
                                <FireFilled
                                    style={{
                                        fontSize: '12px',
                                        color: tokens.colorPaletteRedForeground3,
                                    }}
                                />
                                <Text
                                    size={100}
                                    weight='regular'
                                    style={{
                                        color: tokens.colorPaletteRedForeground3,
                                    }}
                                >
                                    No Access available
                                </Text>
                            </div>
                        </Tooltip>
                    ) : !result.curl ? (
                        <Tooltip
                            content={{
                                className: styles.tooltipMaxWidthClass,
                                children: (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'flex-start',
                                        }}
                                    >
                                        <Text
                                            size={200}
                                            weight='regular'
                                            style={{
                                                color: tokens.colorPaletteCranberryForeground2,
                                            }}
                                        >
                                            {message}
                                        </Text>
                                        <Text
                                            size={100}
                                            weight='regular'
                                            style={{
                                                color: tokens.colorPaletteMarigoldForeground2,
                                            }}
                                        >
                                            The network OS release might be outdated, but this needs confirmation.
                                        </Text>
                                        <Text
                                            size={100}
                                            weight='regular'
                                            style={{
                                                color: tokens.colorPaletteMarigoldForeground2,
                                            }}
                                        >
                                            Please perform a network access test manually using commands such as telnet.
                                        </Text>
                                    </div>
                                ),
                            }}
                            relationship='description'
                            withArrow
                            positioning='above'
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'flex-start',
                                    alignItems: 'center',
                                    gap: '5px',
                                }}
                            >
                                <WrenchRegular
                                    style={{
                                        fontSize: '12px',
                                        color: tokens.colorPaletteMarigoldForeground1,
                                    }}
                                />
                                <Text
                                    size={100}
                                    weight='regular'
                                    style={{
                                        color: tokens.colorPaletteMarigoldForeground1,
                                    }}
                                >
                                    No access test is available.
                                </Text>
                            </div>
                        </Tooltip>
                    ) : (
                        <Tooltip
                            content={{
                                className: styles.tooltipMaxWidthClass,
                                children: (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'flex-start',
                                        }}
                                    >
                                        <Text
                                            size={200}
                                            weight='regular'
                                            style={{
                                                color: tokens.colorPaletteRedForeground3,
                                            }}
                                        >
                                            {message}
                                        </Text>
                                        <Text
                                            size={200}
                                            weight='regular'
                                            style={{
                                                color: tokens.colorPaletteRedForeground3,
                                            }}
                                        >
                                            Possible firewall or ACL issue(?)
                                        </Text>
                                    </div>
                                ),
                            }}
                            relationship='description'
                            withArrow
                            positioning='above'
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'flex-start',
                                    alignItems: 'center',
                                    gap: '5px',
                                }}
                            >
                                <FireFilled
                                    style={{
                                        fontSize: '12px',
                                        color: tokens.colorPaletteRedForeground3,
                                    }}
                                />
                                <Text
                                    size={100}
                                    weight='regular'
                                    style={{
                                        color: tokens.colorPaletteRedForeground3,
                                    }}
                                >
                                    An unknown network access issue
                                </Text>
                            </div>
                        </Tooltip>
                    )}
                </div>
            );
        };

        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '5px',
                    alignItems: 'center',
                }}
            >
                {deviceFact && !isChecking?.status ? (
                    vcMembers.length > 0 ? (
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
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        {facts.map((fact, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    gap: '5px',
                                                }}
                                            >
                                                <Text weight='semibold' size={100} font='monospace'>
                                                    {fact.key}:
                                                </Text>
                                                <Text size={100} font='monospace'>
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
                                    style={{
                                        color: IsValidDeviceModel
                                            ? tokens.colorPaletteLightGreenForeground1
                                            : tokens.colorStatusDangerForeground3,
                                    }}
                                >
                                    {deviceName}
                                </Text>
                            </Tooltip>

                            {IsValidDeviceModel ? (
                                <Text size={100} font='numeric' weight='regular'>
                                    Virtual Chassis
                                </Text>
                            ) : (
                                <Tooltip
                                    content={{
                                        className: styles.tooltipMaxWidthClass,
                                        children: (
                                            <Text size={100}>
                                                {`The ${deviceFact.systemInformation?.hardwareModel?.toUpperCase()} is not valid for the ${cloudDescription}.`}
                                            </Text>
                                        ),
                                    }}
                                >
                                    <Text
                                        size={100}
                                        font='numeric'
                                        weight='regular'
                                        strikethrough
                                        style={{
                                            color: tokens.colorStatusDangerForeground3,
                                        }}
                                    >
                                        Virtual Chassis
                                    </Text>
                                </Tooltip>
                            )}

                            <Text size={100} font='numeric' weight='regular'>
                                {deviceFact.systemInformation?.hostName}
                            </Text>
                            {!isTesting[path] && <DisplayDeviceNetworkConditionTestResult />}
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
                            <Tooltip
                                content={
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        {facts.map((fact, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    gap: '5px',
                                                }}
                                            >
                                                <Text weight='semibold' size={100} font='monospace'>
                                                    {fact.key}:
                                                </Text>
                                                <Text size={100} font='monospace'>
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
                                    style={{
                                        color: IsValidDeviceModel
                                            ? tokens.colorPaletteLightGreenForeground1
                                            : tokens.colorStatusDangerForeground3,
                                    }}
                                >
                                    {deviceName}
                                </Text>
                            </Tooltip>

                            {IsValidDeviceModel ? (
                                <Text size={100} font='monospace' weight='regular' style={{ paddingTop: '2px' }}>
                                    {deviceFact.systemInformation?.hardwareModel}
                                </Text>
                            ) : (
                                <Tooltip
                                    content={{
                                        className: styles.tooltipMaxWidthClass,
                                        children: (
                                            <Text size={100}>
                                                {`The ${deviceFact.systemInformation?.hardwareModel?.toUpperCase()} is not valid for the ${cloudDescription}.`}
                                            </Text>
                                        ),
                                    }}
                                >
                                    <Text
                                        size={100}
                                        font='monospace'
                                        weight='regular'
                                        strikethrough
                                        style={{
                                            color: tokens.colorStatusDangerForeground3,
                                            paddingTop: '2px',
                                        }}
                                    >
                                        {deviceFact.systemInformation?.hardwareModel}
                                    </Text>
                                </Tooltip>
                            )}

                            {cloudDevice?.is_vmac_enabled ? (
                                <Text
                                    size={100}
                                    font='numeric'
                                    weight='regular'
                                    style={{
                                        color: tokens.colorPaletteLightGreenForeground1,
                                    }}
                                >
                                    {cloudDevice.serial}
                                </Text>
                            ) : (
                                <Text size={100} font='numeric' weight='regular'>
                                    {deviceFact.systemInformation?.serialNumber}
                                </Text>
                            )}
                            <Text size={100} font='numeric' weight='regular'>
                                {deviceFact.systemInformation?.hostName}
                            </Text>
                            {!isTesting[path] && <DisplayDeviceNetworkConditionTestResult />}
                        </Label>
                    )
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
                        <Text size={100} font='numeric' weight='regular'>
                            {deviceName}
                        </Text>
                    </Label>
                )}
                {isChecking?.status ? (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                        }}
                    >
                        <Spinner size='extra-tiny' />
                        {isChecking.retry > 0 && (
                            <Text size={100} font='numeric' style={{ color: 'red' }}>
                                {isChecking.error} - Retry {isChecking.retry}
                            </Text>
                        )}
                    </div>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                        }}
                    >
                        {isChecking?.retry < 0 && (
                            <Text size={100} font='numeric' style={{ color: 'purple' }}>
                                🐞 {isChecking.error}
                            </Text>
                        )}
                    </div>
                )}
                {isAdopting[path]?.status ? (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                        }}
                    >
                        <RotatingIcon
                            Icon={ArrowSyncFilled}
                            rotationDuration='1300ms'
                            color={tokens.colorCompoundBrandBackground}
                        />
                        {isAdopting[path]?.retry > 0 && (
                            <Text size={100} font='numeric' style={{ color: 'red' }}>
                                {isAdopting[path]?.error} - Retry {isAdopting[path]?.retry}
                            </Text>
                        )}
                    </div>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                        }}
                    >
                        {isAdopting[path]?.retry < 0 && (
                            <Text size={100} font='numeric' style={{ color: 'red' }}>
                                🦋 {isAdopting[path]?.error}
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

                {isTesting[path]?.status ? (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: '5px',
                        }}
                    >
                        <RotatingIcon
                            Icon={SubtractFilled}
                            size='12px'
                            rotationDuration='500ms'
                            color={tokens.colorCompoundBrandBackground}
                        />
                        {isTesting[path]?.error && (
                            <Text
                                style={{
                                    fontSize: '10px',
                                    color: tokens.colorCompoundBrandBackground,
                                }}
                            >
                                {isTesting[path]?.error && convertErrorMessage(isTesting[path]?.error)}
                            </Text>
                        )}
                    </div>
                ) : (
                    isTesting[path]?.error && (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                gap: '5px',
                            }}
                        >
                            <DismissCircleFilled
                                style={{
                                    fontSize: '12px',
                                    color: tokens.colorPaletteRedForeground3,
                                }}
                            />
                            <Text
                                style={{
                                    fontSize: '10px',
                                    color: tokens.colorCompoundBrandBackground,
                                }}
                            >
                                {convertErrorMessage(isTesting[path].error)}
                            </Text>
                        </div>
                    )
                )}
            </div>
        );
    };

    const fetchDeviceFacts = async (device) => {
        const maxRetries = 2;
        const retryInterval = 10000; // 10 seconds in milliseconds
        let response;

        setIsChecking(device._path, { status: true, retry: 0 });
        resetIsAdopting(device._path);

        deleteDeviceNetworkCondition(device._path);
        resetIsTesting(device._path);

        const bastionHost = settings?.bastionHost || {};

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            response = await getDeviceFacts({ ...device, timeout: 5000 }, true, bastionHost);
            if (response.status) {
                setDeviceFacts(device._path, response.result);
                resetIsChecking(device._path);
                return;
            } else {
                console.log(
                    `${device.address}:${device.port} - Error retrieving facts on attempt ${attempt}:`,
                    response
                );
                if (response.result?.status?.toLowerCase().includes('authentication failed')) {
                    deleteDeviceFacts(device._path);
                    setIsChecking(device._path, {
                        status: false,
                        retry: -1,
                        error: response.result?.message,
                    });
                    return;
                } else if (response.result?.status?.toLowerCase().includes('ssh client error')) {
                    deleteDeviceFacts(device._path);
                    setIsChecking(device._path, {
                        status: false,
                        retry: -1,
                        error: response.result?.message,
                    });
                    return;
                }

                setIsChecking(device._path, {
                    status: true,
                    retry: attempt,
                    error: response.result?.message,
                });
                await new Promise((resolve) => setTimeout(resolve, retryInterval));
            }
        }

        deleteDeviceFacts(device._path);
        setIsChecking(device._path, {
            status: false,
            retry: -1,
            error: response.result?.message,
        });

        notify(
            <Toast>
                <ToastTitle>Device Facts Retrieval Failure</ToastTitle>
                <ToastBody subtitle='Error Details'>
                    <Text>
                        An error occurred while retrieving the device facts. Please check the device configuration and
                        try again.
                    </Text>
                    <Text>Error Message: {response.result?.message}</Text>
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
        const maxRetries = 2;
        const retryInterval = 15000;
        let response;

        setIsAdopting(device._path, { status: true, retry: 0 });
        resetIsChecking(device._path);

        const bastionHost = settings?.bastionHost || {};

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            response = await adoptDevices(device, jsiTerm, deleteOutboundSSHTerm, bastionHost, ignoreCaseInName);

            if (response?.status) {
                resetIsAdopting(device.path, false);
                return;
            } else {
                console.log(
                    `${device.address}:${device.port} - Device adoption error on attempt ${attempt}:`,
                    response
                );

                if (response?.result?.status?.toLowerCase().includes('authentication failed')) {
                    setIsAdopting(device._path, {
                        status: false,
                        retry: -1,
                        error: response?.result?.message,
                    });
                    return;
                }
                setIsAdopting(device._path, {
                    status: true,
                    retry: attempt,
                    error: response?.result?.message,
                });

                await new Promise((resolve) => setTimeout(resolve, retryInterval)); // Wait before retrying
            }
        }

        resetIsAdopting(device._path, {
            status: false,
            retry: -1,
            error: response?.result?.message,
        });

        notify(
            <Toast>
                <ToastTitle>Device Adoption Failure</ToastTitle>
                <ToastBody>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text size={200}>
                            The device could not be adopted into the organization: "{device.organization}".
                        </Text>
                        <Text size={200}>Error Message: {response?.result?.message}</Text>
                    </div>
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

            const fact = findFact(device.path);
            if (!fact) return false;

            const serialNumber = fact.systemInformation?.serialNumber;
            const IsValidDeviceModel = validateDeviceModel(fact.systemInformation?.hardwareModel);
            if (!IsValidDeviceModel) return false;

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
                    await actionAdoptDevice(
                        device,
                        jsiTerm,
                        false // settings.deleteOutboundSSHTerm,
                    );
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
            await eventBus.emit('cloud-inventory-refresh', {
                targetOrgs: Array.from(targetOrgs),
                notification: false,
                force: true,
                ignoreCaseInName,
            });
        }, 3000);
    };

    const actionReleaseDevice = async (device) => {
        setIsReleasing(device.path, true);

        const cloudDevice = findCloudDevice(device._path);

        const serialNumber = cloudDevice?.serial;
        const organization = cloudDevice?.org_name;

        const result = await releaseDevices({
            organization,
            serialNumber,
            ignoreCaseInName,
        });
        if (result.status) {
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
            const cloudDevice = findCloudDevice(device._path);
            return device.path.startsWith(node.value) && !!cloudDevice;
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
            await eventBus.emit('cloud-inventory-refresh', {
                targetOrgs: Array.from(targetOrgs),
                notification: false,
                force: true,
                ignoreCaseInName,
            });
        }, 3000);
    };

    const fetchDeviceNetworkCondition = async (device, termServer = 'oc-term.mistsys.net', termPort = 2200) => {
        const maxRetries = 2;
        const retryInterval = 10000; // 10 seconds in milliseconds
        let response;

        setIsTesting(device._path, { status: true, retry: 0 });

        const bastionHost = settings?.bastionHost || {};

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            response = await getDeviceNetworkCondition(
                { ...device, timeout: 10000 },
                bastionHost,
                termServer,
                termPort
            );
            if (response.status) {
                console.log(`Network Condition: ${device._path}`, response.result);
                setDeviceNetworkCondition(device._path, response.result);
                resetIsTesting(device._path);
                return;
            } else {
                console.log(
                    `${device.address}:${device.port} - Error retrieving network condition on attempt ${attempt}:`,
                    response
                );
                if (response.result?.status?.toLowerCase().includes('authentication failed')) {
                    deleteDeviceNetworkCondition(device._path);
                    setIsTesting(device._path, {
                        status: false,
                        retry: -1,
                        error: response?.result?.message,
                    });
                    return;
                } else if (response.result?.status?.toLowerCase().includes('ssh client error')) {
                    deleteDeviceNetworkCondition(device._path);
                    setIsTesting(device._path, {
                        status: false,
                        retry: -1,
                        error: response?.result?.message,
                    });
                    return;
                }

                setIsTesting(device._path, {
                    status: true,
                    retry: attempt,
                    error: response?.result?.message,
                });
                await new Promise((resolve) => setTimeout(resolve, retryInterval));
            }
        }

        deleteDeviceNetworkCondition(device._path);
        setIsTesting(device._path, {
            status: false,
            retry: -1,
            error: response?.result?.message,
        });

        notify(
            <Toast>
                <ToastTitle>Device Network Condition Retrieval Failure</ToastTitle>
                <ToastBody subtitle='Error Details'>
                    <Text>
                        An error occurred while retrieving the device network condition information. Please check the
                        device configuration and try again.
                    </Text>
                    <Text>Error Message: {response?.result?.message}</Text>
                </ToastBody>
            </Toast>,
            { intent: 'error' }
        );
    };

    const getNetworkCondition = async (node, rate = 10) => {
        const targetDevices = inventory.filter((device) => {
            const orgName = device.organization;
            const siteName = device.site;

            const siteExists = doesSiteNameExist(orgName, siteName);

            const fact = findFact(device._path);
            if (!fact) return false;

            const IsValidDeviceModel = validateDeviceModel(fact.systemInformation?.hardwareModel);
            if (!IsValidDeviceModel) return false;

            return siteExists && device._path.startsWith(node.value);
        });

        if (targetDevices.length === 0) {
            console.log(`No devices found for node: ${node.value}`);
            return;
        }

        const organizationSet = new Set(targetDevices.map((device) => device.organization));

        const orgs = isUserLoggedIn
            ? user?.privileges
                  ?.filter((item) => item.scope === 'org')
                  .reduce((acc, item) => {
                      acc[item.name] = { id: item.org_id };
                      return acc;
                  }, {})
            : {};

        let defaultTermServer = 'oc-term.mistsys.net'; // default oc term service host
        let defaultTermPort = 2200; // default oc term service port

        for (const orgName of organizationSet) {
            const orgId = orgs[orgName].id;

            const data = await electronAPI.saProxyCall({
                api: `orgs/${orgId}/ocdevices/outbound_ssh_cmd`,
                method: 'GET',
                body: null,
            });

            if (data.proxy) {
                const setConfig = data.response.cmd;

                const regex = /client \S+ (\S+) port (\d+)/;
                const match = setConfig.match(regex);

                if (match) {
                    const hostName = match[1];
                    const port = match[2];
                    orgs[orgName].termServer = hostName;
                    orgs[orgName].termPort = port;
                } else {
                    console.log('No match term service and port found');
                }
            } else {
                console.error('outbound_ssh_cmd api call for device network condition test error: ', data?.error);
            }
        }

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const rateLimit = 1000 / rate; // Rate in calls per second
        const maxConcurrentCalls = 100; // Maximum number of concurrent async calls

        const fetchDeviceNetworkConditionWithRateLimit = async () => {
            const promises = [];
            let runningCalls = 0;

            const executeCall = async (device) => {
                const { termServer = defaultTermServer, termPort = defaultTermPort } = orgs[device.organization] || {};

                const promise = fetchDeviceNetworkCondition(device, termServer, termPort).then(() => {
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

        await fetchDeviceNetworkConditionWithRateLimit();
    };

    const ContextMenuContent = (event, node) => {
        const devices = inventory.filter(
            (device) => device._path.startsWith(node.value) && !!deviceFacts[device._path]
        );
        const devicesAdopted = devices.filter((device) => !!findCloudDevice(device._path));

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
            <div>
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
                            <Text size={200} font='numeric'>
                                Get Facts
                            </Text>
                        </MenuItem>

                        {!isUserLoggedIn && (
                            <MenuGroupHeader>
                                <Text size={100}>Please log in to perform following actions.</Text>
                            </MenuGroupHeader>
                        )}
                        <MenuItem
                            disabled={
                                !isUserLoggedIn ||
                                !isTargetDeviceAvailable() ||
                                !isOrgSiteMatch() ||
                                (node.type === 'device' &&
                                    !validateDeviceModel(findFact(node.value)?.systemInformation?.hardwareModel))
                            }
                            icon={<AdoptDeviceIcon style={{ fontSize: '14px' }} />}
                            onClick={async () => {
                                if (settingWarningShowForAdoption) {
                                    customAlert(
                                        'Device Adoption',
                                        () => {
                                            actionAdoptDevices(node);
                                        },
                                        theme,
                                        (newWarningShowForAdoption) => {
                                            const saveFunction = async () => {
                                                const newSettings = {
                                                    ...settings,
                                                    warningShowForAdoption: newWarningShowForAdoption,
                                                };
                                                setSettings(newSettings);
                                                exportSettings(newSettings);
                                            };
                                            saveFunction();
                                        }
                                    );
                                } else {
                                    actionAdoptDevices(node);
                                }
                            }}
                        >
                            <Text size={200} font='numeric'>
                                Adopt Device to Assurance
                            </Text>
                        </MenuItem>
                        {settings.jsiTerm && (
                            <MenuItem
                                disabled={
                                    !isUserLoggedIn ||
                                    !isTargetDeviceAvailable() ||
                                    !isOrgSiteMatch() ||
                                    user?.service?.toLowerCase().includes('mist') ||
                                    (node.type === 'device' &&
                                        !validateDeviceModel(findFact(node.value)?.systemInformation?.hardwareModel))
                                }
                                icon={<JsiAdoptDeviceIcon style={{ fontSize: '14px' }} />}
                                onClick={async () => {
                                    if (settingWarningShowForAdoption) {
                                        customAlert(
                                            'Device Adoption',
                                            () => {
                                                actionAdoptDevices(node, true);
                                            },
                                            theme,
                                            (newWarningShowForAdoption) => {
                                                const saveFunction = async () => {
                                                    const newSettings = {
                                                        ...settings,
                                                        warningShowForAdoption: newWarningShowForAdoption,
                                                    };
                                                    setSettings(newSettings);
                                                    exportSettings(newSettings);
                                                };
                                                saveFunction();
                                            }
                                        );
                                    } else {
                                        actionAdoptDevices(node, true);
                                    }
                                }}
                            >
                                <Text size={200} font='numeric'>
                                    {user?.service?.toLowerCase().includes('mist')
                                        ? 'JSI-only adoption not available in Mist'
                                        : 'Adopt Device to JSI-only'}
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
                            <Text size={200} font='numeric'>
                                Release Device
                            </Text>
                        </MenuItem>

                        <MenuDivider />
                        <MenuItem
                            disabled={
                                !isUserLoggedIn ||
                                !isTargetDeviceAvailable() ||
                                !isOrgSiteMatch() ||
                                (node.type === 'device' &&
                                    !validateDeviceModel(findFact(node.value)?.systemInformation?.hardwareModel))
                            }
                            icon={<DeviceNetworkConditionIcon style={{ fontSize: '14px' }} />}
                            onClick={async () => {
                                getNetworkCondition(node);
                            }}
                        >
                            <Text size={200} font='numeric'>
                                Check Network Access
                            </Text>
                        </MenuItem>
                    </MenuGroup>
                </MenuList>
            </div>
        );
    };

    const onNodeRightClick = (event, node) => {
        event.preventDefault();
        showContextMenu(event.clientX, event.clientY, ContextMenuContent(event, node));
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
        const orgNameToCompare = ignoreCaseInName ? orgName?.toLowerCase() : orgName;

        return Object.values(orgs).some((name) => {
            const nameToCompare = ignoreCaseInName ? name.toLowerCase() : name;
            return nameToCompare === orgNameToCompare;
        });
    };

    const doesSiteNameExist = (orgName, siteName) => {
        const org = cloudInventory.find((item) =>
            ignoreCaseInName ? item?.name?.toLowerCase() === orgName?.toLowerCase() : item?.name === orgName
        );

        // If the organization is not found, return false
        if (!org) {
            return false;
        }

        // Check if the site name exists within the organization's sites array
        const siteExists = org.sites?.some((site) =>
            ignoreCaseInName ? site?.name?.toLowerCase() === siteName?.toLowerCase() : site?.name === siteName
        );

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
                    <FlatTreeItem
                        {...rowData}
                        key={rowData.value}
                        onClick={() => handleToggleExpand(rowData.value)}
                        itemType='branch'
                    >
                        <TreeItemLayout
                            aside={<RenderCounterBadge counterValue={rowData.counter} />}
                            onContextMenu={(event) => onNodeRightClick(event, rowData)}
                        >
                            <Text size={200}>{rowData.content}</Text>
                        </TreeItemLayout>
                    </FlatTreeItem>
                ) : rowData.type === 'org' ? (
                    <FlatTreeItem
                        {...rowData}
                        key={rowData.value}
                        onClick={() => handleToggleExpand(rowData.value)}
                        itemType='branch'
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
                                        strikethrough={cloudInventory.length > 0}
                                        style={
                                            cloudInventory.length > 0
                                                ? {
                                                      color: tokens.colorStatusDangerForeground3,
                                                  }
                                                : null
                                        }
                                    >
                                        {rowData.content}
                                    </Text>
                                </Tooltip>
                            )}
                        </TreeItemLayout>
                    </FlatTreeItem>
                ) : rowData.type === 'site' ? (
                    <FlatTreeItem
                        {...rowData}
                        key={rowData.value}
                        onClick={() => handleToggleExpand(rowData.value)}
                        itemType='branch'
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
                                    content='Site name mismatch in cloud.'
                                    relationship='label'
                                    withArrow
                                    positioning='above-end'
                                >
                                    <Text
                                        size={100}
                                        strikethrough={cloudInventory.length > 0}
                                        style={
                                            cloudInventory.length > 0
                                                ? {
                                                      color: tokens.colorStatusDangerForeground3,
                                                  }
                                                : null
                                        }
                                    >
                                        {rowData.content}
                                    </Text>
                                </Tooltip>
                            )}
                        </TreeItemLayout>
                    </FlatTreeItem>
                ) : rowData.type === 'device' ? (
                    <FlatTreeItem
                        {...rowData}
                        key={rowData.value}
                        onClick={() => {
                            rowData?.data?.facts?.vc ? handleToggleExpand(rowData.value) : onClickDevice(rowData.value);
                        }}
                        itemType={rowData?.data?.facts?.vc ? 'branch' : 'leaf'}
                    >
                        <TreeItemLayout
                            iconBefore={<ProtocolIcon path={rowData.value} device={rowData.data} />}
                            aside={<AsideView path={rowData.value} device={rowData.data} />}
                            onContextMenu={(event) => onNodeRightClick(event, rowData)}
                        >
                            <DeviceName path={rowData.value} device={rowData.data} />
                        </TreeItemLayout>
                    </FlatTreeItem>
                ) : rowData.type === 'vc-member' ? (
                    <FlatTreeItem
                        {...rowData}
                        key={rowData.value}
                        onClick={(event) => {
                            event.preventDefault();
                            onClickDevice(rowData.parentValue);
                        }}
                        itemType='leaf'
                    >
                        <TreeItemLayout iconBefore={<LayerDiagonalFilled fontSize='12px' />}>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    gap: '5px',
                                    alignItems: 'center',
                                }}
                            >
                                <Text size={100} font='numeric' style={{ width: '38px' }}>
                                    Slot {rowData.content.slot}:
                                </Text>

                                {validateDeviceModel(rowData.content.model) ? (
                                    <Text size={100} weight='regular'>
                                        {rowData.content.model}
                                    </Text>
                                ) : (
                                    <Tooltip
                                        content={{
                                            className: styles.tooltipMaxWidthClass,
                                            children: (
                                                <Text size={100}>
                                                    {`The ${rowData.content.model?.toUpperCase()} is not valid for the ${cloudDescription}.`}
                                                </Text>
                                            ),
                                        }}
                                    >
                                        <Text
                                            size={100}
                                            weight='regular'
                                            strikethrough
                                            style={{
                                                color: tokens.colorStatusDangerForeground3,
                                            }}
                                        >
                                            {rowData.content.model}
                                        </Text>
                                    </Tooltip>
                                )}

                                <Text size={100}>{rowData.content.serial}</Text>
                                <Text size={100}>{rowData.content.role}</Text>
                            </div>
                        </TreeItemLayout>
                    </FlatTreeItem>
                ) : (
                    <FlatTreeItem
                        {...rowData}
                        key={rowData.value}
                        onClick={() => handleToggleExpand(rowData.value)}
                        itemType='leaf'
                    >
                        <TreeItemLayout
                            aside={<RenderCounterBadge counterValue={rowData.counter} />}
                            iconBefore={rowData.icon}
                        >
                            {rowData.content}
                        </TreeItemLayout>
                    </FlatTreeItem>
                );
            })}
        </FlatTree>
    );
};

export default InventoryTreeMenuLocal;
