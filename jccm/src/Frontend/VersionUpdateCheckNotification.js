import React, { useState, useEffect } from 'react';
import { Button, Text, Link, Dialog, DialogSurface } from '@fluentui/react-components';
import useStore from './Common/StateStore';

export const VersionUpdateCheckNotification = ({ isOpen, onClose }) => {
    const aboutWindowWidth = 400;
    const aboutWindowHeight = 100;

    const { checkingForUpdate, setCheckingForUpdate } = useStore();
    const [isNotCheckingAvailable, setIsNotCheckingAvailable] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // New loading state

    useEffect(() => {
        console.log('Checking for new updates - sending check-for-updates to the main process.');

        const checkForUpdates = async () => {
            try {
                const result = await window.electronAPI.checkForUpdates();
                console.log('checkForUpdates result', result);
                const isDownloading = Boolean(result);

                setCheckingForUpdate(isDownloading);
            } catch (error) {
                console.error('checkForUpdates error:', error.message || error);
                setIsNotCheckingAvailable(true);
            } finally {
                setIsLoading(false);
            }
        };

        checkForUpdates();
    }, [setCheckingForUpdate]);

    const handleOnOk = () => {
        onClose();
    };

    const StatusMessage = ({ message, onConfirm }) => (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                paddingTop: '40px',
                paddingBottom: '40px',
                gap: '20px',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Text size={300} weight='regular' align='center'>
                    {message}
                </Text>
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
                <Button appearance='secondary' shape='circular' onClick={onConfirm} size='small'>
                    OK
                </Button>
            </div>
        </div>
    );

    if (isLoading) {
        // Show a loading indicator or spinner while waiting
        return (
            <Dialog open={isOpen} onDismiss={onClose} modalType='modal'>
                <DialogSurface
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: `${aboutWindowWidth}px`,
                        height: `${aboutWindowHeight}px`,
                        overflow: 'hidden',
                    }}
                >
                    <Text size={300} weight='regular' align='center'>
                        Checking for updates...
                    </Text>
                    {/* Hidden focusable link required by react-dialog, as it needs at least one focusable element inside the DialogSurface. */}{' '}
                    <Link />
                </DialogSurface>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onDismiss={onClose} modalType='modal'>
            <DialogSurface
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: `${aboutWindowWidth}px`,
                    height: `${aboutWindowHeight}px`,
                    overflow: 'hidden',
                }}
            >
                {isNotCheckingAvailable ? (
                    <StatusMessage
                        message='Update check is currently unavailable. Please try again later.'
                        onConfirm={handleOnOk}
                    />
                ) : checkingForUpdate ? (
                    <StatusMessage message='A new update is available and being downloaded.' onConfirm={handleOnOk} />
                ) : (
                    <StatusMessage message='No new updates are available at the moment.' onConfirm={handleOnOk} />
                )}
            </DialogSurface>
        </Dialog>
    );
};
