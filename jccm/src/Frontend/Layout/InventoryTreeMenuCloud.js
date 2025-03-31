import React, { useEffect, useState, useRef } from 'react';
import {
    Tree,
    TreeItem,
    TreeItemLayout,
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
    PlugConnected16Regular,
    PlugConnected16Filled,
    PlugDisconnected16Regular,
    BoxArrowUp20Regular,
    BoxArrowUp20Filled,
    Dismiss16Regular,
    Dismiss16Filled,
    DismissCircle16Filled,
    DismissCircle16Regular,
    TagMultipleRegular,
    InfoRegular,
    BoxRegular,
    Box24Regular,
    Box20Regular,
    PersonRegular,
    PersonCircleRegular,
    CloudCubeRegular,
    LocationRegular,
    OrganizationRegular,
    GroupRegular,
    PersonDeleteRegular,
    MoreHorizontal20Regular,
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
    WarningRegular,
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
    SquareMultipleRegular,
    LayerRegular,
    LayerDiagonalRegular,
    bundleIcon,
} from '@fluentui/react-icons';
import _ from 'lodash';
const { electronAPI } = window;

import useStore from '../Common/StateStore';
import { useNotify } from '../Common/NotificationContext';
import { useContextMenu } from '../Common/ContextMenuContext';
import { copyToClipboard, capitalizeFirstChar } from '../Common/CommonVariables';
import eventBus from '../Common/eventBus';
import { OverlappingIcons } from './ChangeIcon';

const Map = bundleIcon(MapFilled, MapRegular);
const Rename = bundleIcon(RenameFilled, RenameRegular);
const DeleteDismiss = bundleIcon(DeleteDismissFilled, DeleteDismissRegular);
const CutIcon = bundleIcon(CutFilled, CutRegular);
const PasteIcon = bundleIcon(ClipboardPasteFilled, ClipboardPasteRegular);
const ArrowClockwise = bundleIcon(ArrowClockwiseFilled, ArrowClockwiseRegular);
const CopyIcon = bundleIcon(CopyFilled, CopyRegular);
const EditIcon = bundleIcon(EditFilled, EditRegular);
const LinkIcon = bundleIcon(LinkMultipleFilled, LinkMultipleRegular);
const RecycleIcon = bundleIcon(RecycleFilled, RecycleRegular);

const transformData = (cloudUserInventory) => {
    const { userEmail, userStatus, cloudDescription, cloudRegionName, cloudInventory } = cloudUserInventory;
    const result = {
        Inventory: {
            __type: 'inventory',
            [userEmail]: {
                __type: 'user',
                __status: userStatus,
                [cloudDescription]: { __type: 'cloud', [cloudRegionName]: { __type: 'region' } },
            },
        },
    };

    const regionEntry = result.Inventory[userEmail][cloudDescription][cloudRegionName];

    cloudInventory?.forEach((org) => {
        regionEntry[org.name] = { __type: 'org', __id: org.id, __name: org.name };
        const orgEntry = regionEntry[org.name];

        const inventory = [];
        const vc_node = {};
        org.inventory?.forEach((device) => {
            if (device.vc_mac) {
                if (device.vc_mac === device.mac) {
                    inventory.push(device);
                } else {
                    vc_node[device.vc_mac] = vc_node[device.vc_mac] ? [...vc_node[device.vc_mac], device] : [device];
                }
            } else {
                inventory.push(device);
            }
        });
        const vc_nodes = inventory.filter((node) => !!node.vc_mac);
        vc_nodes.forEach((device) => {
            const deviceWithoutVcNode = { ...device };
            delete deviceWithoutVcNode.vc_node;

            device.vc_node = [deviceWithoutVcNode, ...(vc_node[device.vc_mac] || [])];
        });

        inventory?.forEach((device) => {
            const siteName = device.site_name || 'Unassigned';

            if (!orgEntry[siteName]) {
                orgEntry[siteName] = { __type: 'site' };
            }

            const siteEntry = orgEntry[siteName];

            const roleTypeInCloud = device.type.charAt(0).toUpperCase() + device.type.slice(1);
            // const productModel = !!device.vc_mac
            //     ? 'Virtual Chassis'
            //     : device.model.includes('-')
            //     ? device.model.split('-')[0]
            //     : device.model;

            const productModel = !!device.vc_mac ? 'Virtual Chassis' : device.model;

            if (!siteEntry[roleTypeInCloud]) {
                siteEntry[roleTypeInCloud] = { __type: 'deviceRole' };
            }

            if (!siteEntry[roleTypeInCloud][productModel]) {
                siteEntry[roleTypeInCloud][productModel] = { __type: 'model' };
            }

            if (!device.name) {
                device.name = 'Unnamed';
            }
            const newName = `${device.name},${device.serial}`;
            siteEntry[roleTypeInCloud][productModel][newName] = { ...device, __type: 'device' };
        });
    });

    const addCount = (node) => {
        if (node.__type === 'device') {
            return 1;
        } else {
            let count = 0;
            Object.keys(node).forEach((key) => {
                if (!key.startsWith('__')) {
                    const childCount = addCount(node[key]);
                    if (typeof childCount === 'number') {
                        count += childCount; // Sum counts from children
                    }
                }
            });
            if (count > 0) {
                node['__count'] = count;
            }
            return count;
        }
    };

    addCount(result.Inventory);

    return result;
};

