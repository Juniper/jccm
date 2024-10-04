import React, { useState } from 'react';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogSurface,
    DialogBody,
    DialogActions,
    DialogContent,
    Spinner,
    Label,
} from '@fluentui/react-components';
import _ from 'lodash';
const { electronAPI } = window;

import useStore from '../Common/StateStore';
import { useMessageBar } from '../Common/MessageBarContext';

function Logout({ isOpen, onClose }) {
    const [isLoggingOut, setIsLoggingOut] = useState(false); // State to track logout operation
    const { getConsoleWindowWidth, setIsUserLoggedIn, setCloudInventory, setDeviceModels } = useStore(); // Get the login status from your global state
    const { showMessageBar } = useMessageBar();

    const handleLogoutItem = async () => {
        setIsLoggingOut(true); // Start logout operation
        try {
            const data = await electronAPI.saLogoutUser();
            console.log('logout', data);
            if (data.logout) {
                // console.log('logout: ', data);
                setIsUserLoggedIn(false);
                setCloudInventory([]);
                setDeviceModels([]);
                showMessageBar({
                    message: 'Logout successful!',
                    intent: 'success',
                });
                await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate delay for demonstration
                onClose();
            }
        } catch (error) {
            console.error('Logout error:', error);
            showMessageBar({
                message: 'Logout failed. Please try again.',
                intent: 'error',
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogSurface
                style={{
                    position: 'fixed',
                    top: '0%',
                    left: `calc(0% - ${getConsoleWindowWidth()}px)`,
                }}
            >
                <DialogBody>
                    <DialogContent>
                        <DialogTitle>Confirm Logout</DialogTitle>
                        <div
                            style={{ display: 'flex', flexDirection: 'column' }}
                        >
                            <Label>Are you sure you want to logout?</Label>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    height: '30px',
                                }}
                            >
                                {isLoggingOut && (
                                    <Spinner
                                        size='tiny'
                                        label='Logging out...'
                                    />
                                )}{' '}
                                {/* Show spinner when logging out */}
                            </div>
                        </div>
                    </DialogContent>
                    <DialogActions
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                columnGap: '20px',
                            }}
                        >
                            {/* Confirm Button */}
                            <Button
                                onClick={handleLogoutItem}
                                appearance='primary'
                                disabled={isLoggingOut} // Disable button when logging out
                            >
                                Confirm
                            </Button>

                            {/* Cancel Button */}
                            <Button
                                onClick={onClose}
                                appearance='secondary'
                                disabled={isLoggingOut} // Optionally disable cancel button when logging out
                            >
                                Cancel
                            </Button>
                        </div>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}

export default Logout;
