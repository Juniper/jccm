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

export const GeneralCard = () => {
    const { settings, setSettings, setConsoleWindowOpen, exportSettings } =
        useStore();

    const saveConsoleWindowButtonShow = (newShowConsoleWindow) => {
        const saveFunction = async () => {
            const newSettings = {
                ...settings,
                consoleWindowButtonShow: newShowConsoleWindow,
            };
            setSettings(newSettings);
            exportSettings(newSettings);
        };
        saveFunction();
    };

    const saveJsiTerm = (newJsiTerm) => {
        const saveFunction = async () => {
            const newSettings = { ...settings, jsiTerm: newJsiTerm };
            setSettings(newSettings);
            exportSettings(newSettings);
        };
        saveFunction();
    };

    const saveIgnoreCase = (newIgnoreCase) => {
        const saveFunction = async () => {
            const newSettings = { ...settings, ignoreCase: newIgnoreCase };
            setSettings(newSettings);
            exportSettings(newSettings);
        };
        saveFunction();
    };

    const saveDeleteOutboundSSHTerm = (newDeleteOutboundSSHTerm) => {
        const saveFunction = async () => {
            const newSettings = {
                ...settings,
                deleteOutboundSSHTerm: newDeleteOutboundSSHTerm,
            };
            setSettings(newSettings);
            exportSettings(newSettings);
        };
        saveFunction();
    };

    const onChangConsoleWindowButtonShow = async (event) => {
        const checked = event.currentTarget.checked;
        if (!checked) {
            setConsoleWindowOpen(false);
            await eventBus.emit('console-window-reset');
        }
        saveConsoleWindowButtonShow(checked);
    };

    const onChangeJsiTerm = async (event) => {
        const checked = event.currentTarget.checked;
        saveJsiTerm(checked);
    };

    const onChangeDeleteOutboundSSHTerm = async (event) => {
        const checked = event.currentTarget.checked;
        saveDeleteOutboundSSHTerm(checked);
    };

    const onChangeIgnoreCase = async (event) => {
        const checked = event.currentTarget.checked;
        saveIgnoreCase(checked);
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
                <Text>Show Debug Console Window:</Text>

                <div
                    style={{
                        transform: 'scale(0.6)',
                        transformOrigin: 'right',
                    }}
                >
                    <Switch
                        checked={
                            settings?.consoleWindowButtonShow ? true : false
                        }
                        onChange={onChangConsoleWindowButtonShow}
                    />
                </div>
                <Text>
                    {settings?.consoleWindowButtonShow ? 'Enabled' : 'Disabled'}
                </Text>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    gap: '5px',
                    width: '100%',
                    marginLeft: '10px',
                }}
            >
                <Text>Show JSI-Term Adoption Menu: </Text>
                <div
                    style={{
                        transform: 'scale(0.6)',
                        transformOrigin: 'right',
                    }}
                >
                    <Switch
                        checked={settings.jsiTerm ? true : false}
                        onChange={onChangeJsiTerm}
                    />
                </div>
                <Text>{settings.jsiTerm ? 'Enabled' : 'Disabled'}</Text>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    gap: '5px',
                    width: '100%',
                    marginLeft: '10px',
                }}
            >
                <Text>Ignore case of org name and site name: </Text>
                <div
                    style={{
                        transform: 'scale(0.6)',
                        transformOrigin: 'right',
                    }}
                >
                    <Switch
                        checked={settings.ignoreCase ? true : false}
                        onChange={onChangeIgnoreCase}
                    />
                </div>
                <Text>{settings.ignoreCase ? 'Enabled' : 'Disabled'}</Text>
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
                <Text>Override outbound SSH config during adoption:</Text>

                <div
                    style={{
                        transform: 'scale(0.6)',
                        transformOrigin: 'right',
                    }}
                >
                    <Switch
                        checked={settings.deleteOutboundSSHTerm ? true : false}
                        onChange={onChangeDeleteOutboundSSHTerm}
                    />
                </div>
                <Text>
                    {settings.deleteOutboundSSHTerm ? 'Enabled' : 'Disabled'}
                </Text>
            </div>
        </div>
    );
};