function formatMacAddress(mac) {
    const macArray = mac.match(/.{1,2}/g); // Split the MAC address into chunks of two characters
    return macArray.join(':').toUpperCase(); // Join the chunks with colons and convert to upper case
}

const getObjectPaths = (obj, prefix = '') => {
    let paths = [];
    for (const key in obj) {
        // Skip keys that start with "__"
        if (key.startsWith('__')) {
            continue;
        }

        // Construct the new path
        const currentPath = `${prefix}/${key}`;
        paths.push(currentPath); // Add the current path to the array

        // If the value is an object and not an array, recurse into it
        if (
            obj[key] !== null &&
            typeof obj[key] === 'object' &&
            !Array.isArray(obj[key]) &&
            obj[key].__type !== 'model'
        ) {
            paths = paths.concat(getObjectPaths(obj[key], currentPath));
        }
    }
    return paths;
};

const RenderCounterBadge = ({ counterValue }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', columnGap: '5px' }}>
            <CounterBadge count={counterValue} color='informative' size='small' overflowCount={10000} />
        </div>
    );
};

const RenderCloudInventoryTree = ({ nodes, openItems, onOpenChange }) => {
    const {
        user,
        isUserLoggedIn,
        cloudSites,
        cloudInventory,
        setCloudInventory,
        setAdoptConfig,
        setCloudInventoryFilterApplied,
    } = useStore();
    const [isOpenReleaseDialog, setIsOpenReleaseDialog] = useState(false);

    const [newName, setNewName] = useState(null);
    const { showContextMenu } = useContextMenu();
    const { notify } = useNotify();

    const onAdoptionConfigCopy = async (event, org) => {
        const orgId = org.__id;
        const orgName = org.__name;
        const endpoint = user?.cloudId?.toLowerCase() === 'jsi' ? 'jsi/devices' : 'ocdevices';

        event.stopPropagation();

        const data = await electronAPI.saProxyCall({
            api: `orgs/${orgId}/${endpoint}/outbound_ssh_cmd`,
            method: 'GET',
            body: null,
        });

        if (data.proxy) {
            notify(
                <Toast>
                    <ToastTitle>
                        Copied the {user?.cloudId?.toLowerCase() === 'jsi' ? 'jsi-term' : ''} adoption configuration for
                        the organization: '{orgName}'.
                    </ToastTitle>
                </Toast>,
                { intent: 'success' }
            );
            copyToClipboard(data.response.cmd + '\n');
            setAdoptConfig(data.response.cmd + '\n');
        } else {
            console.error('api call error: ', data?.error);
        }
    };

    const onAssignToSite = async (orgId, siteId, mac) => {
        const data = await electronAPI.saProxyCall({
            api: `orgs/${orgId}/inventory`,
            method: 'PUT',
            body: {
                op: 'assign',
                site_id: siteId,
                macs: [mac],
                disable_auto_config: true,
                managed: false,
            },
        });
        if (data.proxy) {
            await eventBus.emit('user-session-check');
        } else {
            console.error('api proxy call error for onAssignToSite: ', data?.error);
        }
    };

    const onReleaseConfirmButton = async (orgId, mac) => {
        setIsOpenReleaseDialog(false);

        // console.log('>>>> mac address:', mac);

        const data = await electronAPI.saProxyCall({
            api: `orgs/${orgId}/inventory`,
            method: 'PUT',
            body: {
                op: 'delete',
                macs: [mac],
            },
        });

        if (data.proxy) {
            await eventBus.emit('user-session-check');
        } else {
            console.error('api call error: ', data?.error);
        }
    };

    const contextMenuContent = (event, node) => {
        let org = {};
        let device = {};
        if (node.__type === 'org') org = node;
        else if (node.__type === 'device') device = node;

        return (
            <>
                <MenuList>
                    <MenuGroup>
                        <MenuGroupHeader>Organizations</MenuGroupHeader>
                        <MenuItem
                            disabled={!isUserLoggedIn || node.__type !== 'org'}
                            icon={<CopyIcon style={{ fontSize: '14px' }} />}
                            onClick={() => {
                                onAdoptionConfigCopy(event, org);
                            }}
                        >
                            <Text size={200} font='numeric'>
                                Copy Adoption Configuration
                            </Text>
                        </MenuItem>
                    </MenuGroup>

                    <MenuDivider />
                    <MenuGroup>
                        <MenuGroupHeader>Devices</MenuGroupHeader>
                        <Menu>
                            <MenuTrigger disableButtonEnhancement>
                                <MenuItem
                                    disabled={!isUserLoggedIn || node.__type !== 'device'}
                                    icon={<LinkIcon style={{ fontSize: '14px' }} />}
                                >
                                    <Text size={200} font='numeric'>
                                        Allocate to Site
                                    </Text>
                                </MenuItem>
                            </MenuTrigger>
                            <MenuPopover>
                                <MenuList>
                                    <MenuGroup>
                                        <MenuGroupHeader>Select Allocation Site</MenuGroupHeader>
                                        {node.__type === 'device' &&
                                            node.sites
                                                .filter((site) => device.site_name !== site.name) // Filter out the site with matching name
                                                .map((site) => (
                                                    <MenuItem
                                                        onClick={() =>
                                                            onAssignToSite(device.org_id, site.id, device.mac)
                                                        }
                                                        key={site.id}
                                                    >
                                                        <Text size={200} font='numeric'>
                                                            {site.name}
                                                        </Text>
                                                    </MenuItem> // Assuming each site has a unique 'id'
                                                ))}
                                    </MenuGroup>
                                </MenuList>
                            </MenuPopover>
                        </Menu>

                        <MenuDivider />
                        <MenuItem
                            disabled={node.__type !== 'device'}
                            icon={<RecycleIcon style={{ fontSize: '14px' }} />}
                            onClick={async () => {
                                setIsOpenReleaseDialog(true);
                            }}
                        >
                            <Text size={200} font='numeric'>
                                Disconnect and Remove Device
                            </Text>
                        </MenuItem>
                    </MenuGroup>
                </MenuList>
                <Dialog
                    modalType='alert'
                    open={isOpenReleaseDialog}
                    modalProps={{
                        isBlocking: true,
                    }}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '300px',
                    }}
                >
                    <DialogSurface>
                        <DialogBody>
                            <DialogTitle>Confirm Release</DialogTitle>
                            <DialogContent>
                                <div style={{ display: 'flex', flexDirection: 'column', rowGap: '10px' }}>
                                    <Divider />
                                    <Text weight='semibold'>Are you sure you want to release the device?</Text>

                                    <div style={{ display: 'flex', flexDirection: 'row', columnGap: '10px' }}>
                                        <WarningRegular style={{ fontSize: '50px' }} />
                                        <Text align='start' style={{ color: tokens.colorPaletteCranberryBorderActive }}>
                                            <strong>Warning:</strong> Releasing a device set as managed by the Cloud
                                            will initiate its zeroization. This process can take 15-20 minutes to
                                            complete, during which all existing configurations will be irreversibly
                                            erased.
                                        </Text>
                                    </div>
                                </div>
                            </DialogContent>

                            <DialogActions>
                                <Link
                                    onClick={() => {
                                        onReleaseConfirmButton(device.org_id, device.mac);
                                    }}
                                >
                                    Confirm
                                </Link>
                                <Link
                                    appearance='subtle'
                                    onClick={() => {
                                        setIsOpenReleaseDialog(false);
                                    }}
                                >
                                    Cancel
                                </Link>
                            </DialogActions>
                        </DialogBody>
                    </DialogSurface>
                </Dialog>
            </>
        );
    };

    const onNodeRightClick = (event, node) => {
        event.preventDefault(); // Prevent the default context menu
        showContextMenu(event.clientX, event.clientY, contextMenuContent(event, node));
    };

    const RenderDevice = ({ device, vc = false }) => {
        useEffect(() => {
            if (!newName) setNewName(device.name);
        }, [device]);

        return (
            <TreeItemLayout
                iconAfter={
                    <Tooltip content='Right Click to show Menu' relationship='description'>
                        <CursorClickFilled style={{ fontSize: '14px', color: tokens.colorBrandForegroundInverted }} />
                    </Tooltip>
                }
            >
                <div
                    onContextMenu={(event) => onNodeRightClick(event, { ...device, sites: cloudSites[device.org_id] })}
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        columnGap: '10px',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '5px', alignItems: 'center' }}>
                        <Avatar
                            icon={
                                !vc ? (
                                    <BoxRegular
                                        style={{
                                            color: device.connected
                                                ? tokens.colorPaletteGreenBorderActive
                                                : tokens.colorNeutralForegroundDisabled,
                                            fontSize: '14px',
                                        }}
                                    />
                                ) : (
                                    <LayerRegular
                                        style={{
                                            color: device.connected
                                                ? tokens.colorPaletteGreenBorderActive
                                                : tokens.colorNeutralForegroundDisabled,
                                            fontSize: '18px',
                                        }}
                                    />
                                )
                            }
                            shape='square'
                            badge={{
                                status: device.connected ? 'available' : 'do-not-disturb',
                                outOfOffice: !device.connected,
                            }}
                            active={{
                                status: device.connected ? 'active' : 'inactive',
                            }}
                            color={{ status: device.connected ? 'dark-green' : 'platinum' }}
                            size={24}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', rowGap: 0 }}>
                            <Text size={100} font='numeric' weight={device.name === 'Unnamed' ? 'normal' : 'semibold'}>
                                {device.name}
                            </Text>

                            {!vc && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        columnGap: '5px',
                                        marginLeft: '0px',
                                    }}
                                >
                                    <Text size={100} font='monospace'>
                                        {device.serial}
                                    </Text>

                                    <Text size={100} font='numeric'>
                                        {formatMacAddress(device.mac)}
                                    </Text>

                                    <Text size={100} font='monospace'>
                                        {device.jsi ? ' JSI' : ''}
                                    </Text>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </TreeItemLayout>
        );
    };

    const RenderVC = ({ device, pathPrefix }) => {
        useEffect(() => {
            if (!newName) setNewName(device.name);
        }, [device]);

        const nodes = device.vc ? device.vc.members : device.vc_node;

        return (
            <>
                <RenderDevice device={device} vc={true} />

                <Tree>
                    {nodes.map((node, index) => (
                        <TreeItem
                            itemType='leaf'
                            key={`${pathPrefix}/${node.serial}`}
                            value={`${pathPrefix}/${node.serial}`}
                        >
                            <TreeItemLayout>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        columnGap: '5px',
                                        marginLeft: '10px',
                                    }}
                                >
                                    <Text size={100} font='numeric' weight='normal'>
                                        {node.model}
                                    </Text>

                                    <Text size={100} font='monospace'>
                                        {node.serial}
                                    </Text>
                                    <Text size={100} font='numeric'>
                                        {formatMacAddress(node.mac)}
                                    </Text>

                                    {device.vc && (
                                        <Text size={100} font='numeric'>
                                            {node.vc_role}
                                        </Text>
                                    )}
                                </div>
                            </TreeItemLayout>
                        </TreeItem>
                    ))}
                </Tree>
            </>
        );
    };

    const renderDeviceTree = (models, pathPrefix) => {
        return (
            <Tree>
                {Object.entries(models)
                    .filter(([key]) => !key.startsWith('__'))
                    .map(([deviceName, device]) =>
                        !device.vc_mac ? (
                            <TreeItem
                                itemType='leaf'
                                key={`${pathPrefix}/${deviceName}`}
                                value={`${pathPrefix}/${deviceName}`}
                            >
                                <RenderDevice device={device} />
                            </TreeItem>
                        ) : (
                            <TreeItem
                                itemType='branch'
                                key={`${pathPrefix}/${deviceName}`}
                                value={`${pathPrefix}/${deviceName}`}
                            >
                                <RenderVC device={device} pathPrefix={`${pathPrefix}/${deviceName}`} />
                            </TreeItem>
                        )
                    )}
            </Tree>
        );
    };

    const renderModelTree = (roles, pathPrefix) => (
        <Tree>
            {Object.entries(roles)
                .filter(([key]) => !key.startsWith('__'))
                .map(([modelName, modelValue]) => (
                    <TreeItem itemType='branch' key={`${pathPrefix}/${modelName}`} value={`${pathPrefix}/${modelName}`}>
                        <TreeItemLayout aside={<RenderCounterBadge counterValue={modelValue.__count} />}>
                            <Text size={100} font='numeric' weight='normal'>
                                {modelName}
                            </Text>
                        </TreeItemLayout>
                        {renderDeviceTree(modelValue, `${pathPrefix}/${modelName}`)}
                    </TreeItem>
                ))}
        </Tree>
    );

    const renderRoleTree = (sites, pathPrefix) => (
        <Tree>
            {Object.entries(sites)
                .filter(([key]) => !key.startsWith('__'))
                .map(([roleName, roleValue]) => (
                    <TreeItem itemType='branch' key={`${pathPrefix}/${roleName}`} value={`${pathPrefix}/${roleName}`}>
                        <TreeItemLayout
                            aside={<RenderCounterBadge counterValue={roleValue.__count} />}
                            iconBefore={<GroupRegular style={{ fontSize: '14px' }} />}
                        >
                            <Text size={100} font='numeric' weight='normal'>
                                {roleName}
                            </Text>
                        </TreeItemLayout>
                        {renderModelTree(roleValue, `${pathPrefix}/${roleName}`)}
                    </TreeItem>
                ))}
        </Tree>
    );
    const renderSiteTree = (orgs, pathPrefix) => (
        <Tree size='small'>
            {Object.entries(orgs)
                .filter(([key]) => !key.startsWith('__'))
                .map(([siteName, siteValue]) => (
                    <TreeItem itemType='branch' key={`${pathPrefix}/${siteName}`} value={`${pathPrefix}/${siteName}`}>
                        <TreeItemLayout
                            aside={<RenderCounterBadge counterValue={siteValue.__count} />}
                            iconBefore={<SquareMultipleRegular style={{ fontSize: '14px' }} />}
                        >
                            <Text size={100} font='numeric' weight='normal'>
                                {siteName}
                            </Text>
                        </TreeItemLayout>
                        {renderRoleTree(siteValue, `${pathPrefix}/${siteName}`)}
                    </TreeItem>
                ))}
        </Tree>
    );

    const renderOrgTree = (regions, pathPrefix) => (
        <Tree size='small'>
            {Object.entries(regions)
                .filter(([key]) => !key.startsWith('__'))
                .map(([orgName, orgValue]) => (
                    <TreeItem itemType='branch' key={`${pathPrefix}/${orgName}`} value={`${pathPrefix}/${orgName}`}>
                        <TreeItemLayout
                            onContextMenu={(event) => onNodeRightClick(event, orgValue)}
                            aside={<RenderCounterBadge counterValue={orgValue.__count} />}
                            iconBefore={
                                <OrganizationRegular
                                    style={{ fontSize: '14px', color: tokens.colorPaletteLightGreenBorderActive }}
                                />
                            }
                            iconAfter={
                                <Tooltip content='Right Click to show Menu' relationship='description'>
                                    <CursorClickFilled
                                        style={{ fontSize: '14px', color: tokens.colorBrandForegroundInverted }}
                                    />
                                </Tooltip>
                            }
                        >
                            <Text size={100}>{orgName}</Text>
                        </TreeItemLayout>
                        {renderSiteTree(orgValue, `${pathPrefix}/${orgName}`)}
                    </TreeItem>
                ))}
        </Tree>
    );

    const renderRegionTree = (clouds, pathPrefix) => (
        <Tree size='small'>
            {Object.entries(clouds)
                .filter(([key]) => !key.startsWith('__'))
                .map(([regionName, regionValue]) => (
                    <TreeItem
                        itemType='branch'
                        key={`${pathPrefix}/${regionName}`}
                        value={`${pathPrefix}/${regionName}`}
                    >
                        <TreeItemLayout
                            aside={<RenderCounterBadge counterValue={regionValue.__count} />}
                            iconBefore={<LocationRegular style={{ fontSize: '14px' }} />}
                        >
                            <Text size={100}>{regionName}</Text>
                        </TreeItemLayout>
                        {renderOrgTree(regionValue, `${pathPrefix}/${regionName}`)}
                    </TreeItem>
                ))}
        </Tree>
    );

    const renderCloudTree = (users, pathPrefix) => {
        return (
            <Tree>
                {Object.entries(users)
                    .filter(([key]) => !key.startsWith('__'))
                    .map(([cloudName, cloudValue]) => (
                        <TreeItem
                            itemType='branch'
                            key={`${pathPrefix}/${cloudName}`}
                            value={`${pathPrefix}/${cloudName}`}
                        >
                            <TreeItemLayout
                                aside={<RenderCounterBadge counterValue={cloudValue.__count} />}
                                iconBefore={<CloudCubeRegular style={{ fontSize: '14px' }} />}
                            >
                                <Text size={100}>{cloudName}</Text>
                            </TreeItemLayout>
                            {renderRegionTree(cloudValue, `${pathPrefix}/${cloudName}`)}
                        </TreeItem>
                    ))}
            </Tree>
        );
    };

    const renderUserTree = (inventories, pathPrefix) => (
        <Tree size='small'>
            {Object.entries(inventories)
                .filter(([key]) => !key.startsWith('__'))
                .map(([userEmail, userValue]) => {
                    return (
                        <TreeItem
                            itemType='branch'
                            key={`${pathPrefix}/${userEmail}`}
                            value={`${pathPrefix}/${userEmail}`}
                        >
                            <TreeItemLayout
                                aside={<RenderCounterBadge counterValue={userValue.__count} />}
                                iconBefore={
                                    userValue.__status === 'available' ? (
                                        <PersonCircleRegular style={{ fontSize: '14px' }} />
                                    ) : (
                                        <PersonDeleteRegular
                                            style={{
                                                fontSize: '18px',
                                                color: tokens.colorPaletteDarkOrangeBorderActive,
                                            }}
                                        />
                                    )
                                }
                            >
                                <Text size={100}>{userEmail}</Text>
                            </TreeItemLayout>
                            {renderCloudTree(userValue, `${pathPrefix}/${userEmail}`)}
                        </TreeItem>
                    );
                })}
        </Tree>
    );

    const pathPrefix = '';

    return (
        <Tree
            size='small'
            aria-label='cloudInventoryTree'
            openItems={openItems}
            onOpenChange={onOpenChange}
            style={{
                width: '100%',
                height: 'auto',
            }}
        >
            {Object.entries(nodes)
                .filter(([key]) => !key.startsWith('__'))
                .map(([inventoryName, inventoryValue]) => (
                    <TreeItem
                        itemType='branch'
                        key={`${pathPrefix}/${inventoryName}`}
                        value={`${pathPrefix}/${inventoryName}`}
                    >
                        <TreeItemLayout aside={<RenderCounterBadge counterValue={inventoryValue.__count} />}>
                            {inventoryName}
                        </TreeItemLayout>
                        {renderUserTree(inventoryValue, `${pathPrefix}/${inventoryName}`)}
                    </TreeItem>
                ))}
        </Tree>
    );
};

