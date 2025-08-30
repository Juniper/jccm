import React, { useState, useRef, useEffect } from 'react';
import {
    Button,
    Field,
    Input,
    SpinButton,
    Divider,
    Tooltip,
    Text,
    Dialog,
    DialogSurface,
    Toast,
    ToastTitle,
    ToastBody,
    Switch,
    tokens,
} from '@fluentui/react-components';
import {
    EyeRegular,
    EyeOffRegular,
    DismissFilled,
    DismissRegular,
    SubtractCircleRegular,
    SubtractCircleFilled,
    bundleIcon,
} from '@fluentui/react-icons';

import validator from 'validator';
import ip from 'ip';
import _ from 'lodash';

import { useNotify } from '../../Common/NotificationContext';
import useStore from '../../Common/StateStore';
import eventBus from '../../Common/eventBus';

const Dismiss = bundleIcon(DismissFilled, DismissRegular);
const DeleteIcon = bundleIcon(SubtractCircleFilled, SubtractCircleRegular);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const MessageFilterCard = () => {
    const { settings, setSettings, setConsoleWindowOpen, exportSettings } = useStore();

    const saveWarningShowForAdoption = (newWarningShowForAdoption) => {
        const saveFunction = async () => {
            const newSettings = {
                ...settings,
                warningShowForAdoption: newWarningShowForAdoption,
            };
            setSettings(newSettings);
            exportSettings(newSettings);
        };
        saveFunction();
    };

    const saveWarningShowForNetworkSearch = (newWarningShowForNetworkSearch) => {
        const saveFunction = async () => {
            const newSettings = {
                ...settings,
                warningShowForNetworkSearch: newWarningShowForNetworkSearch,
            };
            setSettings(newSettings);
            exportSettings(newSettings);
        };
        saveFunction();
    };

    const saveWarningShowForConfigShortcut = (newWarningShowForConfigShortcut) => {
        const saveFunction = async () => {
            const newSettings = {
                ...settings,
                warningShowForConfigShortcut: newWarningShowForConfigShortcut,
            };
            setSettings(newSettings);
            exportSettings(newSettings);
        };
        saveFunction();
    };

    const onChangWarningShowForAdoption = async (event) => {
        const checked = event.currentTarget.checked;
        saveWarningShowForAdoption(checked);
    };

    const onChangeWarningShowForNetworkSearch = async (event) => {
        const checked = event.currentTarget.checked;
        saveWarningShowForNetworkSearch(checked);
    };

    const onChangeWarningShowForConfigShortcut = async (event) => {
        const checked = event.currentTarget.checked;
        saveWarningShowForConfigShortcut(checked);
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'center',
                width: '100%',
                marginLeft: '10px',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    gap: '0px',
                    width: '100%',
                    marginLeft: '10px',
                }}
            >
                <Text>Show warning message for cloud multi-homed device adoption:</Text>
                <div
                    style={{
                        transform: 'scale(0.6)',
                        transformOrigin: 'right',
                    }}
                >
                    <Switch
                        checked={settings.warningShowForAdoption ? true : false}
                        onChange={onChangWarningShowForAdoption}
                    />
                </div>
                <Text size={200}>{settings.warningShowForAdoption ? 'Enabled' : 'Disabled'}</Text>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    gap: '0px',
                    width: '100%',
                    marginLeft: '10px',
                }}
            >
                <Text>Show warning message for network search action:</Text>
                <div
                    style={{
                        transform: 'scale(0.6)',
                        transformOrigin: 'right',
                    }}
                >
                    <Switch
                        checked={settings?.warningShowForNetworkSearch ? true : false}
                        onChange={onChangeWarningShowForNetworkSearch}
                    />
                </div>
                <Text size={200}>{settings?.warningShowForNetworkSearch ? 'Enabled' : 'Disabled'}</Text>
            </div>


            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    gap: '0px',
                    width: '100%',
                    marginLeft: '10px',
                }}
            >
                <Text>Show warning message for config shortcut action:</Text>
                <div
                    style={{
                        transform: 'scale(0.6)',
                        transformOrigin: 'right',
                    }}
                >
                    <Switch
                        checked={settings?.warningShowForConfigShortcut ? true : false}
                        onChange={onChangeWarningShowForConfigShortcut}
                    />
                </div>
                <Text size={200}>{settings?.warningShowForConfigShortcut ? 'Enabled' : 'Disabled'}</Text>
            </div>

        </div>
    );
};
