import React from 'react';
import ReactDOM from 'react-dom/client';
import { Divider, FluentProvider, webLightTheme } from '@fluentui/react-components'; // Import FluentProvider and theme
import {
    Dialog,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogActions,
    Button,
    Switch,
    Checkbox,
    Text,
} from '@fluentui/react-components';

import { DrinkCoffeeRegular } from '@fluentui/react-icons';

const AlertMessage = {
    'Device Adoption':
        'Before moving forward, please take a moment to ensure that none of the devices you’re about to onboard are already connected to another cloud service. Onboarding a device that’s already linked elsewhere can create a multi-homed setup, which isn’t supported. Verifying this helps ensure a smooth and successful onboarding experience!',
    'Network Search':
        'This operation performs a network search and does not make any changes to device configurations. However, as network searches can sometimes be considered intrusive, we encourage you to seek approval from your security department before proceeding. Taking this step helps ensure compliance with your organization’s security policies.',
};

export const customAlert = (title, onConfirm, theme, onDisable) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    // Initialize the ref with the same value as defaultChecked
    const checkboxRef = { current: false };

    const handleClose = () => {
        root.unmount(); // Unmount the component
        document.body.removeChild(container); // Clean up the DOM
    };

    const handleConfirm = () => {
        if (onConfirm) {
            handleDisable({ currentTarget: { checked: checkboxRef.current } });
            onConfirm();
        }
        handleClose();
    };

    const handleCancel = () => {
        handleDisable({ currentTarget: { checked: false } });
        handleClose();
    };

    const handleDisable = (event) => {
        checkboxRef.current = event.currentTarget.checked; // Update the ref value
        if (onDisable) {
            onDisable(!checkboxRef.current); // Optionally call the onDisable callback
        }
    };

    root.render(
        <FluentProvider theme={theme}>
            <Dialog open>
                <DialogSurface>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'flex-start',
                            width: '100%',
                            height: '100%',
                            gap: '10px',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                                gap: '5px',
                            }}
                        >
                            <DrinkCoffeeRegular style={{ fontSize: '20px' }} />
                            <Text size={300}>Caution: {title}</Text>
                        </div>
                        <Divider />
                        <Text size={200} style={{ paddingTop: '10px' }}>
                            {AlertMessage?.[title] ?? 'Unknown'}
                        </Text>
                    </div>
                    <DialogActions>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',
                                paddingTop: '20px',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    width: '100%',
                                    justifyContent: 'flex-start',
                                    alignItems: 'center',
                                }}
                            >
                                <div
                                    style={{
                                        transform: 'scale(0.8)',
                                        transformOrigin: 'right',
                                    }}
                                >
                                    <Checkbox
                                        onChange={handleDisable}
                                        defaultChecked={checkboxRef.current} // Initialize with ref value
                                    />
                                </div>
                                <Text size={200}>Disable the popup message for {title.toLowerCase()}</Text>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'flex-end',
                                    alignItems: 'center',
                                    width: '100%',
                                    height: '100%',
                                    gap: '10px',
                                }}
                            >
                                <Button appearance='secondary' size='small' shape='circular' onClick={handleCancel}>
                                    Cancel
                                </Button>
                                <Button appearance='primary' size='small' shape='circular' onClick={handleConfirm}>
                                    Confirm
                                </Button>
                            </div>
                        </div>
                    </DialogActions>
                </DialogSurface>
            </Dialog>
        </FluentProvider>
    );
};
