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

    const { isUserLoggedIn, setIsUserLoggedIn, user, setUser } = useStore();
    const { inventory, setInventory } = useStore();
    const { cloudInventory, setCloudInventory } = useStore();
    const { deviceFacts, setDeviceFactsAll, setDeviceFacts, deleteDeviceFacts, zeroDeviceFacts } = useStore();
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

        const handleCloudInventoryRefresh = async ({ notification = false } = {}) => {
            console.log('Event: "cloud-inventory-refresh"');

            const response = await electronAPI.saGetCloudInventory();

            if (response.cloudInventory) {
                if (!_.isEqual(cloudInventoryRef.current, response.inventory)) {
                    console.log('>>>cloudInventory', response.inventory);
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

        const handleResetDeviceFacts = async ({ notification = false } = {}) => {
            console.log('Event: "reset-device-facts"');

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
            console.log(`Event: "user-session-check" ${message}`);
            try {
                const data = await electronAPI.saWhoamiUser();
                if (data.sessionValid) {
                    console.log('user-session-check: data', data);
                    if (!_.isEqual(userRef.current, data.user)) {
                        console.log('>>>user:', data.user);
                        setUser(data.user);
                        setIsUserLoggedIn(true);
                    }
                    if (currentActiveThemeNameRef.current !== data?.user?.theme) {
                        setCurrentActiveThemeName(data.user.theme);
                    }
                    if (!_.isEqual(cloudInventoryRef.current, data?.inventory)) {
                        setCloudInventory(data.inventory);
                        setCloudInventoryFilterApplied(data.isFilterApplied);
                    }
                } else {
                    setUser(null);
                    setIsUserLoggedIn(false);
                    setCurrentActiveThemeName(data.theme);
                }
            } catch (error) {
                setUser(null);
                setIsUserLoggedIn(false);
                console.error('Session check error:', error);
            }
        };

        const handleDeviceFactsRefresh = async () => {
            console.log('handleDeviceFactsRefresh');
            const data = await electronAPI.saLoadDeviceFacts();

            if (data.deviceFacts) {
                if (!_.isEqual(deviceFactsRef.current, data.facts)) {
                    setDeviceFactsAll(data.facts);
                }
            }
        };

        eventBus.on('local-inventory-refresh', handleLocalInventoryRefresh);
        eventBus.on('cloud-inventory-refresh', handleCloudInventoryRefresh);
        eventBus.on('reset-device-facts', handleResetDeviceFacts);
        eventBus.on('user-session-check', handleUserSessionCheck);
        eventBus.on('device-facts-refresh', handleDeviceFactsRefresh);

        return () => {
            eventBus.off('local-inventory-refresh', handleLocalInventoryRefresh);
            eventBus.off('cloud-inventory-refresh', handleCloudInventoryRefresh);
            eventBus.off('reset-device-facts', handleResetDeviceFacts);
            eventBus.off('user-session-check', handleUserSessionCheck);
            eventBus.off('device-facts-refresh', handleDeviceFactsRefresh);
        };
    }, []);

    return null;
};
