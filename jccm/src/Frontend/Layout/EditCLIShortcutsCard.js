import React, { useState, useRef, useEffect } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import _ from 'lodash';

import {
    Dialog,
    DialogSurface,
    Button,
    Label,
    Text,
    Field,
    SpinButton,
    Toast,
    ToastTitle,
    ToastBody,
    Tooltip,
    Divider,
    tokens,
} from '@fluentui/react-components';
import { DismissFilled, DismissRegular, bundleIcon } from '@fluentui/react-icons';

const { electronAPI } = window;

import { useNotify } from '../Common/NotificationContext';
import useStore from '../Common/StateStore';
import { MonacoEditor } from '../Components/Editor/MonacoEditor';

const Dismiss = bundleIcon(DismissFilled, DismissRegular);

const EditCLIShortcutsCard = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const [isSearchRun, setIsSearchRun] = useState(false);

    const Title = () => <Text size={400}>CLI Commands Mapping</Text>;
    const { notify } = useNotify();

    return (
        <Dialog open={isOpen} onDismiss={onClose} modalProps={{ isBlocking: true }}>
            <DialogSurface
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    minWidth: '90%',
                    height: '90%',
                    overflow: 'hidden', // Hide overflowed footer block edges
                    padding: 0,
                    border: 0, // Hide border lines
                    background: tokens.colorNeutralBackground1,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        height: '100%',
                        flex: 1,
                        padding: '15px 15px 5px 15px',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Header - Dismiss */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                        }}
                    >
                        <Title />
                        <Button
                            onClick={onClose}
                            shape='circular'
                            appearance='subtle'
                            icon={<Dismiss />}
                            size='small'
                        />
                    </div>
                    <div style={{width: '100%', height: 'calc(95%)'} }>
                        <MonacoEditor text='Hello World' />
                    </div>
                </div>
            </DialogSurface>
        </Dialog>
    );
};

export default EditCLIShortcutsCard;
