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

const Dismiss = bundleIcon(DismissFilled, DismissRegular);
const DeleteIcon = bundleIcon(SubtractCircleFilled, SubtractCircleRegular);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const GeneralCard = () => {
    const { settings, setSettings, importSettings, exportSettings } = useStore();
    const [jsiTerm, setJsiTerm] = useState(false);

    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        const fetchData = async () => {
            importSettings();
            await delay(300);
            setJsiTerm(settings?.jsiTerm ? true : false);
        };
        fetchData();
    }, []);

    const saveJsiTerm = (newJsiTerm) => {
        const saveFunction = async () => {
            const newSettings = { ...settings, jsiTerm: newJsiTerm };
            setSettings(newSettings);
            exportSettings(newSettings);
        };
        saveFunction();
    };

    const handleActive = async (event) => {
        const checked = event.currentTarget.checked;
        setJsiTerm(checked);

        saveJsiTerm(checked);
    };

    return (
        <div>
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
                <Text>JSI-Term Adoption Menu: </Text>
                <div
                    style={{
                        transform: 'scale(0.6)',
                        transformOrigin: 'right',
                    }}
                >
                    <Switch
                        checked={jsiTerm}
                        onChange={handleActive}
                    />
                </div>
                <Text>{jsiTerm ? 'Enabled' : 'Disabled'}</Text>
            </div>
        </div>
    );
};
