import { create } from 'zustand';
import _, { update } from 'lodash';
const { electronAPI } = window;
import { defaultCliShortcutData } from './CommonVariables';
import yaml from 'js-yaml';

const useStore = create((set, get) => ({
    consoleWindowButtonShow: false,
    setConsoleWindowButtonShow: (consoleWindowButtonShow) => set(() => ({ consoleWindowButtonShow })),

    consoleWindowOpen: false,
    setConsoleWindowOpen: (consoleWindowOpen) => set(() => ({ consoleWindowOpen })),

    consoleWindowWidth: 300,
    setConsoleWindowWidth: (consoleWindowWidth) => set(() => ({ consoleWindowWidth })),

    getConsoleWindowWidth: () => {
        if (get().consoleWindowOpen) {
            return get().consoleWindowWidth;
        }
        return 0;
    },

    vault: [],
    setVault: (vault) =>
        set((state) => {
            if (!_.isEqual(state.vault, vault)) {
                return { vault };
            }
            return state;
        }),
    getPasswordFromVault: (tag) => {
        const state = get(); // Access the current state
        const vaultEntry = state.vault.find((item) => item.tag === tag);
        return vaultEntry ? vaultEntry.password : tag; // Return the password or tag if not found
    },

    cliShortcutMapping: {},
    setCliShortcutMapping: (cliShortcutMapping) =>
        set((state) => {
            if (!_.isEqual(state.cliShortcutMapping, cliShortcutMapping)) {
                return { cliShortcutMapping };
            }
            return state;
        }),

    settings: {},
    setSettings: (settings) =>
        set((state) => {
            if (!_.isEqual(state.settings, settings)) {
                return { settings };
            }
            return state;
        }),

    importSettings: () => {
        const importFunction = async () => {
            try {
                const response = await electronAPI.saLoadSettings();
                if (response.status) {
                    const cliShortcutData = response.settings?.cliShortcuts ?? defaultCliShortcutData;
                    let cliShortcutMapping = {};
                    try {
                        cliShortcutMapping = yaml.load(cliShortcutData);
                    } catch (error) {
                        console.log('Failed to load cliShortcutData:', error);
                    }
                    set({ settings: response.settings, cliShortcutMapping });
                }
            } catch (error) {
                console.error('Failed to import settings:', error);
            }
        };

        importFunction();
    },

    exportSettings: (newSettings = undefined) => {
        const exportFunction = async () => {
            const settings = newSettings === undefined ? get().settings : newSettings;
            try {
                await electronAPI.saSaveSettings({ settings });
                set({ settings });
            } catch (error) {
                console.error('Failed to export settings:', error);
            }
        };
        exportFunction();
    },

    toggleBastionHostActive: () => {
        const currentSettings = get().settings;
        const bastionHost = currentSettings.bastionHost;

        // Only toggle if bastionHost exists and is not empty or undefined
        if (bastionHost && !_.isEmpty(bastionHost)) {
            const updatedBastionHost = {
                ...bastionHost,
                active: !bastionHost.active,
            };
            const updatedSettings = {
                ...currentSettings,
                bastionHost: updatedBastionHost,
            };

            // Update state and export the updated settings
            set({ settings: updatedSettings });
            get().exportSettings(updatedSettings);
        }
    },

    isUserLoggedIn: false,
    setIsUserLoggedIn: (isUserLoggedIn) => set(() => ({ isUserLoggedIn })),

    isInventoryLoading: false,
    setIsInventoryLoading: (isInventoryLoading) => set(() => ({ isInventoryLoading })),

    user: null,
    orgs: {},
    setUser: (user) =>
        set((state) => {
            if (!_.isEqual(state.user, user)) {
                const orgs = {};
                user?.privileges.forEach((item) => {
                    if (item.scope === 'org') {
                        const orgId = item.org_id;
                        const orgName = item.name;
                        orgs[orgId] = orgName;
                    }
                });
                return { user, orgs };
            }
            return {};
        }),

    cloudDescription: '',
    setCloudDescription: (cloudDescription) =>
        set((state) => {
            if (state.cloudDescription !== cloudDescription) {
                return { cloudDescription };
            }
            return {};
        }),

    cloudRegionName: '',
    setCloudRegionName: (cloudRegionName) =>
        set((state) => {
            if (state.cloudRegionName !== cloudRegionName) {
                return { cloudRegionName };
            }
            return {};
        }),

    cloudDevices: {},
    cloudInventory: [],
    setCloudInventory: (cloudInventory) =>
        set((state) => {
            if (!_.isEqual(state.cloudInventory, cloudInventory)) {
                const cloudSites = {};
                const cloudDevices = {};

                cloudInventory.forEach((org) => {
                    cloudSites[org.id] = org.sites;

                    if (org.inventory) {
                        org.inventory.forEach((device) => {
                            device.is_vmac_enabled
                                ? (cloudDevices[device.original_serial] = device)
                                : (cloudDevices[device.serial] = device);
                        });
                    }
                });

                return { cloudInventory, cloudSites, cloudDevices };
            } else {
                return {};
            }
        }),

    cloudInventoryFilterApplied: false,
    setCloudInventoryFilterApplied: (cloudInventoryFilterApplied) => set(() => ({ cloudInventoryFilterApplied })),

    localDevices: {},
    siteDevices: {},
    orgDevices: {},
    inventory: [],
    setInventory: (newInventory) =>
        set((state) => {
            if (!_.isEqual(state.inventory, newInventory)) {
                newInventory.sort((a, b) => {
                    const orgCompare = a.organization.localeCompare(b.organization);
                    if (orgCompare !== 0) return orgCompare;

                    const siteCompare = a.site.localeCompare(b.site);
                    if (siteCompare !== 0) return siteCompare;

                    const addressCompare = a.address.localeCompare(b.address);
                    if (addressCompare !== 0) return addressCompare;

                    return a.port - b.port;
                });

                const localDevices = {};
                const siteDevices = {};
                const orgDevices = {};

                const updatedInventory = Array.isArray(newInventory)
                    ? newInventory.map((device) => ({
                          ...device,
                          _path: `/Inventory/${device.organization}/${device.site}/${device.address}/${device.port}`,
                      }))
                    : [];

                updatedInventory.forEach((device) => {
                    localDevices[device._path] = device;

                    if (!siteDevices[device.site]) {
                        siteDevices[device.site] = [];
                    }
                    siteDevices[device.site].push(device);

                    if (!orgDevices[device.organization]) {
                        orgDevices[device.organization] = [];
                    }
                    orgDevices[device.organization].push(device);
                });

                return {
                    inventory: updatedInventory,
                    localDevices,
                    siteDevices,
                    orgDevices,
                };
            } else {
                return {};
            }
        }),

    cloudOrgs: [],
    setCloudOrgs: (cloudOrgs) =>
        set((state) => {
            if (!_.isEqual(state.cloudOrgs, cloudOrgs)) {
                return { cloudOrgs };
            }
            return {};
        }),

    cloudSites: {},
    setCloudSites: (cloudSites) =>
        set((state) => {
            // Only update the state if the new cloudSites array is different from the current one
            if (!_.isEqual(state.cloudSites, cloudSites)) {
                return { cloudSites };
            }
            return {};
        }),

    currentActiveThemeName: 'webLightTheme',
    setCurrentActiveThemeName: (currentActiveThemeName) =>
        set((state) => {
            if (state.currentActiveThemeName !== currentActiveThemeName) {
                return { currentActiveThemeName };
            }
            return {};
        }),

    adoptConfig: '',
    setAdoptConfig: (adoptConfig) => set(() => ({ adoptConfig })),

    isPasteDisabled: false,
    setIsPasteDisabled: (isPasteDisabled) => set(() => ({ isPasteDisabled })),

    // tab (device) state management
    tabs: [],
    selectedTabValue: '',
    setSelectedTabValue: (selectedTabValue) => set(() => ({ selectedTabValue })),

    resetTabs: () =>
        set(() => {
            return {
                tabs: [],
                selectedTabValue: '',
            };
        }),

    addTab: (newTab) =>
        set((state) => {
            // Check if the tab already exists based on the 'path' property
            const tabExists = state.tabs.some((tab) => tab.path === newTab.path);

            if (!tabExists) {
                // If the tab doesn't exist, add it and set it as the selected tab
                return {
                    tabs: [...state.tabs, newTab],
                    selectedTabValue: newTab.path, // Set the newTab as the selected tab
                };
            }

            // If the tab already exists, perhaps also set it as the selected tab
            return {
                ...state,
                selectedTabValue: newTab.path, // Optionally update the selectedTabValue even if the tab exists
            };
        }),

    removeTab: (tabPath) =>
        set((state) => {
            // Find the index of the tab to be removed
            const tabIndex = state.tabs.findIndex((tab) => tab.path === tabPath);

            // If the tab isn't found, return the state unchanged
            if (tabIndex === -1) {
                return state;
            }

            // Create a new array with the tab removed
            const newTabs = [...state.tabs.slice(0, tabIndex), ...state.tabs.slice(tabIndex + 1)];

            // Determine the new selectedTabValue
            let newSelectedTabValue = '';

            if (newTabs.length > 0) {
                if (state.selectedTabValue === tabPath) {
                    // If the removed tab was the selected one, choose the next one or the previous if it was the last
                    newSelectedTabValue = newTabs[tabIndex] ? newTabs[tabIndex].path : newTabs[tabIndex - 1].path;
                } else {
                    // If the removed tab was not the selected one, keep the selectedTabValue unchanged
                    newSelectedTabValue = state.selectedTabValue;
                }
            }

            // Return the new state with the tab removed and the selectedTabValue updated
            return { tabs: newTabs, selectedTabValue: newSelectedTabValue };
        }),

    setTabProperties: (path, value) =>
        set((state) => {
            // Find the index of the tab to be updated
            const tabIndex = state.tabs.findIndex((tab) => tab.path === path);

            // If the tab isn't found, return the state unchanged
            if (tabIndex === -1) {
                return state;
            }

            // Clone the existing tabs array to avoid direct state mutation
            const updatedTabs = [...state.tabs];

            // Check if the 'junos' key exists, if so, overwrite, otherwise, add it
            // Assuming the content that we want to update is within a specific property of the tab
            // Adjust the property name as needed, here it's assumed to be `properties` for demonstration
            const updatedProperties = {
                ...updatedTabs[tabIndex].properties,
                ...value, // This ensures the 'junos' key is added or updated to true
            };

            // Update the specified tab's properties
            updatedTabs[tabIndex] = {
                ...updatedTabs[tabIndex],
                properties: updatedProperties,
            };

            // Return the new state with the tab's properties updated
            return { ...state, tabs: updatedTabs };
        }),

    getTab: (path) => {
        return get().tabs.find((tab) => tab.path === path);
    },

    getTabProperties: (path) => {
        const tab = get().tabs.find((tab) => tab.path === path);
        return tab?.properties ?? {};
    },

    getIsJunos: (path) => {
        const tab = get().tabs.find((tab) => tab.path === path);
        return tab?.properties?.isJunos ?? false;
    },
    getIsJunosConfigMode: (path) => {
        const tab = get().tabs.find((tab) => tab.path === path);
        return tab?.properties?.isJunosConfigMode ?? false;
    },


    isChecking: {},
    setIsChecking: (path, value) =>
        set((state) => ({
            isChecking: { ...state.isChecking, [path]: value },
        })),

    clearIsChecking: () =>
        set(() => ({
            isChecking: {},
        })),

    resetIsChecking: (path) =>
        set((state) => {
            const { [path]: _, ...rest } = state.isChecking;
            return { isChecking: rest };
        }),

    deviceFacts: {},
    setDeviceFactsAll: (facts) =>
        set((state) => ({
            deviceFacts: { ...facts },
        })),

    setDeviceFacts: (path, value) =>
        set((state) => {
            return {
                deviceFacts: { ...state.deviceFacts, [path]: value },
            };
        }),

    cleanUpDeviceFacts: async () => {
        const state = get();
        const inventoryPaths = new Set(state.inventory.map((item) => item._path));
        const cleanedDeviceFacts = Object.fromEntries(
            Object.entries(state.deviceFacts).filter(([key]) => inventoryPaths.has(key))
        );

        // console.log('inventoryPaths', inventoryPaths);
        // console.log('state.deviceFacts', state.deviceFacts);
        // console.log('cleanedDeviceFacts', cleanedDeviceFacts);

        await electronAPI.saSaveDeviceFacts({ facts: cleanedDeviceFacts });

        set(() => ({
            deviceFacts: cleanedDeviceFacts,
        }));
    },

    deleteDeviceFacts: (path) =>
        set((state) => {
            const { [path]: _, ...rest } = state.deviceFacts;
            return { deviceFacts: rest };
        }),
    zeroDeviceFacts: () =>
        set((state) => {
            return { deviceFacts: {} };
        }),

    isAdopting: {},
    setIsAdopting: (path, value) =>
        set((state) => ({
            isAdopting: { ...state.isAdopting, [path]: value },
        })),
    resetIsAdopting: (path) =>
        set((state) => {
            const { [path]: _, ...rest } = state.isAdopting;
            return { isAdopting: rest };
        }),

    isReleasing: {},
    setIsReleasing: (path, value) =>
        set((state) => ({
            isReleasing: { ...state.isReleasing, [path]: value },
        })),
    resetIsReleasing: (path) =>
        set((state) => {
            const { [path]: _, ...rest } = state.isReleasing;
            return { isReleasing: rest };
        }),

    deviceModels: [],
    supportedDeviceModels: {},
    setDeviceModels: (newDeviceModels) =>
        set((state) => {
            if (!_.isEqual(state.deviceModels, newDeviceModels)) {
                const updatedSupportedDeviceModels = {};

                newDeviceModels.forEach((device) => {
                    if (device.oc_device === true) {
                        const key = (device.alias || device.model).toUpperCase(); // Use alias if available, otherwise use model
                        updatedSupportedDeviceModels[key] = device;
                    }
                });

                return {
                    deviceModels: newDeviceModels,
                    supportedDeviceModels: updatedSupportedDeviceModels,
                };
            }
            return {};
        }),

    deviceNetworkCondition: {},

    setDeviceNetworkConditionAll: (networkCondition) =>
        set(() => ({
            deviceNetworkCondition: networkCondition,
        })),

    setDeviceNetworkCondition: (path, value) =>
        set((state) => ({
            deviceNetworkCondition: {
                ...state.deviceNetworkCondition,
                [path]: value,
            },
        })),

    resetDeviceNetworkConditionAll: () =>
        set(() => ({
            deviceNetworkCondition: {},
        })),

    deleteDeviceNetworkCondition: (path) =>
        set((state) => {
            const { [path]: _, ...rest } = state.deviceNetworkCondition;
            return { deviceNetworkCondition: rest };
        }),

    cleanUpDeviceNetworkCondition: () => {
        const state = get();
        const inventoryPaths = new Set(state.inventory.map((item) => item._path));

        // Filter `deviceNetworkCondition` by keys that exist in `inventoryPaths`
        const cleanedDeviceNetworkCondition = Object.fromEntries(
            Object.entries(state.deviceNetworkCondition).filter(([key]) => inventoryPaths.has(key))
        );

        // Update the state with the cleaned `deviceNetworkCondition` object
        set(() => ({
            deviceNetworkCondition: cleanedDeviceNetworkCondition,
        }));
    },

    isTesting: {},
    setIsTesting: (path, value) =>
        set((state) => ({
            isTesting: { ...state.isTesting, [path]: value },
        })),

    resetIsTestingAll: () =>
        set(() => ({
            isTesting: {},
        })),

    resetIsTesting: (path) =>
        set((state) => {
            const { [path]: _, ...rest } = state.isTesting;
            return { isTesting: rest };
        }),

    cleanUpIsTesting: async () => {
        const state = get();
        const inventoryPaths = new Set(state.inventory.map((item) => item._path));

        // Filter `isTesting` by keys that exist in `inventoryPaths`
        const cleanedIsTesting = Object.fromEntries(
            Object.entries(state.isTesting).filter(([key]) => inventoryPaths.has(key))
        );

        // Update the state with the cleaned `isTesting` object
        set(() => ({
            isTesting: cleanedIsTesting,
        }));
    },

    isAutoUpdateSupport: false,
    setIsAutoUpdateSupport: (isAutoUpdateSupport) => set(() => ({ isAutoUpdateSupport })),

    checkingForUpdate: false,
    setCheckingForUpdate: (checkingForUpdate) => set(() => ({ checkingForUpdate })),

    updateDownloaded: false,
    setUpdateDownloaded: (updateDownloaded) => set(() => ({ updateDownloaded })),
}));

export default useStore;
