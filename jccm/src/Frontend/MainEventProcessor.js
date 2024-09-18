import React, { useRef, useState, useEffect } from 'react';
import { Text, Toast, ToastTitle, ToastBody } from '@fluentui/react-components';
import _ from 'lodash';

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
    const { deviceFacts, setDeviceFactsAll, cleanUpDeviceFacts, zeroDeviceFacts } = useStore();
    const { cloudInventoryFilterApplied, setCloudInventoryFilterApplied } = useStore();
    const { currentActiveThemeName, setCurrentActiveThemeName } = useStore();

    const userRef = useRef(user);
    const inventoryRef = useRef(inventory);
    const deviceFactsRef = useRef(deviceFacts);
    const cloudInventoryRef = useRef(cloudInventory);
    const currentActiveThemeNameRef = useRef(currentActiveThemeName);

    useEffect(() => {
        importSettings();
        console.log('imported settings', settings);
    }, []);

    useEffect(() => {
        userRef.current = user;
        inventoryRef.current = inventory;
        deviceFactsRef.current = deviceFacts;
        cloudInventoryRef.current = cloudInventory;
        currentActiveThemeNameRef.current = currentActiveThemeName;
    }, [inventory, deviceFacts, cloudInventory, currentActiveThemeName]);

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

        const handleCloudInventoryRefresh = async ({ targetOrgs = null, notification = false } = {}) => {
            if (!isUserLoggedIn) return;

            // console.log('Event: "cloud-inventory-refresh"');

            // Initialize a timeout for setting the loading state
            const loadingTimeout = setTimeout(() => {
                setIsInventoryLoading(true);
            }, 3000);

            const response = await electronAPI.saGetCloudInventory({targetOrgs});

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
            // console.log('Event: "reset-device-facts"');

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

        const handleUserSessionCheck = async ({ message = '' } = {}) => {
            // console.log(`Event: "user-session-check" ${message.length > 0  ? `-> "${message}"` : ''}`);
            try {
                const data = await electronAPI.saWhoamiUser();
                if (data.sessionValid) {
                    if (!_.isEqual(userRef.current, data.user)) {
                        setUser(data.user);
                        setIsUserLoggedIn(true);
                    }
                    if (currentActiveThemeNameRef.current !== data?.user?.theme) {
                        setCurrentActiveThemeName(data.user.theme);
                    }

                    await handleCloudInventoryRefresh();
                } else {
                    setUser(null);
                    setCloudInventory([]);
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

        const handleDeviceFactsRefresh = async () => {
            // console.log('Event: "device-facts-refresh"');
            const data = await electronAPI.saLoadDeviceFacts();

            if (data.deviceFacts) {
                if (!_.isEqual(deviceFactsRef.current, data.facts)) {
                    setDeviceFactsAll(data.facts);
                }
            }
        };

        const handleDeviceFactsCleanup = async () => {
            // console.log('Event: "device-facts-cleanup"');
            cleanUpDeviceFacts();
        };

        eventBus.on('local-inventory-refresh', handleLocalInventoryRefresh);
        eventBus.on('cloud-inventory-refresh', handleCloudInventoryRefresh);
        eventBus.on('cloud-inventory-reset', handleCloudInventoryReset);
        eventBus.on('reset-device-facts', handleResetDeviceFacts);
        eventBus.on('user-session-check', handleUserSessionCheck);
        eventBus.on('device-facts-refresh', handleDeviceFactsRefresh);
        eventBus.on('device-facts-cleanup', handleDeviceFactsCleanup);

        return () => {
            eventBus.off('local-inventory-refresh', handleLocalInventoryRefresh);
            eventBus.off('cloud-inventory-refresh', handleCloudInventoryRefresh);
            eventBus.off('cloud-inventory-reset', handleCloudInventoryReset);
            eventBus.off('reset-device-facts', handleResetDeviceFacts);
            eventBus.off('user-session-check', handleUserSessionCheck);
            eventBus.off('device-facts-refresh', handleDeviceFactsRefresh);
            eventBus.off('device-facts-cleanup', handleDeviceFactsCleanup);
        };
    }, []);

    return null;
};
