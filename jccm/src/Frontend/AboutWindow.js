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
    DialogTrigger,
    DialogBody,
    DialogActions,
    DialogContent,
    DialogTitle,
    DialogFooter,
    Toast,
    ToastTitle,
    ToastBody,
    Switch,
    TabList,
    Tab,
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

const { electronAPI } = window;

export const AboutWindow = ({ isOpen, onClose }) => {
    const aboutWindowWidth = 300;
    const aboutWindowHeight = 300;

    const [appInfo, setAppInfo] = useState({});

    useEffect(() => {
        electronAPI.getAppInfo().then((info) => {
            console.log('App Info: ', info);
            setAppInfo(info);
        });
    }, []);

    const handleOnOkay = () => {
        onClose();
    };

    const handleOnCopy = async () => {
        const appInfoText = JSON.stringify(appInfo, null, 4);
        await navigator.clipboard.writeText(appInfoText);
        onClose();
    };

    return (
        <Dialog
            open={isOpen}
            onDismiss={onClose}
            modalProps={{ isBlocking: true }}
        >
            <DialogSurface
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-evenly',
                    alignItems: 'center',
                    width: `${aboutWindowWidth}px`,
                    height: `${aboutWindowHeight}px`,
                    overflow: 'hidden',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Text size={300} weight='semibold'>
                        {appInfo.name}
                    </Text>
                </div>

                <div>
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                        {Object.entries(appInfo)
                            .filter(
                                ([key]) =>
                                    !['name', 'electronBuildId'].includes(key)
                            )
                            .map(([key, value]) => (
                                <li key={key}>
                                    <Text
                                        style={{ fontSize: '12px' }}
                                    >{`${key}: ${value} `}</Text>
                                </li>
                            ))}
                    </ul>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '20px',
                    }}
                >
                    <Button
                        appearance='secondary'
                        onClick={handleOnOkay}
                        size='small'
                    >
                        OK
                    </Button>
                    <Button
                        appearance='primary'
                        onClick={handleOnCopy}
                        size='small'
                    >
                        Copy
                    </Button>
                </div>
            </DialogSurface>
        </Dialog>
    );
};
