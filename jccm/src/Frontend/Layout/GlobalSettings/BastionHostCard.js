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
    div,
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

export const BastionHostCard = () => {
    const { settings, setSettings, importSettings, exportSettings } = useStore();
    const [bastionHost, setBastionHost] = useState({});

    const [isFormValid, setIsFormValid] = useState(false);
    const [active, setActive] = useState(false);

    const [host, setHost] = useState('');
    const [hostMessage, setHostMessage] = useState('');
    const [hostValidationState, setHostValidationState] = useState('none');

    const [port, setPort] = useState('22');

    const [username, setUsername] = useState('');
    const [usernameMessage, setUsernameMessage] = useState('');
    const [usernameValidationState, setUsernameValidationState] = useState('none');

    const [password, setPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [passwordValidationState, setPasswordValidationState] = useState('none');
    const passwordInputRef = useRef(null);

    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const { notify } = useNotify();

    useEffect(() => {
        const fetchData = async () => {
            importSettings();
            await delay(300);
            setBastionHost(settings?.bastionHost);
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (bastionHost && Object.keys(bastionHost).length !== 0) {
            {
                const currentHost = bastionHost?.host;
                const validation = validateHost(currentHost);
                setHostMessage(validation.message);
                setHostValidationState(validation.validationState);
                if (validation.validationState) {
                    setHost(currentHost);
                }
            }

            setPort(bastionHost?.port);

            {
                const currentUsername = bastionHost?.username;
                const validation = validateUsername(currentUsername);
                setUsernameMessage(validation.message);
                setUsernameValidationState(validation.validationState);
                if (validation.validationState) {
                    setUsername(currentUsername);
                }
            }

            {
                const currentPassword = bastionHost?.password;
                const validation = validateUsername(currentPassword);
                setPasswordMessage(validation.message);
                setPasswordValidationState(validation.validationState);
                if (validation.validationState) {
                    setPassword(currentPassword);
                }
            }

            setActive(bastionHost?.active);
        }
    }, [bastionHost]);

    useEffect(() => {
        const valid =
            hostValidationState === 'success' &&
            usernameValidationState === 'success' &&
            passwordValidationState === 'success';

        setIsFormValid(valid);
    }, [hostValidationState, usernameValidationState, passwordValidationState]);

    const validateHost = (currentHost) => {
        // Check if the host is empty
        if (!currentHost || validator.isEmpty(currentHost)) {
            return { validationState: 'error', message: 'Host is required.' };
        }

        // Validate the host using the ip package
        if (!ip.isV4Format(currentHost)) {
            return { validationState: 'error', message: 'Invalid Host' };
        }

        return { validationState: 'success', message: '' };
    };

    const validateUsername = (currentUsername) => {
        if (!currentUsername || validator.isEmpty(currentUsername)) {
            return { validationState: 'error', message: 'Username is required.' };
        }

        return { validationState: 'success', message: '' };
    };

    const togglePasswordVisibility = () => {
        setPasswordVisible(!passwordVisible);

        const input = passwordInputRef.current;
        if (input) {
            input.focus();
            setTimeout(() => {
                // Due to the input not being fully focused at the moment the method is called
                const valLength = input.value.length;
                input.setSelectionRange(valLength, valLength);
            }, 0);
        }
    };

    const validatePassword = (password) => {
        if (!password || validator.isEmpty(password)) {
            return { validationState: 'error', message: 'Password is required.' };
        }

        return { validationState: 'success', message: '' };
    };

    const handlePortSpinButtonChange = (event, { value, displayValue }) => {
        if (value !== undefined) {
            setPort(value);
        } else if (displayValue !== undefined) {
            const newValue = parseInt(displayValue);
            if (!Number.isNaN(newValue)) {
                setPort(newValue);
            } else {
                console.error(`Cannot parse "${displayValue}" as a number.`);
            }
        }
    };

    const saveBastionHost = (newBastionHost) => {
        const saveFunction = async () => {
            if (isFormValid) {
                const newSettings = { ...settings, bastionHost: newBastionHost };
                setSettings(newSettings);
                exportSettings(newSettings);
            }
        };
        saveFunction();
    };

    const handleClose = () => {
        saveBastionHost({ host, port, username, password, active });
    };

    const handleActive = async (event) => {
        const checked = event.currentTarget.checked;

        saveBastionHost({ host, port, username, password, active: checked });
        setActive(checked);

        const status = checked ? 'active' : 'inactive';

        notify(
            <Toast>
                <ToastTitle>Bastion Host</ToastTitle>
                <ToastBody subtitle={`Bastion Host is ${status}.`}>
                    <Text size={100}>The Bastion Host operation status has been updated successfully.</Text>
                </ToastBody>
            </Toast>,
            { intent: 'success' }
        );
    };

    const handleReset = async () => {
        setHost('');
        setHostMessage('');
        setHostValidationState('none');

        setPort(22);

        setUsername('');
        setUsernameMessage('');
        setUsernameValidationState('none');

        setPassword('');
        setPasswordMessage('');
        setPasswordValidationState('none');

        setActive(false);
        saveBastionHost({});
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-evenly',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                border: 0, // Hide border lines
                background: tokens.colorNeutralBackground1,
            }}
        >
            <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                <Divider
                    alignContent='end'
                    appearance='strong'
                ></Divider>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'flex-start' }}>
                    <Field
                        label='Host'
                        required
                        validationMessage={hostMessage}
                        validationState={hostValidationState}
                        size='small'
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '50%',
                            height: '65px',
                        }}
                    >
                        <Input
                            placeholder='192.168.1.1'
                            value={host}
                            appearance='filled-darker'
                            style={{ width: '100%' }}
                            onChange={(e) => {
                                const currentHost = e.target.value;
                                setHost(currentHost);
                                const validation = validateHost(currentHost);
                                setHostMessage(validation.message);
                                setHostValidationState(validation.validationState);
                            }}
                            size='small'
                        />
                    </Field>
                    <Field
                        label='Port'
                        validationMessage=''
                        validationState='none'
                        size='small'
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '50%',
                            height: '65px',
                        }}
                    >
                        <SpinButton
                            appearance='filled-darker'
                            defaultValue={22}
                            value={port}
                            min={22}
                            max={65535}
                            onChange={handlePortSpinButtonChange}
                            size='small'
                            style={{ width: 'calc(100% - 10px)' }}
                        />
                    </Field>
                </div>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '20px',
                        alignItems: 'flex-start',
                        marginTop: '5px',
                    }}
                >
                    <Field
                        label='Username'
                        required
                        validationMessage={usernameMessage}
                        validationState={usernameValidationState}
                        size='small'
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '50%',
                            height: '65px',
                        }}
                    >
                        <Input
                            required
                            placeholder='Input username'
                            appearance='filled-darker'
                            type='username'
                            value={username}
                            onChange={(e) => {
                                const currentUsername = e.target.value;
                                setUsername(currentUsername);
                                const validation = validateUsername(currentUsername);
                                setUsernameMessage(validation.message);
                                setUsernameValidationState(validation.validationState);
                            }}
                            style={{ width: '100%' }}
                            size='small'
                        />
                    </Field>

                    <Field
                        label='Password'
                        required
                        validationMessage={passwordMessage}
                        validationState={passwordValidationState}
                        size='small'
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '50%',
                            height: '65px',
                        }}
                    >
                        <Input
                            appearance='filled-darker'
                            placeholder='Input password'
                            value={password}
                            type={passwordVisible ? 'text' : 'password'}
                            ref={passwordInputRef}
                            onChange={(e) => {
                                const currPass = e.target.value;
                                setPassword(currPass);
                                const validation = validatePassword(currPass);
                                setPasswordMessage(validation.message);
                                setPasswordValidationState(validation.validationState);
                            }}
                            contentAfter={
                                <Button
                                    shape='circular'
                                    size='small'
                                    appearance='transparent'
                                    icon={
                                        passwordVisible ? (
                                            <EyeRegular style={{ fontSize: '15px' }} />
                                        ) : (
                                            <EyeOffRegular style={{ fontSize: '15px' }} />
                                        )
                                    }
                                    onClick={togglePasswordVisibility}
                                    tabIndex={-1}
                                />
                            }
                            style={{ width: '100%' }}
                            size='small'
                        />
                    </Field>
                </div>
            </div>
            <div
                style={{
                    display: 'flex',
                    width: '100%',
                    height: '100%',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    overflow: 'hidden',
                }}
            >
                <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                    <Divider appearance='strong' />
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '5px',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        height: '25px',
                    }}
                >
                    <Button
                        disabled={!isFormValid}
                        appearance='subtle'
                        shape='circular'
                        size='small'
                        icon={<DeleteIcon fontSize={15} />}
                        onClick={async () => {
                            await handleReset();
                        }}
                    >
                        Reset
                    </Button>
                    {isFormValid && (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                                gap: '5px',
                                width: '120px',
                            }}
                        >
                            <div
                                style={{
                                    transform: 'scale(0.6)',
                                    transformOrigin: 'right',
                                }}
                            >
                                <Switch
                                    checked={active}
                                    disabled={!isFormValid}
                                    onChange={handleActive}
                                />
                            </div>

                            <Text size={200}>{active ? 'Active' : 'Inactive'}</Text>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
