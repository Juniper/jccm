import React, { useState, useEffect } from 'react';
import { Button, Text, Dialog, DialogSurface } from '@fluentui/react-components';

export const ConfirmWindow = ({ isOpen, onClose, message, onConfirm }) => {
    const aboutWindowWidth = 400;
    const aboutWindowHeight = 120;

    // Split the message by newlines
    const messageLines = message.split('\n');

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
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingTop: '50px',
                        paddingBottom: '40px',
                        gap: '20px',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
                        {messageLines.map((line, index) => (
                            <Text key={index} size={200} weight='regular' align='center'>
                                {line}
                            </Text>
                        ))}
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
                        <Button appearance='secondary' shape='circular' onClick={onClose} size='small'>
                            Cancel
                        </Button>
                        <Button
                            appearance='primary'
                            shape='circular'
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            size='small'
                        >
                            OK
                        </Button>
                    </div>
                </div>
            </DialogSurface>
        </Dialog>
    );
};
