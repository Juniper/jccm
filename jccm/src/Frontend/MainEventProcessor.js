import React, { useRef, useState, useEffect } from 'react';
import { Text, Toast, ToastTitle, ToastBody } from '@fluentui/react-components';
import _, { set } from 'lodash';

import { useNotify } from './Common/NotificationContext';
import eventBus from './Common/eventBus';
import useStore from './Common/StateStore';

const { electronAPI } = window;

export const MainEventProcessor = () => {
    const { notify } = useNotify();

    const { importSettings, settings } = useStore();

    const { isUserLoggedIn, setIsUserLoggedIn, user, setUser, setIsInventoryLoading } = useStore();
    const { inventory, setInventory } = useStore();
    const { cloudInventory, setCloudInventory } = useStore();
    const { deviceFacts, setDeviceFactsAll, cleanUpDeviceFacts, clearIsChecking, zeroDeviceFacts } = useStore();
    const { cloudInventoryFilterApplied, setCloudInventoryFilterApplied } = useStore();
    const { currentActiveThemeName, setCurrentActiveThemeName } = useStore();
    const { deviceModels, supportedDeviceModels, setDeviceModels } = useStore();
    const { cleanUpIsTesting, cleanUpDeviceNetworkCondition } = useStore();
    const { resetDeviceNetworkConditionAll, resetIsTestingAll } = useStore();
    const { setCheckingForUpdate, setUpdateDownloaded } = useStore();
    const { setIsAutoUpdateSupport } = useStore();

    const userRef = useRef(user);
    const isUserLoggedInRef = useRef(isUserLoggedIn);
    const inventoryRef = useRef(inventory);
    const deviceFactsRef = useRef(deviceFacts);
    const cloudInventoryRef = useRef(cloudInventory);
    const currentActiveThemeNameRef = useRef(currentActiveThemeName);

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
        const onCheckingForUpdate = () => {
            console.log('Update check initiated: Downloading new update...');
            setCheckingForUpdate(true);
        };

        const onUpdateDownloaded = () => {
            console.log('update-downloaded');
            setUpdateDownloaded(true);
        };

        const onAutoUpdateError = (data) => {
            console.log('auto-update-error: ', data);
            setCheckingForUpdate(false);
            setUpdateDownloaded(false);
            notify(
                <Toast>
                    <ToastTitle>Auto Update Failed</ToastTitle>
                    <ToastBody subtitle='An error occurred during the update.'>
                        <Text>{data?.error?.message || 'Please try again later.'}</Text>
                    </ToastBody>
                </Toast>,
                { intent: 'error' }
            );
        };

        window.electronAPI.checkingForUpdate(onCheckingForUpdate);
        window.electronAPI.updateDownloaded(onUpdateDownloaded);
        window.electronAPI.autoUpdateError(onAutoUpdateError);

        return () => {
            window.electronAPI.off('checking-for-update', onCheckingForUpdate);
            window.electronAPI.off('update-downloaded', onUpdateDownloaded);
            window.electronAPI.off('auto-update-error', onAutoUpdateError);
        };
    }, []);

    useEffect(() => {
        const handleLocalInventoryRefresh = async ({ notification = false } = {}) => {
            // console.log('Event: "local-inventory-refresh"');
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

        const handleUserSessionCheck = async ({ message = '' } = {}) => {
            console.log(`Event: "user-session-check" ${message.length > 0 ? `-> "${message}"` : ''}`);
            try {
                const data = await electronAPI.saWhoamiUser();

                if (data.sessionValid) {
                    if (!_.isEqual(userRef.current, data.user)) {
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

        const handleCheckForUpdates = async () => {
            console.log('Event: "check-for-updates"');

            try {
                const autoUpdateSupport = await window.electronAPI.checkForAutoUpdateSupport();
                setIsAutoUpdateSupport(autoUpdateSupport);

                if (!autoUpdateSupport) {
                    console.warn('Auto-update not supported on this platform.');
                    return;
                }

                const result = await window.electronAPI.checkForUpdates();
                console.log('check-for-updates result:', result);
                setCheckingForUpdate(result);
            } catch (error) {
                console.error('Error during update process:', error);
                setCheckingForUpdate(false);
                setUpdateDownloaded(false);
                setIsAutoUpdateSupport(false);
            }
        };

        const handleQuitAndInstall = async () => {
            console.log('Event: "quit-and-install"');
            try {
                await electronAPI.quitAndInstall();
            } catch (error) {
                console.error('quit-and-install error:', error);
            }
        };

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
        eventBus.on('check-for-updates', handleCheckForUpdates);
        eventBus.on('quit-and-install', handleQuitAndInstall);

        return () => {
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
            eventBus.off('check-for-updates', handleCheckForUpdates);
            eventBus.off('quit-and-install', handleQuitAndInstall);
        };
    }, []);

    return null;
};
