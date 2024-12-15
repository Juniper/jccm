import React, { useState, useRef } from 'react';
import { read, utils, writeFile } from 'xlsx';

import {
    Button,
    Link,
    Menu,
    MenuTrigger,
    MenuList,
    MenuItem,
    MenuPopover,
    MenuItemRadio,
    MenuGroup,
    MenuGroupHeader,
    MenuDivider,
    Tab,
    TabList,
    Toast,
    ToastTitle,
    Text,
    Toolbar,
    ToolbarButton,
    ToolbarDivider,
    Tooltip,
} from '@fluentui/react-components';
const { electronAPI } = window;

import {
    PersonAvailableRegular,
    ColorRegular,
    ColorFilled,
    CubeTreeRegular,
    CubeTreeFilled,
    ArrowUploadFilled,
    ArrowUploadRegular,
    ArrowDownloadFilled,
    ArrowDownloadRegular,
    BoxMultipleSearchRegular,
    ClipboardCodeRegular,
    OrganizationFilled,
    OrganizationRegular,
    DarkThemeRegular,
    PersonQuestionMarkFilled,
    PersonQuestionMarkRegular,
    CloudAddFilled,
    CloudAddRegular,
    LayoutCellFourFocusBottomLeftFilled,
    LayoutCellFourRegular,
    BoxArrowUpRegular,
    BoxMultipleRegular,
    BoxRegular,
    ClipboardRegular,
    ClipboardTaskRegular,
    MoreHorizontalFilled,
    MoreHorizontalRegular,
    TableSimpleRegular,
    TableSimpleCheckmarkRegular,
    AppsAddInRegular,
    AppsAddInFilled,
    TableMoveBelowFilled,
    TableMoveBelowRegular,
    PersonCircleRegular,
    PersonCircleFilled,
    PersonDeleteRegular,
    SettingsRegular,
    SettingsFilled,
    BoxDismissRegular,
    SearchSparkleRegular,
    ChessRegular,
    ChessFilled,
    HexagonThreeRegular,
    HexagonThreeFilled,
    MoreCircleFilled,
    MoreCircleRegular,
    XboxConsoleFilled,
    bundleIcon,
} from '@fluentui/react-icons';

import Login from '../Components/Login';
import Logout from '../Components/Logout';
import useStore from '../Common/StateStore';
import * as Constants from '../Common/CommonVariables';
import { useNotify } from '../Common/NotificationContext';
import { copyToClipboard } from '../Common/CommonVariables';
import InventoryLocalEditForm from './InventoryLocalEditForm';
import InventoryLocalImportForm from './InventoryLocalImportForm';
import InventorySearchCard from './InventorySearch/InventorySearch';
import { GlobalSettings } from './GlobalSettings/GlobalSettings';
import { Vault } from './Vault';
import EditCLIShortcutsCard from './CLIShortcutsCard';

const ColorIcon = bundleIcon(ColorFilled, ColorRegular);
const LoginUserIcon = bundleIcon(PersonAvailableRegular, PersonCircleRegular);
const LogoutUserIcon = bundleIcon(PersonDeleteRegular, PersonCircleFilled);
const CubeTree = bundleIcon(CubeTreeFilled, CubeTreeRegular);
const ArrowUpload = bundleIcon(ArrowUploadFilled, ArrowUploadRegular);
const ArrowDownload = bundleIcon(ArrowDownloadFilled, ArrowDownloadRegular);
const DiscoverInventoryIcon = bundleIcon(BoxMultipleSearchRegular, BoxMultipleRegular);
const EditCommandShortcutsIcon = bundleIcon(ClipboardCodeRegular, ClipboardRegular);
const ImportInventoryIcon = bundleIcon(AppsAddInFilled, AppsAddInRegular);
// const ImportInventoryIcon = bundleIcon(TableMoveAboveFilled, TableMoveAboveRegular);
const ExportInventoryIcon = bundleIcon(TableMoveBelowFilled, TableMoveBelowRegular);
const AdoptDeviceConfigIcon = bundleIcon(ClipboardCodeRegular, ClipboardRegular);
const Organization = bundleIcon(OrganizationFilled, OrganizationRegular);
const BastionIcon = bundleIcon(HexagonThreeFilled, HexagonThreeRegular);

