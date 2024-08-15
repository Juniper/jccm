import React, { useState, useRef, useEffect } from 'react';
import {
    Button,
    Input,
    Label,
    Spinner,
    Field,
    Popover,
    PopoverSurface,
    Select,
    Text,
    Toast,
    ToastBody,
    ToastTitle,
    ToastTrigger,
    Link,
    Dialog,
    DialogSurface,
    tokens,
} from '@fluentui/react-components';

import {
    EyeRegular,
    EyeOffRegular,
    CheckmarkFilled,
    ArrowEnterRegular,
    DismissRegular,
    DismissFilled,
    PersonAvailableFilled,
    PersonAvailableRegular,
    bundleIcon,
} from '@fluentui/react-icons';
const { electronAPI } = window;

import validator from 'validator';
import _ from 'lodash';

import { useMessageBar } from '../Common/MessageBarContext';
import useStore from '../Common/StateStore';
import * as Constants from '../Common/CommonVariables';
import GoogleIcon from './GoogleIcon';
import eventBus from '../Common/eventBus';

const Eye = bundleIcon(EyeRegular, EyeRegular);
const EyeOff = bundleIcon(EyeOffRegular, EyeOffRegular);
const Dismiss = bundleIcon(DismissFilled, DismissRegular);

export const Login = ({ isOpen, onClose }) => {
    const {
        setUser,
        setCloudDescription,
        setCloudRegionName,
        setIsUserLoggedIn,
        setCurrentActiveThemeName,
        setCloudInventory,
        setCloudInventoryFilterApplied,
    } = useStore();
    const { showMessageBar } = useMessageBar();
    const [cloudList, setCloudList] = useState([]);

    const [cloud, setCloud] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [emailMessage, setEmailMessage] = useState('Please enter your email address.');
    const [passwordMessage, setPasswordMessage] = useState('Please enter your password.');

    const [emailValidationState, setEmailValidationState] = useState('none');
    const [passwordValidationState, setPasswordValidationState] = useState('none');
    const [loginButtonStatus, setLoginButtonStatus] = useState('Login');

    const [passwordVisible, setPasswordVisible] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);

    const [region, setRegion] = useState(null);
    const [regions, setRegions] = useState([]);
    const [openRegionSelect, setOpenRegionSelect] = useState(false);
    const regionSelectPositioningRef = useRef(null);

    const [passcode, setPasscode] = useState('');
    const [openPasscodeInput, setOpenPasscodeInput] = useState(false);
    const passcodeInputPositioningRef = useRef(null);

    const emailInputRef = useRef(null);
    const passwordInputRef = useRef(null);
    const loginButtonRef = useRef(null);
    const passcodeInputRef = useRef(null);

    const [isGoogleSSOLogin, setIsGoogleSSOLogin] = useState(false);

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

    const validateEmail = (currentEmail) => {
        if (validator.isEmpty(currentEmail)) {
            return { validationState: 'error', message: 'Email is required.' };
        }

        if (!validator.isEmail(currentEmail)) {
            return { validationState: 'error', message: 'Please enter a valid email address.' };
        }

        return { validationState: 'success', message: '' };
    };

    const resetAll = () => {
        setEmail('');
        setPassword('');
        setEmailValidationState('none');
        setPasswordValidationState('none');
        setPasswordVisible(false);
        setRegion(null);
        setPasscode('');
        setRegions([]);
        setOpenRegionSelect(false);
        setOpenPasscodeInput(false);
        setIsGoogleSSOLogin(false);
    };

    const onKeyDownForLogin = (e) => {
        if (e.key === 'Enter' && isFormValid) {
            onLoginButton(cloud, email, password);
        }
    };

    const onKeyDownForPasscode = (e) => {
        if (e.key === 'Enter') {
            onPasscodeInput();
        }
    };

    const onChangeCloudSelection = (id) => {
        setCloud(id);
    };

    const onRegionInput = async (region) => {
        setOpenRegionSelect(false);
        setRegion(region);

        if (!isGoogleSSOLogin) {
            setLoginButtonStatus('Login...');
            const response = await requestUserLogin(cloud, region, email, password);
            await processLoginResponse(response);
        } else {
            await startGoogleSSOAuth(cloud, region);
            await electronAPI.saGoogleSSOAuthCodeReceived(async (authCode) => {
                const response = await requestGoogleSSOUserLogin(authCode);
                await processGoogleSSOLoginResponse(response);
            });
        }
    };

    const onPasscodeInput = async () => {
        if (passcode.length === 0) return;
        setOpenPasscodeInput(false);
        setPasswordVisible(false);

        setLoginButtonStatus('Login...');
        const response = await requestUserLogin(cloud, region, email, null, passcode);
        await processLoginResponse(response);
    };

    const requestUserLookup = async (cloud, email) => {
        try {
            const data = await electronAPI.saLookupApiEndpoint({ cloud, email });
            return data; // Ensure data is returned here
        } catch (err) {
            console.error('Error lookup the cloud api server endpoint:', err);
            showMessageBar({ message: `Error lookup the cloud api server endpoint - ${err}`, intent: 'error' });
            return null; // Return null or appropriate error handling object
        }
    };

    const requestUserLogin = async (cloud, region, email, password, passcode = null) => {
        cloudList.forEach((item) => {
            if (item.id === cloud) setCloudDescription(item.description);
        });
        setCloudRegionName(region);

        try {
            const data = await electronAPI.saLoginUser({ cloud, region, email, password, passcode });

            if (data.login) {
                if (data.two_factor) {
                    console.log('Two Factor Auth required!');
                    return { status: 'two_factor' };
                } else {
                    console.log('Login successful!');
                    await eventBus.emit('cloud-inventory-refresh');

                    return { status: 'success', message: 'Login successful!', data: data };
                }
            } else {
                console.log('Login failed!');
                await eventBus.emit('cloud-inventory-refresh');

                return { status: 'error', message: 'Login failed!' };
            }
        } catch (error) {
            console.error('Login failed!', error);
            return { status: 'error', message: 'Login failed!', error: error };
        }
    };

    const processLoginResponse = async (response) => {
        if (response.status === 'success') {
            const data = response.data;

            setUser(data.user);

            await new Promise((resolve) => setTimeout(resolve, 1500));
            setLoginButtonStatus('Logged in');
            console.log('User logged in');
            showMessageBar({ message: 'Login successful!', intent: 'success' });

            await new Promise((resolve) => setTimeout(resolve, 1000));

            resetAll();

            setIsUserLoggedIn(true);
            setCurrentActiveThemeName(Constants.getActiveThemeName(data?.user?.theme));

            onClose();
        } else if (response.status === 'two_factor') {
            setPasscode('');
            setOpenPasscodeInput(true);
        } else {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setLoginButtonStatus('Login');
            showMessageBar({ message: 'Login failed!', intent: 'error' });
        }
    };

    const onLoginButton = async (cloud, email, password) => {
        if (!cloud || !email || !password) {
            console.log('Login Button Clicked! - But missing inputs');
            return;
        }

        setPasswordVisible(false);

        setLoginButtonStatus('Login...');

        const lookupResult = await requestUserLookup(cloud, email);

        if (lookupResult?.status === 'success') {
            if (lookupResult.regions.length === 1) {
                const region = lookupResult.regions[0];
                setRegion(region);
                const response = await requestUserLogin(cloud, region, email, password);
                await processLoginResponse(response);
            } else {
                setRegions(lookupResult.regions); // Assume regions are returned in the lookup result
                setOpenRegionSelect(true);
            }
        } else if (lookupResult?.status === 'notfound') {
            console.log('User not found');
            showMessageBar({ message: 'User not found or error occurred.', intent: 'error' });
            setLoginButtonStatus('Login');
        } else if (lookupResult?.status === 'error') {
            console.error('Error during lookup:', lookupResult.error);
            showMessageBar({ message: 'User not found or error occurred.', intent: 'error' });
            setLoginButtonStatus('Login');
        }
    };

    const requestGoogleSSOUserLogin = async (authCode) => {
        try {
            const data = await electronAPI.saLoginUserGoogleSSO({ authCode });

            if (data.login) {
                console.log('Google SSO Login successful!');
                return { status: 'success', message: 'Google SSO Login successful!', data: data };
            } else {
                console.log('Google SSO Login failed!');
                return { status: 'error', message: 'Google SSO Login failed!' };
            }
        } catch (error) {
            console.error('Google SSO Login failed!', error);
            return { status: 'error', message: 'Google SSO Login failed!', error: error };
        }
    };

    const processGoogleSSOLoginResponse = async (response) => {
        if (response.status === 'success') {
            const data = response.data;

            setUser(data.user);

            await new Promise((resolve) => setTimeout(resolve, 1500));
            setLoginButtonStatus('Logged in');
            console.log('User logged in');
            showMessageBar({ message: 'Login successful!', intent: 'success' });

            await new Promise((resolve) => setTimeout(resolve, 1000));

            resetAll();

            setIsUserLoggedIn(true);
            setCurrentActiveThemeName(Constants.getActiveThemeName(data?.user?.theme));

            onClose();
        } else {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setLoginButtonStatus('Login');
            showMessageBar({ message: 'Login failed!', intent: 'error' });
        }
    };

    const onGoogleSSOLoginButton = async (cloud, email) => {
        if (!cloud || !email) {
            console.error('Google SSO Login missing inputs');
            return;
        }

        setPasswordVisible(false);

        setLoginButtonStatus('Login...');

        const lookupResult = await requestUserLookup(cloud, email);

        if (lookupResult?.status === 'success') {
            if (lookupResult.regions.length === 1) {
                const region = lookupResult.regions[0];
                setRegion(region);

                await startGoogleSSOAuth(cloud, region);
                await electronAPI.saGoogleSSOAuthCodeReceived(async (authCode) => {

                    const response = await requestGoogleSSOUserLogin(authCode);
                    await processGoogleSSOLoginResponse(response);
                });

            } else {
                setRegions(lookupResult.regions); // Assume regions are returned in the lookup result
                setOpenRegionSelect(true);
            }
        } else if (lookupResult?.status === 'notfound') {
            console.log('User not found');
            showMessageBar({ message: 'User not found or error occurred.', intent: 'error' });
            setLoginButtonStatus('Login');
        } else if (lookupResult?.status === 'error') {
            console.error('Error during lookup:', lookupResult.error);
            showMessageBar({ message: 'User not found or error occurred.', intent: 'error' });
            setLoginButtonStatus('Login');
        }
    };

    const startGoogleSSOAuth = async (cloud, region) => {
        cloudList.forEach((item) => {
            if (item.id === cloud) setCloudDescription(item.description);
        });
        setCloudRegionName(region);

        try {
            const data = await electronAPI.saGetGoogleSSOAuthCode({ cloud, region });

            if (data.login) {
                console.log('SSO Login asked successful!');
                return { status: 'success', message: 'SSO Login ask successful!' };
            } else {
                console.log('SSO Login ask failed!');
                return { status: 'error', message: 'SSO Login ask failed!', error: data.error };
            }
        } catch (error) {
            console.error('SSO Login ask failed!', error);
            return { status: 'error', message: 'SSO Login ask failed!', error };
        }
    };

    const onSignInGoogle = async () => {
        setIsGoogleSSOLogin(true);
        await onGoogleSSOLoginButton(cloud, email);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await electronAPI.saFetchAvailableClouds();
                if (data?.clouds) {
                    setCloudList(data.clouds);
                    if (data.clouds.length > 0) {
                        if (cloud.length === 0) setCloud(data.clouds[0].id);
                    }
                } else {
                    console.error('Failed to fetch cloud data: cloud list is missing');
                    showMessageBar({
                        message: 'An error occurred while fetching cloud data. Please try again later.',
                        intent: 'error',
                    });
                }
            } catch (error) {
                console.error('Failed to fetch cloud data:', error);
                showMessageBar({
                    message: `An error occurred while fetching cloud data: ${error.message}`,
                    intent: 'error',
                });
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (email) {
            const validation = validateEmail(email);
            setEmailValidationState(validation.validationState);
            setEmailMessage(validation.message);
        }
        if (password) {
            const validation = validatePassword(password);
            setPasswordValidationState(validation.validationState);
            setPasswordMessage(validation.message);
        }

        const valid = emailValidationState === 'success' && passwordValidationState === 'success';

        setIsFormValid(valid);
    }, [password, email, emailValidationState, passwordValidationState]);

    useEffect(() => {
        if (loginButtonRef.current && openRegionSelect) {
            regionSelectPositioningRef.current?.setTarget(loginButtonRef.current);
        } else if (loginButtonRef.current && openPasscodeInput) {
            passcodeInputPositioningRef.current?.setTarget(loginButtonRef.current);
        }
    }, [loginButtonRef, openRegionSelect, openPasscodeInput]);

    useEffect(() => {
        if (openPasscodeInput && passcodeInputRef.current) {
            passcodeInputRef.current.focus();
        }
    }, [openPasscodeInput]);

    return (
        <Dialog
            modalType='modal'
            open={isOpen}
            modalProps={{
                isBlocking: true,
            }}
            style={{
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <DialogSurface
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    width: `${Constants.LoginCardWidth - 100}px`,
                    height: `${Constants.LoginCardHeight - 80}px`,
                    border: `1px solid ${tokens.colorPaletteBlueBorderActive}`,
                    padding: '40px',
                    backgroundColor: tokens.colorNeutralBackground1,
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <PersonAvailableRegular style={{ fontSize: '28px' }} />
                        <Label
                            style={{
                                marginLeft: '8px',
                                fontSize: '20px',
                            }}
                        >
                            User Login
                        </Label>
                    </div>

                    <Button
                        appearance='subtle'
                        shape='circular'
                        onClick={() => setTimeout(onClose, 0)}
                        icon={<Dismiss />}
                    ></Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', marginTop: '40px', rowGap: '20px' }}>
                    <Field
                        label='Target Service'
                        required
                    >
                        <Select
                            appearance='filled-darker'
                            onChange={(event) => onChangeCloudSelection(event.target.value)}
                            value={cloud}
                        >
                            {cloudList.map((item) => (
                                <option
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.description}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field
                        label='Email'
                        required
                        validationMessage={emailMessage}
                        validationState={emailValidationState}
                    >
                        <Input
                            required
                            type='email'
                            value={email}
                            onChange={(e) => {
                                const currentEmail = e.target.value;
                                setEmail(currentEmail);
                                const validation = validateEmail(currentEmail);
                                setEmailMessage(validation.message);
                                setEmailValidationState(validation.validationState);
                            }}
                            ref={emailInputRef}
                            onKeyDown={onKeyDownForLogin} // Listen for key down events on the email input
                        />
                    </Field>

                    <Field
                        label='Password'
                        required
                        validationMessage={passwordMessage}
                        validationState={passwordValidationState}
                    >
                        <Input
                            required
                            type={passwordVisible ? 'text' : 'password'}
                            value={password} // Bind input value to state
                            onChange={(e) => {
                                const currPass = e.target.value;
                                setPassword(currPass);
                                const validation = validatePassword(currPass);
                                setPasswordMessage(validation.message);
                                setPasswordValidationState(validation.validationState);
                            }}
                            ref={passwordInputRef}
                            onKeyDown={onKeyDownForLogin} // Listen for key down events on the email input
                            contentAfter={
                                <Button
                                    shape='circular'
                                    size='small'
                                    appearance='transparent'
                                    icon={passwordVisible ? <Eye /> : <EyeOff />}
                                    onClick={togglePasswordVisibility}
                                    tabIndex={-1}
                                />
                            }
                        />
                    </Field>
                </div>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        height: '40px',
                    }}
                />
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '20px',
                        columnGap: '20px',
                        marginTop: '10px',
                    }}
                >
                    <Popover
                        positioning={{ positioningRef: regionSelectPositioningRef }}
                        trapFocus
                        open={openRegionSelect}
                        withArrow
                    >
                        <PopoverSurface
                            tabIndex={-1}
                            style={{
                                backgroundColor: tokens.colorNeutralBackground3,
                                border: `1px solid ${tokens.colorPaletteBlueBorderActive}`,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Text align='justify'>
                                    You have accounts in multiple regions. Please select a region to proceed with login.
                                </Text>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        gap: '10px',
                                        justifyContent: 'space-evenly',
                                        alignItems: 'center',
                                    }}
                                >
                                    {regions.map((region) => (
                                        <Button
                                            key={region}
                                            shape='circular'
                                            // appearance='subtle'
                                            size='small'
                                            onClick={() => {
                                                onRegionInput(region);
                                            }}
                                        >
                                            {region}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </PopoverSurface>
                    </Popover>
                    <Popover
                        positioning={{ positioningRef: passcodeInputPositioningRef }}
                        trapFocus
                        open={openPasscodeInput}
                        withArrow
                    >
                        <PopoverSurface
                            tabIndex={-1}
                            style={{
                                backgroundColor: tokens.colorNeutralBackground3,
                                border: `1px solid ${tokens.colorPaletteBlueBorderActive}`,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Text align='justify'>
                                    Please enter the verification code from your authentication app.
                                </Text>

                                <Field
                                    label='Passcode'
                                    required
                                    style={{ width: '100%' }}
                                >
                                    <Input
                                        required
                                        value={passcode}
                                        onChange={(e) => {
                                            setPasscode(e.target.value);
                                        }}
                                        onKeyDown={onKeyDownForPasscode}
                                        placeholder='Two factor authentication code'
                                        style={{ width: '100%' }}
                                        ref={passcodeInputRef}
                                        name={`passcode-${Date.now()}`}
                                    />
                                </Field>
                                <Button
                                    shape='circular'
                                    onClick={() => {
                                        onPasscodeInput();
                                    }}
                                >
                                    Authenticate
                                </Button>
                            </div>
                        </PopoverSurface>
                    </Popover>

                    <Button
                        ref={loginButtonRef}
                        style={{ width: '100%' }}
                        appearance='primary'
                        disabled={!isFormValid} // Button is disabled if the form is not valid
                        disabledFocusable={loginButtonStatus === 'Login...'}
                        onClick={(event) => {
                            event.stopPropagation(); // Prevent the event from bubbling up
                            onLoginButton(cloud, email, password);
                        }}
                        icon={
                            loginButtonStatus === 'Login' ? (
                                <ArrowEnterRegular />
                            ) : loginButtonStatus === 'Login...' ? (
                                <Spinner size='tiny' />
                            ) : loginButtonStatus === 'Logged in' ? (
                                <CheckmarkFilled />
                            ) : null
                        }
                    >
                        {loginButtonStatus}
                    </Button>
                    <Label>- or -</Label>
                    <Button
                        icon={<GoogleIcon disabled={emailValidationState !== 'success'} />}
                        shape='rounded'
                        appearance='subtle'
                        size='small'
                        disabled={emailValidationState !== 'success'}
                        onClick={onSignInGoogle}
                    >
                        Sign in with Google
                    </Button>
                </div>
            </DialogSurface>
        </Dialog>
    );
};

export default Login;
