import React, { useState, useRef, useEffect } from 'react';
import { Button, Field, Input, SpinButton, Divider, Tooltip, Text } from '@fluentui/react-components';
import { EyeRegular, EyeOffRegular, bundleIcon, AddCircleFilled, AddCircleRegular } from '@fluentui/react-icons';
import validator from 'validator';
import ip from 'ip';
import { Vault } from '../Vault';

const AdditionIcon = bundleIcon(AddCircleFilled, AddCircleRegular);

export const SubnetInputForm = ({ onAddSubnet, disabled }) => {
    const [isFormValid, setIsFormValid] = useState(false);

    const [subnet, setSubnet] = useState('');
    const [subnetMessage, setSubnetMessage] = useState('');
    const [subnetValidationState, setSubnetValidationState] = useState('none');

    const [port, setPort] = useState('22');

    const [username, setUsername] = useState('');
    const [usernameMessage, setUsernameMessage] = useState('');
    const [usernameValidationState, setUsernameValidationState] = useState('none');

    const [password, setPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [passwordValidationState, setPasswordValidationState] = useState('none');
    const passwordInputRef = useRef(null);

    useEffect(() => {
        const valid =
            subnetValidationState === 'success' &&
            usernameValidationState === 'success' &&
            passwordValidationState === 'success';

        setIsFormValid(valid);
    }, [subnetValidationState, usernameValidationState, passwordValidationState]);

    const onKeyDownForSubnetAdd = (e) => {
        if (e.key === 'Enter' && isFormValid) {
            onAddSubnet({ subnet, port, username, password });
        }
    };

    const validateSubnet = (currentSubnet) => {
        // Check if the subnet is empty
        if (validator.isEmpty(currentSubnet)) {
            return { validationState: 'error', message: 'Subnet is required.' };
        }

        // Split the subnet into IP and prefix length
        const [ipAddress, prefix] = currentSubnet.split('/');
        const prefixLength = parseInt(prefix, 10);

        // Validate the subnet using the ip package
        if (!(ip.isV4Format(ipAddress) && prefixLength > 0 && prefixLength <= 32)) {
            return { validationState: 'error', message: 'Invalid Subnet' };
        }

        // Limit the subnet length
        if (prefixLength < 16) {
            return { validationState: 'error', message: 'Subnet is too large (valid range: 16-32)' };
        }

        try {
            const subnet = ip.cidrSubnet(currentSubnet);
            return { validationState: 'success', message: '' };
        } catch (error) {
            return { validationState: 'error', message: 'Invalid subnet.' };
        }
    };

    const validateUsername = (currentUsername) => {
        if (validator.isEmpty(currentUsername)) {
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
        if (validator.isEmpty(password)) {
            return { validationState: 'error', message: 'Password is required.' };
        }

        return { validationState: 'success', message: '' };
    };

    const handlePortSpinButtonChange = (event, { value, displayValue }) => {
        if (value !== undefined) {
            setPort(value);
            console.log('port: ' + value);
        } else if (displayValue !== undefined) {
            const newValue = parseInt(displayValue);
            if (!Number.isNaN(newValue)) {
                setPort(newValue);
                console.log('port: ' + newValue);
            } else {
                console.error(`Cannot parse "${displayValue}" as a number.`);
            }
        }
    };

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%', flexDirection: 'column', overflow: 'hidden' }}>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '10px',
                    alignItems: 'center',
                    alignContent: 'center',
                    justifyContent: 'flex-start',
                }}
            >
                <Tooltip content='Add Subnet' positioning='above'>
                    <Button
                        appearance='subtle'
                        shape='circular'
                        size='small'
                        icon={<AdditionIcon />}
                        disabled={!isFormValid || disabled}
                        onClick={() => {
                            onAddSubnet({ subnet, port, username, password });
                        }}
                    >
                        Add
                    </Button>
                </Tooltip>
            </div>
            <div style={{ marginTop: '5px', marginBottom: '10px' }}>
                <Divider appearance='strong'>Subnet Input</Divider>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'flex-start' }}>
                    <Field
                        label='Subnet'
                        required
                        validationMessage={subnetMessage}
                        validationState={subnetValidationState}
                        size='small'
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '50%',
                            height: '65px',
                        }}
                    >
                        <Input
                            disabled={disabled}
                            placeholder='192.168.1.0/24'
                            appearance='filled-darker'
                            style={{ width: '100%' }}
                            onChange={(e) => {
                                const currentSubnet = e.target.value;
                                setSubnet(currentSubnet);
                                const validation = validateSubnet(currentSubnet);
                                setSubnetMessage(validation.message);
                                setSubnetValidationState(validation.validationState);
                            }}
                            size='small'
                            onKeyDown={onKeyDownForSubnetAdd}
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
                            disabled={disabled}
                            appearance='filled-darker'
                            defaultValue={22}
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
                            disabled={disabled}
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
                            onKeyDown={onKeyDownForSubnetAdd}
                        />
                    </Field>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '5px',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            width: '50%',
                            height: '65px',
                        }}
                    >
                        <div
                            style={{
                                transform: 'scale(0.8)',
                                transformOrigin: 'left',
                                marginRight: '-5px',
                                padding: '0px',
                                overflow: 'hidden',
                            }}
                        >
                            <Vault
                                onClick={(passwordTag) => {
                                    console.log('Password Tag input: ' + passwordTag);
                                    setPassword(passwordTag);
                                    const validation = validatePassword(passwordTag);
                                    setPasswordMessage(validation.message);
                                    setPasswordValidationState(validation.validationState);
                                }}
                            />
                        </div>

                        <Field
                            label='Password'
                            required
                            validationMessage={passwordMessage}
                            validationState={passwordValidationState}
                            size='small'
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                width: '100%',
                                height: '65px',
                            }}
                        >
                            <Input
                                disabled={disabled}
                                appearance='filled-darker'
                                placeholder='Input password'
                                type={passwordVisible ? 'text' : 'password'}
                                ref={passwordInputRef}
                                value={password} // Reflect the updated password state
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
                                onKeyDown={onKeyDownForSubnetAdd}
                            />
                        </Field>
                    </div>
                </div>
            </div>
        </div>
    );
};
