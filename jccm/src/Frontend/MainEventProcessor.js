import React, { useRef, useState, useEffect } from 'react';
import { Text, Toast, ToastTitle, ToastBody } from '@fluentui/react-components';
import _, { set } from 'lodash';

import { useNotify } from './Common/NotificationContext';
import eventBus from './Common/eventBus';
import useStore from './Common/StateStore';

const { electronAPI } = window;

export const MainEventProcessor = () => {
    const { notify } = useNotify();

    const { importSettings, settings, setVault } = useStore();

    const { isUserLoggedIn, setIsUserLoggedIn, user, setUser, setIsInventoryLoading } = useStore();
    const { inventory, setInventory } = useStore();
    const { cloudInventory, setCloudInventory } = useStore();
    const { deviceFacts, setDeviceFactsAll, cleanUpDeviceFacts, clearIsChecking, zeroDeviceFacts } = useStore();
    const { cloudInventoryFilterApplied, setCloudInventoryFilterApplied } = useStore();
    const { currentActiveThemeName, setCurrentActiveThemeName } = useStore();
    const { deviceModels, supportedDeviceModels, setDeviceModels } = useStore();
    const { cleanUpIsTesting, cleanUpDeviceNetworkCondition } = useStore();
    const { resetDeviceNetworkConditionAll, resetIsTestingAll } = useStore();
    const { resetIsConfiguringAll, resetConfigShortcutCommitResultAll } = useStore();
    const { checkingForUpdate, setCheckingForUpdate, updateDownloaded, setUpdateDownloaded } = useStore();
    const { isAutoUpdateSupport, setIsAutoUpdateSupport } = useStore();

    const userRef = useRef(user);
    const isUserLoggedInRef = useRef(isUserLoggedIn);
    const inventoryRef = useRef(inventory);
    const deviceFactsRef = useRef(deviceFacts);
    const cloudInventoryRef = useRef(cloudInventory);
    const currentActiveThemeNameRef = useRef(currentActiveThemeName);

    const [isFirstCheckIgnored, setIsFirstCheckIgnored] = useState(true);
    const isFirstCheckIgnoredRef = useRef(isFirstCheckIgnored);

    useEffect(() => {
        isFirstCheckIgnoredRef.current = isFirstCheckIgnored;
    }, [isFirstCheckIgnored]);

    useEffect(() => {
        // Set a 10-second timeout to allow update checks after the delay
        const timer = setTimeout(() => {
            console.log('10-second initial wait over. Update checks are now allowed.');
            setIsFirstCheckIgnored(false); // Allow update checks after 10 seconds
        }, 10000);

        // Cleanup the timer on component unmount
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        importSettings();
    }, []);

    useEffect(() => {
        isUserLoggedInRef.current = isUserLoggedIn;
    }, [isUserLoggedIn]);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        inventoryRef.current = inventory;
    }, [inventory]);

    useEffect(() => {
        deviceFactsRef.current = deviceFacts;
    }, [deviceFacts]);

    useEffect(() => {
        cloudInventoryRef.current = cloudInventory;
    }, [cloudInventory]);

    useEffect(() => {
        currentActiveThemeNameRef.current = currentActiveThemeName;
    }, [currentActiveThemeName]);

    useEffect(() => {
        const onUpdateDownloaded = () => {
            console.log('update-downloaded');
            setUpdateDownloaded(true);
        };

        const onAutoUpdateError = (error) => {
            console.log('auto-update-error: ', error);
            setCheckingForUpdate(false);
            setUpdateDownloaded(false);
        };

        window.electronAPI.updateDownloaded(onUpdateDownloaded);
        window.electronAPI.autoUpdateError(onAutoUpdateError);

        return () => {
            window.electronAPI.off('update-downloaded', onUpdateDownloaded);
            window.electronAPI.off('auto-update-error', onAutoUpdateError);
        };
    }, []);

    useEffect(() => {
        const handleLoadVault = async () => {
            console.log('Event: "load-vault"');
            const response = await electronAPI.saLoadVault();
            if (response.result) {
                setVault(response.vault);
            }
        };

        const handleSaveVault = async (vault) => {
            console.log('Event: "store-vault"');
            const response = await electronAPI.saStoreVault({ vault });
            if (response.result) {
                setVault(vault);
            }
        };

        const handleLocalInventoryRefresh = async ({ notification = false } = {}) => {
            console.log('Event: "local-inventory-refresh"');
            const response = await electronAPI.saGetLocalInventory();
            if (response.localInventory) {
                if (!_.isEqual(inventoryRef.current, response.localInventory)) {
                    setInventory(response.inventory);
                }

                if (notification) {
                    notify(
                        <Toast>
                            <ToastTitle>Local Inventory Refreshed</ToastTitle>
                            <ToastBody subtitle='Update Successful'>
                                <Text>The local inventory has been successfully updated.</Text>
                            </ToastBody>
                        </Toast>,
                        { intent: 'success' }
                    );
                }
            }
        };

        const compareIgnoringFields = (obj1, obj2, fieldsToIgnore) => {
            const obj1Filtered = _.omit(obj1, fieldsToIgnore);
            const obj2Filtered = _.omit(obj2, fieldsToIgnore);
            return _.isEqual(obj1Filtered, obj2Filtered);
        };

        const handleUserSessionCheck = async ({ message = '' } = {}) => {
            console.log(`Event: "user-session-check" ${message.length > 0 ? `-> "${message}"` : ''}`);
            try {
                const data = await electronAPI.saWhoamiUser();

                if (data.sessionValid) {
                    const currentUserState = useStore.getState().user;
                    const newUserState = data.user;
                    const areEqual = compareIgnoringFields(currentUserState, newUserState, ['tags']);

                    if (!areEqual) {
                        // console.log('userRef.current:', userRef.current);
                        // console.log('data.user:', data.user);
                        // console.log('User session will be updated:', data.user);

                        setUser(data.user);
                        setIsUserLoggedIn(true);
                        await handleCloudInventoryRefresh({ force: true });
                    }
                    if (currentActiveThemeNameRef.current !== data?.user?.theme) {
                        setCurrentActiveThemeName(data.user.theme);
                    }
                } else {
                    setUser(null);
                    setCloudInventory([]);
                    setDeviceModels([]);
                    setIsUserLoggedIn(false);
                    setCurrentActiveThemeName(data.theme);
                }
            } catch (error) {
                setUser(null);
                setCloudInventory([]);
                setIsUserLoggedIn(false);
                console.error('Session check error:', error);
            }
        };

        const handleCloudInventoryRefresh = async ({
            targetOrgs = null,
            notification = false,
            force = false,
            ignoreCaseInName = false,
        } = {}) => {
            console.log('Event: "cloud-inventory-refresh" force:', force);
            if (!force && !isUserLoggedInRef.current) return;

            // Initialize a timeout for setting the loading state
            const loadingTimeout = setTimeout(() => {
                setIsInventoryLoading(true);
            }, 3000);

            const response = await electronAPI.saGetCloudInventory({
                targetOrgs,
                ignoreCaseInName,
            });

            clearTimeout(loadingTimeout);
            setIsInventoryLoading(false);

            if (response.cloudInventory) {
                if (!_.isEqual(cloudInventoryRef.current, response.inventory)) {
                    setCloudInventory(response.inventory);
                    setCloudInventoryFilterApplied(response.isFilterApplied);
                }

                if (notification) {
                    notify(
                        <Toast>
                            <ToastTitle>Cloud Inventory Refreshed</ToastTitle>
                            <ToastBody subtitle='Update Successful'>
                                <Text>The cloud inventory has been successfully updated.</Text>
                            </ToastBody>
                        </Toast>,
                        { intent: 'success' } // Changed from 'warning' to 'success' to match the positive nature of the message
                    );
                }
            } else {
                if (notification) {
                    notify(
                        <Toast>
                            <ToastTitle>Cloud Inventory Refresh Failed</ToastTitle>
                            <ToastBody subtitle='Update Error'>
                                <Text>The cloud inventory update was unsuccessful.</Text>
                            </ToastBody>
                        </Toast>,
                        { intent: 'error' }
                    );
                }
            }
        };

        const handleCloudInventoryReset = async () => {
            setCloudInventory([]);
        };

        const handleResetDeviceFacts = async ({ notification = false } = {}) => {
            console.log('Event: "reset-device-facts"');

            clearIsChecking();
            zeroDeviceFacts();
            await electronAPI.saSaveDeviceFacts({ facts: {} });

            if (notification) {
                notify(
                    <Toast>
                        <ToastTitle>Device facts Reset</ToastTitle>
                        <ToastBody subtitle='Device facts'>
                            <Text>The Device facts has been successfully reset.</Text>
                        </ToastBody>
                    </Toast>,
                    { intent: 'success' }
                );
            }
        };

        const handleDeviceFactsRefresh = async () => {
            console.log('Event: "device-facts-refresh"');
            const data = await electronAPI.saLoadDeviceFacts();

            if (data.deviceFacts) {
                if (!_.isEqual(deviceFactsRef.current, data.facts)) {
                    setDeviceFactsAll(data.facts);
                }
            }
        };

        const handleDeviceFactsCleanup = async () => {
            console.log('Event: "device-facts-cleanup"');
            cleanUpDeviceFacts();
        };

        const handleDeviceModelsRefresh = async () => {
            console.log('Event: "device-models-refresh"');
            try {
                const data = await electronAPI.saDeviceModels();
                // console.log('Device models:', data.deviceModels);
                setDeviceModels(data.deviceModels);
            } catch (error) {
                console.error('Device models refresh error:', error);
            }
        };

        const handleDeviceNetworkConditionCheckRefresh = async () => {
            console.log('Event: "device-network-access-check-refresh"');
            cleanUpIsTesting();
            cleanUpDeviceNetworkCondition();
        };

        const handleDeviceNetworkConditionCheckReset = async () => {
            console.log('Event: "device-network-access-check-reset"');
            resetIsTestingAll();
            resetDeviceNetworkConditionAll();
        };


        const handleDeviceConfigShortcutStatusReset = async () => {
            console.log('Event: "device-config-shortcut-status-reset"');
            resetIsConfiguringAll();
            resetConfigShortcutCommitResultAll();
        }

        const handleCheckForUpdates = async () => {
            console.log('Event: "check-for-updates"');

            if (isFirstCheckIgnoredRef.current) {
                console.log('Skipping update check during initial 10 seconds.');
                return;
            }

            const isAutoUpdateSupported = useStore.getState().isAutoUpdateSupport;

            if (!isAutoUpdateSupported) {
                console.warn('Auto-update not supported on this platform.');
                return;
            }

            try {
                const result = await window.electronAPI.checkForUpdates();
                setCheckingForUpdate(result);
            } catch (error) {
                console.error('Error during update process:', error);
                setCheckingForUpdate(false);
                setUpdateDownloaded(false);
                setIsAutoUpdateSupport(false);
            }
        };

        const handleCheckForAutoUpdateSupport = async () => {
            console.log('Event: "check-for-auto-update-support"');
            const autoUpdateSupport = await window.electronAPI.checkForAutoUpdateSupport();
            setIsAutoUpdateSupport(autoUpdateSupport);
        };

        const handleQuitAndInstall = async () => {
            console.log('Event: "quit-and-install"');
            try {
                await electronAPI.quitAndInstall();
            } catch (error) {
                console.error('quit-and-install error:', error);
            }
        };

        const handleRestartApp = async () => {
            console.log('Event: "restart-app"');
            try {
                await electronAPI.restartApp();
            } catch (error) {
                console.error('restart-app error:', error);
            }
        };

        const handleClearDatabaseAndRestartApp = async () => {
            console.log('Event: "clear-database-and-restart-app"');
            try {
                await electronAPI.clearDatabaseAndRestartApp();
            } catch (error) {
                console.error('clear-database-and-restart-app error:', error);
            }
        };

        const handleQuitApp = async () => {
            console.log('Event: "quit-app"');
            try {
                await electronAPI.quitApp();
            } catch (error) {
                console.error('quit-app error:', error);
            }
        };

        eventBus.on('load-vault', handleLoadVault);
        eventBus.on('store-vault', handleSaveVault);
        eventBus.on('user-session-check', handleUserSessionCheck);
        eventBus.on('local-inventory-refresh', handleLocalInventoryRefresh);
        eventBus.on('cloud-inventory-refresh', handleCloudInventoryRefresh);
        eventBus.on('cloud-inventory-reset', handleCloudInventoryReset);
        eventBus.on('reset-device-facts', handleResetDeviceFacts);
        eventBus.on('device-facts-refresh', handleDeviceFactsRefresh);
        eventBus.on('device-facts-cleanup', handleDeviceFactsCleanup);
        eventBus.on('device-models-refresh', handleDeviceModelsRefresh);
        eventBus.on('device-network-access-check-refresh', handleDeviceNetworkConditionCheckRefresh);
        eventBus.on('device-network-access-check-reset', handleDeviceNetworkConditionCheckReset);
        eventBus.on('device-config-shortcut-status-reset', handleDeviceConfigShortcutStatusReset)
        eventBus.on('check-for-updates', handleCheckForUpdates);
        eventBus.on('check-for-auto-update-support', handleCheckForAutoUpdateSupport);
        eventBus.on('quit-and-install', handleQuitAndInstall);
        eventBus.on('restart-app', handleRestartApp);
        eventBus.on('clear-database-and-restart-app', handleClearDatabaseAndRestartApp);
        eventBus.on('quit-app', handleQuitApp);

        return () => {
            eventBus.off('load-vault', handleLoadVault);
            eventBus.off('store-vault', handleSaveVault);
            eventBus.off('local-inventory-refresh', handleLocalInventoryRefresh);
            eventBus.off('cloud-inventory-refresh', handleCloudInventoryRefresh);
            eventBus.off('user-session-check', handleUserSessionCheck);
            eventBus.off('cloud-inventory-reset', handleCloudInventoryReset);
            eventBus.off('reset-device-facts', handleResetDeviceFacts);
            eventBus.off('device-facts-refresh', handleDeviceFactsRefresh);
            eventBus.off('device-facts-cleanup', handleDeviceFactsCleanup);
            eventBus.off('device-models-refresh', handleDeviceModelsRefresh);
            eventBus.off('device-network-access-check-refresh', handleDeviceNetworkConditionCheckRefresh);
            eventBus.off('device-network-access-check-reset', handleDeviceNetworkConditionCheckReset);
            eventBus.off('device-config-shortcut-status-reset', handleDeviceConfigShortcutStatusReset)
            eventBus.off('check-for-updates', handleCheckForUpdates);
            eventBus.off('check-for-auto-update-support', handleCheckForAutoUpdateSupport);
            eventBus.off('quit-and-install', handleQuitAndInstall);
            eventBus.off('restart-app', handleRestartApp);
            eventBus.off('clear-database-and-restart-app', handleClearDatabaseAndRestartApp);
            eventBus.off('quit-app', handleQuitApp);
        };
    }, []);

    return null;
};