const RotatedDarkThemeFilled = (props) => <DarkThemeRegular style={{ transform: 'rotate(180deg)' }} {...props} />;
const ThemeIcon = bundleIcon(RotatedDarkThemeFilled, DarkThemeRegular);
const SettingsIcon = bundleIcon(MoreCircleFilled, MoreCircleRegular);
const PersonQuestionMark = bundleIcon(PersonQuestionMarkFilled, PersonQuestionMarkRegular);
const EditInventoryIcon = bundleIcon(TableSimpleCheckmarkRegular, TableSimpleRegular);
const CloudAddIcon = bundleIcon(CloudAddFilled, CloudAddRegular);
const AssignDeviceIcon = bundleIcon(LayoutCellFourFocusBottomLeftFilled, LayoutCellFourRegular);
const AdoptDeviceIcon = bundleIcon(BoxArrowUpRegular, BoxRegular);
const MoreMenuIcon = bundleIcon(MoreHorizontalFilled, MoreHorizontalRegular);
const SettingsMenuIcon = bundleIcon(SettingsFilled, SettingsRegular);
const CopyAdoptConfigIcon = bundleIcon(ClipboardTaskRegular, ClipboardRegular);
const ReleaseDeviceIcon = bundleIcon(BoxDismissRegular, BoxRegular);