const InventoryTreeMenuCloud = () => {
    const { user, isUserLoggedIn, cloudInventory, cloudSites, setAdoptConfig } = useStore();

    const cloudUserInventory = {
        userEmail: user?.email,
        userStatus: 'available',
        cloudDescription: user?.cloudDescription,
        cloudRegionName: user?.regionName,
        cloudInventory: JSON.parse(JSON.stringify(cloudInventory)), // Duplicated the cloudInventory array to prevent unnecessary changes
    };

    const newInventory = transformData(cloudUserInventory);
    const [openItems, setOpenItems] = useState(new Set());
    const defaultOpenItems = getObjectPaths(newInventory);

    const toggleItemOpen = (itemKey) => {
        setOpenItems((prevOpenItems) => {
            const updatedOpenItems = new Set(prevOpenItems);
            if (updatedOpenItems.has(itemKey)) {
                updatedOpenItems.delete(itemKey);
            } else {
                updatedOpenItems.add(itemKey);
            }
            return updatedOpenItems;
        });
    };

    useEffect(() => {
        function loadAndSetData() {
            setOpenItems((prevOpenItems) => {
                // Filter out orphan items (items not in defaultOpenItems)
                const validOpenItems = new Set(
                    Array.from(prevOpenItems).filter((item) => {
                        const parts = item.split('/');
                        const rebuiltItem = parts.slice(0, -1).join('/');

                        return item.toLowerCase().includes('virtual chassis')
                            ? defaultOpenItems.includes(rebuiltItem)
                            : defaultOpenItems.includes(item);
                    })
                );

                // Add any new items from defaultOpenItems to validOpenItems
                defaultOpenItems.forEach((item) => {
                    validOpenItems.add(item);
                });

                return validOpenItems;
            });
        }
        loadAndSetData();
    }, [cloudInventory]);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: '100%',
                height: 'auto',
            }}
        >
            <RenderCloudInventoryTree
                nodes={newInventory}
                openItems={Array.from(openItems)}
                onOpenChange={(e, data) => {
                    const path = data.value;
                    toggleItemOpen(path);
                }}
            />
        </div>
    );
};

export default InventoryTreeMenuCloud;
