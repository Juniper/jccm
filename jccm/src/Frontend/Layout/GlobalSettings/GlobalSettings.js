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

import validator from 'validator';
import ip from 'ip';
import _ from 'lodash';

import { useNotify } from '../../Common/NotificationContext';
import useStore from '../../Common/StateStore';
import { GeneralCard } from './GeneralCard';
import { BastionHostCard } from './BastionHostCard';

const Dismiss = bundleIcon(DismissFilled, DismissRegular);
const DeleteIcon = bundleIcon(SubtractCircleFilled, SubtractCircleRegular);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const GlobalSettings = ({ title, isOpen, onClose }) => {
    if (!isOpen) return null;
    
    const {getConsoleWindowWidth} = useStore();  
    const [selectedTab, setSelectedTab] = useState('General');

    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const onTabSelect = (event, data) => {
        setSelectedTab(data.value);
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog
            open={isOpen}
            onDismiss={handleClose}
            modalProps={{ isBlocking: true }}
        >
            <DialogSurface
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    minWidth: `${windowSize.width * 0.4}px`,
                    minHeight: `${windowSize.height * 0.3}px`,
                    height: '350px',
                    overflow: 'hidden',
                    border: 0, // Hide border lines
                    background: tokens.colorNeutralBackground1,
                    
                    position: 'fixed',
                    top: '0%',
                    left: `calc(0% - ${getConsoleWindowWidth()}px)`,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: '10px',
                    }}
                >
                    <Text size={200}>{title}</Text>
                    <Button
                        onClick={handleClose}
                        shape='circular'
                        appearance='subtle'
                        icon={<Dismiss />}
                        size='small'
                    />
                </div>

                <div
                    style={{
                        display: 'flex',
                        width: '100%',
                        height: '100%',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        justifyContent: 'flex-start',
                    }}
                >
                    <TabList
                        selectedValue={selectedTab}
                        onTabSelect={onTabSelect}
                        size='small'
                        appearance='transparent'
                    >
                        <Tab
                            value='General'
                        >
                            General
                        </Tab>
                        <Tab
                            value='BastionHost'
                        >
                            Bastion Host
                        </Tab>
                    </TabList>

                    <div
                        style={{
                            display: selectedTab === 'General' ? 'flex' : 'none',
                            width: '100%',
                            height: '100%',
                            marginTop: '20px',
                        }}
                    >
                        <GeneralCard />
                    </div>
                    <div
                        style={{
                            display: selectedTab === 'BastionHost' ? 'flex' : 'none',
                            width: '100%',
                            height: '100%',
                            marginTop: '20px',
                        }}
                    >
                        <BastionHostCard />
                    </div>
                </div>
            </DialogSurface>
        </Dialog>
    );
};