export default () => {
    const { notify } = useNotify(); // Correctly use the hook here

    const {
        user,
        isUserLoggedIn,
        currentActiveThemeName,
        setCurrentActiveThemeName,
        setAdoptConfig,
        setInventory,
        inventory,
        deviceFacts,
        cloudInventory,
    } = useStore();

    const [selectedTab, setSelectedTab] = useState('');
    const [isUserLoginCardVisible, setIsUserLoginCardVisible] = useState(false);
    const [isUserLogoutCardVisible, setIsUserLogoutCardVisible] = useState(false);

    const [isInventoryEditCardVisible, setIsInventoryEditCardVisible] = useState(false);
    const [isInventoryImportCardVisible, setIsInventoryImportCardVisible] = useState(false);
    const [isDeviceSearchCardVisible, setIsDeviceSearchCardVisible] = useState(false);
    const [isEditCLIShortcutsCardVisible, setIsEditCLIShortcutsCardVisible] = useState(false);
    const [isSettingsCardVisible, setIsSettingsCardVisible] = useState(false);

    const [importedInventory, setImportedInventory] = useState([]);
    const fileInputRef = useRef(null);

    const orgs = isUserLoggedIn
        ? user?.privileges?.filter((item) => item.scope === 'org').map((item) => ({ name: item.name, id: item.org_id }))
        : [];

    const handleChangeTheme = (event, data) => {
        event.preventDefault();
        event.stopPropagation();
        if (data.name === 'theme') {
            const theme = data.checkedItems[0];
            setCurrentActiveThemeName(theme);
            electronAPI.saSetThemeUser({ theme });
        } else {
            console.log('handleChangeTheme: unknown name', event, data);
        }
    };

    const onTabSelect = (event, data) => {
        setSelectedTab(data.value);
    };

    const onCopyAdoptionConfig = async (org) => {
        const orgId = org.id;
        const orgName = org.name;

        const data = await electronAPI.saProxyCall({
            api: `orgs/${orgId}/ocdevices/outbound_ssh_cmd`,
            method: 'GET',
            body: null,
        });

        if (data.proxy) {
            notify(
                <Toast>
                    <ToastTitle>Copied the adoption configuration for the organization: '{orgName}'.</ToastTitle>
                </Toast>,
                { intent: 'success' }
            );
            copyToClipboard(data.response.cmd);
            setAdoptConfig(data.response.cmd);
        } else {
            console.error('api call error: ', data?.error);
        }
    };

    const onFileImport = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileImport = (event) => {
        const file = event.target.files[0]; // Get the first file
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                let json = utils.sheet_to_json(worksheet);

                // Eliminate redundant rows
                const uniqueRows = Array.from(new Set(json.map(JSON.stringify))).map(JSON.parse);

                // Count organizations, sites, and devices
                const organizations = new Set();
                const sites = new Set();
                const devices = new Set();

                uniqueRows.forEach((row) => {
                    organizations.add(row.organization);
                    sites.add(`${row.organization}-${row.site}`);
                    devices.add(`${row.organization}-${row.site}-${row.address}`);
                });

                setImportedInventory(uniqueRows);
                setIsInventoryImportCardVisible(true);

                notify(
                    <Toast>
                        <ToastTitle>
                            The local inventory file has been successfully imported into the local inventory view.
                            <br />
                            {organizations.size} organizations, {sites.size} sites, and {devices.size} devices were
                            imported.
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
            organization: 'organization',
            site: 'site',
            address: 'address',
            port: 'port',
            username: 'username',
            password: 'password',
            'facts.systemInformation.hardwareModel': 'hardware model',
            'facts.systemInformation.osName': 'os name',
            'facts.systemInformation.osVersion': 'os version',
            'facts.systemInformation.serialNumber': 'serial number',
            'facts.systemInformation.hostName': 'host name',
            'facts.routeSummaryInformation.routerId': 'router id',
            'facts.interface.name': 'interface name',
        };

        // Create columnOrder for consistency and ordering in the Excel file
        const columnOrder = Object.keys(columnMapping);

        // Reorder inventory according to columnOrder
        const inventoryWithFacts = JSON.parse(JSON.stringify(inventory));
        inventoryWithFacts.forEach((device) => {
            if (deviceFacts[device._path]) {
                device.facts = deviceFacts[device._path];
            }
        });

        const orderedData = inventoryWithFacts.map((item) => {
            const orderedRow = {};
            columnOrder.forEach((key) => {
                const keys = key.split('.');
                let value = item;
                keys.forEach((k) => {
                    value = value && value[k] ? value[k] : '';
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

        // Write the workbook to a file
        const dateStr = new Date().toISOString().slice(0, 10); // format YYYY-MM-DD
        const fileName = `local-inventory-${dateStr}.xlsx`;

        writeFile(wb, fileName);

        // Notify the user of the success
        notify(
            <Toast>
                <ToastTitle>The local inventory data has been successfully exported to an Excel file.</ToastTitle>
            </Toast>,
            { intent: 'success' }
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TabList selectedValue={selectedTab} onTabSelect={onTabSelect}>
                <Menu>
                    <MenuTrigger>
                        <Tab
                            value='userTab'
                            // icon={<PersonAvailableRegular />}
                        >
                            User
                        </Tab>
                    </MenuTrigger>
                    <MenuPopover>
                        <MenuList>
                            <MenuItem
                                disabled={isUserLoggedIn}
                                onClick={() => {
                                    setIsUserLoginCardVisible(true);
                                }}
                                icon={<LoginUserIcon />}
                            >
                                Login
                            </MenuItem>
                            <MenuItem
                                disabled={!isUserLoggedIn}
                                onClick={() => {
                                    setIsUserLogoutCardVisible(true);
                                }}
                                icon={<LogoutUserIcon />}
                            >
                                Logout
                            </MenuItem>
                        </MenuList>
                    </MenuPopover>
                </Menu>
                <Menu>
                    <MenuTrigger>
                        <Tab
                            value='inventoryTab'
                            // icon={<BoxCheckmarkRegular />}
                        >
                            Inventory
                        </Tab>
                    </MenuTrigger>
                    <MenuPopover>
                        <MenuList>
                            <MenuItem
                                onClick={() => {
                                    setImportedInventory(inventory);
                                    setIsInventoryEditCardVisible(true);
                                }}
                                icon={<EditInventoryIcon />}
                                disabled={!inventory || inventory.length === 0}
                            >
                                Edit
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    onFileImport();
                                }}
                                icon={<ImportInventoryIcon />}
                            >
                                Import
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    handleExport();
                                }}
                                icon={<ExportInventoryIcon />}
                                disabled={!inventory || inventory.length === 0}
                            >
                                Export
                            </MenuItem>
                        </MenuList>
                    </MenuPopover>
                </Menu>
                <Menu>
                    <MenuTrigger>
                        <Tab value='toolsTab'>Tools</Tab>
                    </MenuTrigger>
                    <MenuPopover>
                        <MenuList>
                            <MenuItem
                                onClick={() => {
                                    setIsDeviceSearchCardVisible(true);
                                }}
                                icon={<DiscoverInventoryIcon style={{ fontSize: '16px' }} />}
                            >
                                <Text size={200}>Network Search</Text>
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setIsEditCLIShortcutsCardVisible(true);
                                }}
                                icon={<EditCommandShortcutsIcon style={{ fontSize: '16px' }} />}
                            >
                                 <Text size={200}>Edit CLI Command Shortcuts</Text>
                            </MenuItem>
                        </MenuList>
                    </MenuPopover>
                </Menu>
            </TabList>

            <Toolbar size='small'>
                <ToolbarDivider />
                <Vault editable={true} />
                <ToolbarDivider />
                <Menu>
                    <MenuTrigger disableButtonEnhancement>
                        <Tooltip
                            content='Copy the configuration for adopting this device.'
                            relationship='label'
                            withArrow
                            positioning='above-end'
                        >
                            <ToolbarButton
                                icon={<CopyAdoptConfigIcon style={{ fontSize: '20px' }} />}
                                disabled={!isUserLoggedIn}
                                appearance='subtle'
                            />
                        </Tooltip>
                    </MenuTrigger>
                    <MenuPopover>
                        <MenuList>
                            <MenuGroup>
                                <MenuGroupHeader>Select Organization</MenuGroupHeader>
                                <MenuDivider />
                                {orgs?.map((org) => (
                                    <MenuItem
                                        key={org.id}
                                        onClick={() => {
                                            onCopyAdoptionConfig(org);
                                        }}
                                        icon={<Organization style={{ fontSize: '16px' }} />}
                                    >
                                        {org.name}
                                    </MenuItem>
                                ))}
                            </MenuGroup>
                        </MenuList>
                    </MenuPopover>
                </Menu>
                <Menu checkedValues={{ theme: [currentActiveThemeName] }} onCheckedValueChange={handleChangeTheme}>
                    <MenuTrigger disableButtonEnhancement>
                        <Tooltip
                            content='Change the theme settings'
                            relationship='label'
                            withArrow
                            positioning='above-end'
                        >
                            <ToolbarButton icon={<ThemeIcon style={{ fontSize: '20px' }} />} appearance='subtle' />
                        </Tooltip>
                    </MenuTrigger>
                    <MenuPopover>
                        <MenuList>
                            <MenuGroup>
                                <MenuGroupHeader>Select Theme</MenuGroupHeader>
                                <MenuDivider />
                                {Object.entries(Constants.Themes).map(([key, value]) => (
                                    <MenuItemRadio key={key} name='theme' value={key}>
                                        {value.description}
                                    </MenuItemRadio>
                                ))}
                            </MenuGroup>
                        </MenuList>
                    </MenuPopover>
                </Menu>
                <Tooltip content='Change the global settings' relationship='label' withArrow positioning='above-end'>
                    <ToolbarButton
                        icon={<SettingsIcon style={{ fontSize: '20px' }} />}
                        appearance='subtle'
                        onClick={() => {
                            setIsSettingsCardVisible(true);
                        }}
                    />
                </Tooltip>
            </Toolbar>
            <div>
                {isUserLoginCardVisible && (
                    <Login
                        isOpen={isUserLoginCardVisible}
                        onClose={() => {
                            setIsUserLoginCardVisible(false);
                        }}
                    />
                )}
                {isUserLogoutCardVisible && (
                    <Logout
                        isOpen={isUserLogoutCardVisible}
                        onClose={() => {
                            setIsUserLogoutCardVisible(false);
                        }}
                    />
                )}
                {isInventoryImportCardVisible && (
                    <InventoryLocalImportForm
                        title={<Text size={500}>Import Inventory</Text>}
                        isOpen={isInventoryImportCardVisible}
                        onClose={async () => {
                            setIsInventoryImportCardVisible(false);
                        }}
                        importedInventory={importedInventory}
                    />
                )}
                {isInventoryEditCardVisible && (
                    <InventoryLocalEditForm
                        title={<Text size={500}>Edit Inventory</Text>}
                        isOpen={isInventoryEditCardVisible}
                        onClose={async () => {
                            setIsInventoryEditCardVisible(false);
                        }}
                        importedInventory={inventory}
                    />
                )}
                {isDeviceSearchCardVisible && (
                    <InventorySearchCard
                        isOpen={isDeviceSearchCardVisible}
                        onClose={async () => {
                            setIsDeviceSearchCardVisible(false);
                        }}
                    />
                )}
                {isEditCLIShortcutsCardVisible && (
                    <EditCLIShortcutsCard
                        isOpen={isEditCLIShortcutsCardVisible}
                        onClose={async () => {
                            setIsEditCLIShortcutsCardVisible(false);
                        }}
                    />
                )}

                {isSettingsCardVisible && (
                    <GlobalSettings
                        title={<Text size={500}>Global Settings</Text>}
                        isOpen={isSettingsCardVisible}
                        onClose={async () => {
                            setIsSettingsCardVisible(false);
                        }}
                    />
                )}
                <input
                    type='file'
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    style={{ display: 'none' }}
                    accept='.xlsx, .xls'
                />
            </div>
        </div>
    );
};
