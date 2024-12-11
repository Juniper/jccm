import { app, ipcMain, BrowserWindow, session, screen } from 'electron';
import { getCloudInfoMinVersion } from '../config';
import { Client } from 'ssh2';

import { mainWindow, sendLogMessage } from '../main.js';

import {
    msGetActiveCloud,
    msGetActiveRegionName,
    msGetTheme,
    msSetTheme,
    msSetCloudInventory,
    msGetCloudInventory,
    msSetActiveCloud,
    msSetActiveRegionName,
    msSetOrgFilter,
    msGetOrgFilter,
    msGetUserEmail,
    msSetLocalInventory,
    msGetLocalInventory,
    msGetCloudOrgs,
    msSetCloudOrgs,
    msLoadDeviceFacts,
    msSaveDeviceFacts,
    msLoadSubnets,
    msSaveSubnets,
    msLoadSettings,
    msSaveSettings,
    clearAndCompactDatabase,
    msLoadVault,
    msSaveVault,
} from './mainStore';
import {
    acLookupRegions,
    acUserLogin,
    acUserMFA,
    acUserLogout,
    acUserSelf,
    acGetCloudSites,
    acGetCloudInventory,
    acGetDeviceStatsType,
    acRequest,
    acGetGoogleSSOAuthorizationUrl,
    acLoginUserGoogleSSO,
    acDeviceModels,
} from './ApiCalls';

import { CloudInfo } from '../config';
import { commitJunosSetConfig, executeJunosCommand, getDeviceFacts, getDeviceNetworkCondition } from './Device';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sshSessions = {};

const serverGetCloudInventory = async (targetOrgs = null, ignoreCaseInName = false) => {
    console.log('main: serverGetCloudInventory');

    const orgFilters = await msGetOrgFilter();
    const selfData = await acUserSelf();

    if (selfData.status === 'error') {
        console.error('main: msGetCloudInventory failed', selfData.error);
        return { inventory: [], isFilterApplied: false };
    }

    const currentInventory = await msGetCloudInventory();
    const inventory = [];
    const orgs = {};

    for (const v of selfData.data.privileges) {
        if (v.scope === 'org') {
            const orgId = v.org_id;
            const orgName = v.name;

            if (!!orgFilters[orgId]) continue;

            // Check targetOrgs with or without case sensitivity
            const orgNameMatch = ignoreCaseInName
                ? targetOrgs?.some((targetOrg) => targetOrg.toLowerCase() === orgName.toLowerCase())
                : targetOrgs?.some((targetOrg) => targetOrg === orgName);

            if (targetOrgs !== null && !orgNameMatch) {
                // Find the organization in the current inventory with the same orgId
                const existingOrg = currentInventory.find((org) => org.id === orgId);
                if (existingOrg) {
                    // console.log('>>>> Reuse existing org:', JSON.stringify(existingOrg, null, 2));
                    inventory.push(existingOrg);
                    continue; // Skip further processing for this organization
                }
            }

            const item = { name: orgName, id: orgId };

            const sitesData = await acGetCloudSites(orgId);
            if (sitesData.status === 'error') {
                console.error(`serverGetCloudInventory: acGetCloudSites error on org ${orgId}`);
                continue;
            }

            const sites = Object.fromEntries(
                Object.entries(sitesData.data).map(([key, value]) => [value.name, { id: value.id }])
            );

            orgs[orgName] = { id: orgId, sites };

            if (sitesData.status === 'success') {
                item.sites = sitesData.data;
            }

            const inventoryData = await acGetCloudInventory(orgId);

            if (inventoryData.status === 'success') {
                const devices = inventoryData.data;
                const siteIdHavingVMAC = new Set();

                try {
                    for (const device of devices) {
                        if (device.site_id) {
                            for (const site of item['sites'] || []) {
                                if (site.id === device.site_id) {
                                    device.site_name = site.name;
                                }
                            }
                        }
                        device.org_name = item.name;
                        if (device?.mac.toUpperCase() === device.serial.toUpperCase() && device.type === 'switch') {
                            // console.log(`mac === serial: device: ${JSON.stringify(device, null, 2)}`);
                            siteIdHavingVMAC.add(device.site_id);
                        }
                    }
                } catch (error) {
                    console.error('serverGetCloudInventory: ', error);
                }

                if (siteIdHavingVMAC.size > 0) {
                    const SN2VSN = {};
                    for (const siteId of siteIdHavingVMAC) {
                        console.log(`Get device stats for site(${siteId})`);
                        const response = await acGetDeviceStatsType(siteId, 'switch');

                        if (response.status === 'success') {
                            const cloudDeviceStates = response.data;
                            // console.log(`Get device stats: ${JSON.stringify(cloudDeviceStates, null, 2)}`);

                            for (const cloudDevice of cloudDeviceStates) {
                                SN2VSN[cloudDevice.serial] = cloudDevice.module_stat.find(
                                    (item) => item && item.serial
                                );
                            }
                        }
                    }

                    for (const device of devices) {
                        if (device?.mac.toUpperCase() === device.serial.toUpperCase() && device.type === 'switch') {
                            module = SN2VSN[device.serial];
                            device.original_mac = module?.mac;
                            device.original_serial = module?.serial;
                            device.is_vmac_enabled = true;
                            console.log(
                                `switch device: ${device.hostname}, ${device.original_serial} -> ${device.serial}`
                            );
                        }
                    }
                }

                item.inventory = devices;
            }

            inventory.push(item);
        }
    }

    // Print out the cloud inventory
    // console.log(JSON.stringify(inventory, null, 2));
    // console.log(JSON.stringify(orgs, null, 2));

    await msSetCloudInventory(inventory);
    await msSetCloudOrgs(orgs);

    const isFilterApplied = Object.keys(orgFilters).length > 0;
    return { inventory, isFilterApplied };
};

const serverGetDeviceStats = async (siteId) => {
    console.log('main: serverGetDeviceStats');

    const selfData = await acUserSelf();

    if (selfData.status === 'error') {
        console.error('main: serverGetDeviceStats failed', selfData.error);
        return [];
    }

    const cloudId = await msGetActiveCloud();
    const deviceTypes = cloudId.toLowerCase().includes('mist')
        ? ['switch', 'gateway']
        : ['switch', 'gateway', 'router'];

    const inventory = [];

    for (const deviceType of deviceTypes) {
        const response = await acGetDeviceStatsType(siteId, deviceType);
        if (response.status === 'success') {
            inventory.push(...response.data);
        }
    }

    return inventory;
};

const startSSHConnectionStandalone = (event, device, { id, cols, rows }) => {
    const { address, port, username, password } = device;

    const conn = new Client();
    sshSessions[id] = conn;

    conn.on('ready', () => {
        console.log(`SSH session successfully opened for id: ${id}`);
        event.reply('sshSessionOpened', { id }); // Notify renderer that the session is open

        conn.shell({ cols, rows }, (err, stream) => {
            if (err) {
                event.reply('sshErrorOccurred', { id, message: err.message });
                return;
            }

            stream.on('data', (data) => {
                event.reply('sshDataReceived', { id, data: data.toString() });
            });

            stream.on('close', () => {
                event.reply('sshDataReceived', {
                    id,
                    data: 'The SSH session has been closed.\r\n',
                });

                conn.end();
                delete sshSessions[id];
                event.reply('sshSessionClosed', { id });
                // Clean up listeners
                ipcMain.removeAllListeners(`sendSSHInput-${id}`);
                ipcMain.removeAllListeners(`resizeSSHSession-${id}`);
            });

            ipcMain.on(`sendSSHInput-${id}`, (_, data) => {
                stream.write(data);
            });

            ipcMain.on(`resizeSSHSession-${id}`, (_, { cols, rows }) => {
                stream.setWindow(rows, cols, 0, 0);
            });
        });
    }).connect({
        host: address,
        port,
        username,
        password,
        poll: 10, // Adjust the polling interval to 10 milliseconds
        keepaliveInterval: 10000, // Send keepalive every 10 seconds
        keepaliveCountMax: 3, // Close the connection after 3 failed keepalives
    });

    conn.on('error', (err) => {
        event.reply('sshErrorOccurred', { id, message: err.message });
    });

    conn.on('end', () => {
        delete sshSessions[id];
    });
};

const startSSHConnectionProxy = (event, device, bastionHost, { id, cols, rows }) => {
    const conn = new Client();
    sshSessions[id] = conn;

    conn.on('ready', () => {
        console.log(`SSH session successfully opened for id: ${id}`);
        event.reply('sshSessionOpened', { id }); // Notify renderer that the session is open

        conn.shell({ cols, rows }, (err, stream) => {
            if (err) {
                event.reply('sshErrorOccurred', { id, message: err.message });
                return;
            }

            let initialOutputBuffer = '';
            let sshClientCommand = '';

            const sshOptions = [
                '-o StrictHostKeyChecking=no',
                '-o ConnectTimeout=3',
                '-o NumberOfPasswordPrompts=1',
                '-o PreferredAuthentications=keyboard-interactive',
            ].join(' ');

            const linuxSSHCommand = `ssh -tt ${sshOptions} -p ${device.port} ${device.username}@${device.address};exit`;
            const junosSSHCommand = `set cli prompt "> "\nstart shell command "ssh -tt ${sshOptions} -p ${device.port} ${device.username}@${device.address}"\nexit`;

            const promptPattern = /\n[\s\S]*?[@#>%$]\s$/;

            let isBastionHostOsTypeChecked = false;
            let isBastionHostOsTypeCheckTimeoutPass = false;
            let bastionHostOsTypeCheckTimeoutHandle;

            let isSshClientPasswordInputted = false;
            let isSshClientPasswordInputTimeoutPass = false;
            let sshClientPasswordInputTimeoutHandle;

            let isSshClientAuthErrorMonitoringTimeoutPass = false;
            let sshClientAuthErrorMonitoringTimeoutHandle;

            const resetBastionHostOsTypeCheckTimeout = (timeout) => {
                clearTimeout(bastionHostOsTypeCheckTimeoutHandle);
                bastionHostOsTypeCheckTimeoutHandle = setTimeout(() => {
                    isBastionHostOsTypeCheckTimeoutPass = true;
                }, timeout);
            };

            const resetSshClientPasswordInputTimeout = (timeout) => {
                clearTimeout(sshClientPasswordInputTimeoutHandle);
                sshClientPasswordInputTimeoutHandle = setTimeout(() => {
                    isSshClientPasswordInputTimeoutPass = true;
                }, timeout);
            };

            const resetSshClientAuthErrorMonitoringTimeout = (timeout) => {
                clearTimeout(sshClientAuthErrorMonitoringTimeoutHandle);
                sshClientAuthErrorMonitoringTimeoutHandle = setTimeout(() => {
                    isSshClientAuthErrorMonitoringTimeoutPass = true;
                }, timeout);
            };

            resetBastionHostOsTypeCheckTimeout(5000);

            stream.on('data', (data) => {
                const output = data.toString();

                // process.stdout.write(output);

                if (!isBastionHostOsTypeCheckTimeoutPass || !isSshClientPasswordInputTimeoutPass) {
                    initialOutputBuffer += output;
                }

                // Check if either the timeout has passed without a check, or the check hasn't been done and it's ready
                if (
                    (!isBastionHostOsTypeChecked && promptPattern.test(initialOutputBuffer)) ||
                    (isBastionHostOsTypeCheckTimeoutPass && !isBastionHostOsTypeChecked)
                ) {
                    isBastionHostOsTypeChecked = true;
                    isBastionHostOsTypeCheckTimeoutPass = true;
                    clearTimeout(bastionHostOsTypeCheckTimeoutHandle);

                    // Determine the SSH command based on the output buffer content
                    if (initialOutputBuffer.toLowerCase().includes('junos') && bastionHost.username !== 'root') {
                        sshClientCommand = junosSSHCommand;
                    } else {
                        sshClientCommand = linuxSSHCommand;
                    }

                    // Send the determined SSH command and reset the initial output buffer
                    stream.write(sshClientCommand + '\n');
                    initialOutputBuffer = '';

                    // Reset the password input timeout to prepare for the next step
                    resetSshClientPasswordInputTimeout(5000);
                }

                // Check if the bastion host's OS type has been successfully checked.
                if (isBastionHostOsTypeChecked) {
                    // Handling input for the SSH client password
                    if (!isSshClientPasswordInputted) {
                        if (
                            !isSshClientPasswordInputTimeoutPass &&
                            initialOutputBuffer.toLowerCase().includes('password:')
                        ) {
                            // Password prompt found, input the password
                            isSshClientPasswordInputted = true;
                            stream.write(device.password + '\n');
                            initialOutputBuffer = '';
                            resetSshClientAuthErrorMonitoringTimeout(5000);
                        } else if (isSshClientPasswordInputTimeoutPass) {
                            // Handling timeout passing without password input
                            isSshClientPasswordInputted = true;
                            initialOutputBuffer = '';
                            isSshClientAuthErrorMonitoringTimeoutPass = true;
                        }
                    } else {
                        // Handling SSH client authentication error monitoring
                        if (!isSshClientAuthErrorMonitoringTimeoutPass) {
                            // Check if there's no error message indicating a connection issue
                            const connectionErrorMessage = `${device.username}@${device.address}: `;
                            const sshConnectionErrorMessage = `ssh: connect to host ${device.address} port ${device.port}: `;
                            if (
                                !initialOutputBuffer.includes(connectionErrorMessage) &&
                                !initialOutputBuffer.includes(sshConnectionErrorMessage)
                            ) {
                                event.reply('sshDataReceived', {
                                    id,
                                    data: output,
                                });
                            }
                        } else {
                            // Timeout has passed, send data regardless
                            event.reply('sshDataReceived', {
                                id,
                                data: output,
                            });
                        }
                    }
                }
            });

            stream.on('close', () => {
                // console.log(`|||>>>${initialOutputBuffer}<<<|||`);

                // Function to handle the extraction and cleanup of error messages
                function handleSSHErrorMessage(pattern, messagePrefix) {
                    const regex = new RegExp(`^${pattern}(.+)$`, 'm');
                    const match = initialOutputBuffer.match(regex);

                    if (match && match[1]) {
                        const sshErrorMessage = match[1];
                        const cleanedErrorMessage = sshErrorMessage.replace(/\.$/, '');
                        event.reply('sshDataReceived', {
                            id,
                            data: `${messagePrefix}${cleanedErrorMessage}\r\n\r\n`,
                        });
                    }
                }

                // Check for error messages related to direct SSH or port issues
                if (initialOutputBuffer.includes(`${device.username}@${device.address}: `)) {
                    handleSSHErrorMessage(`${device.username}@${device.address}: `, 'SSH connection: ');
                } else if (
                    initialOutputBuffer.includes(`ssh: connect to host ${device.address} port ${device.port}: `)
                ) {
                    handleSSHErrorMessage(
                        `ssh: connect to host ${device.address} port ${device.port}: `,
                        '\r\nSSH connection: '
                    );
                }

                conn.end();
                delete sshSessions[id];
                event.reply('sshSessionClosed', { id });

                // Clean up listeners
                ipcMain.removeAllListeners(`sendSSHInput-${id}`);
                ipcMain.removeAllListeners(`resizeSSHSession-${id}`);
            });

            ipcMain.on(`sendSSHInput-${id}`, (_, data) => {
                stream.write(data);
            });

            ipcMain.on(`resizeSSHSession-${id}`, (_, { cols, rows }) => {
                stream.setWindow(rows, cols, 0, 0);
            });
        });
    }).connect({
        host: bastionHost.host,
        port: bastionHost.port,
        username: bastionHost.username,
        password: bastionHost.password,
        readyTimeout: bastionHost.readyTimeout,
        poll: 10, // Adjust the polling interval to 10 milliseconds
        keepaliveInterval: 10000, // Send keepalive every 10 seconds
        keepaliveCountMax: 3, // Close the connection after 3 failed keepalives
    });

    conn.on('error', (err) => {
        event.reply('sshErrorOccurred', { id, message: err.message });
    });

    conn.on('end', () => {
        delete sshSessions[id];
    });
};

export const setupApiHandlers = () => {
    ipcMain.handle('saFetchAvailableClouds', async (event) => {
        console.log('main: saFetchAvailableClouds');
        const clouds = getCloudInfoMinVersion();
        return { clouds };
    });

    ipcMain.handle('saLookupApiEndpoint', async (event, args) => {
        console.log('main: saLookupApiEndpoint');
        const cloudId = args.cloud;
        const email = args.email;
        try {
            const response = await acLookupRegions(cloudId, email);
            return response;
        } catch (error) {
            console.error('User lookup failed!', error);
            return { status: 'error', error };
        }
    });

    ipcMain.handle('saLoginUser', async (event, args) => {
        console.log('main: saLoginUser');

        const cloudId = args.cloud;
        const regionName = args.region;
        const email = args.email;
        const password = args.password || null;
        const passcode = args.passcode || null;

        if (!regionName || !email) return { login: 'error', error: 'Missing required fields' };
        if (!password && !passcode)
            return {
                login: 'error',
                error: 'Missing authentication credentials',
            };

        if (password && !passcode) {
            const response = await acUserLogin(cloudId, regionName, email, password);
            console.log('main: saLoginUser: response:', JSON.stringify(response, null, 2));

            if (response.status === 'success') {
                if (response.data.two_factor_required && !response.data.two_factor_passed) {
                    return { login: true, two_factor: true };
                } else {
                    const cloudDescription = CloudInfo[cloudId].description;
                    const service = `${cloudDescription}/${regionName}`;
                    const theme = await msGetTheme();
                    return {
                        login: true,
                        user: {
                            ...response.data,
                            service,
                            theme,
                            cloudDescription,
                            regionName,
                        },
                    };
                }
            } else {
                return { login: false, error: response.error };
            }
        } else if (passcode) {
            const response = await acUserMFA(passcode);

            if (response.status === 'success') {
                if (response.data?.two_factor_verified) {
                    const cloudDescription = CloudInfo[cloudId].description;
                    const service = `${cloudDescription}/${regionName}`;
                    const theme = await msGetTheme();

                    return {
                        login: true,
                        user: {
                            ...response.data,
                            service,
                            theme,
                            cloudDescription,
                            regionName,
                        },
                    };
                } else {
                    return { login: false, error: 'two factor auth failed' };
                }
            } else {
                return { login: false, error: response.error };
            }
        } else {
            if (!password && !passcode)
                return {
                    login: false,
                    error: 'Missing authentication credentials.',
                };
        }
    });

    ipcMain.handle('saLogoutUser', async (event) => {
        console.log('main: saLogoutUser');
        try {
            await acUserLogout();
            return { logout: true };
        } catch (error) {
            return { logout: false, error };
        }
    });

    ipcMain.handle('device-models', async (event) => {
        console.log('main: device-models');
        try {
            const response = await acDeviceModels();
            // console.log('main: device-models: response:', response);
            if (response.status === 'error') {
                return { deviceModels: [] };
            }
            return { deviceModels: response.deviceModels };
        } catch (error) {
            console.log('main: device-models: error:', error);
            return { deviceModels: [] };
        }
    });

    ipcMain.handle('saWhoamiUser', async (event) => {
        console.log('main: saWhoamiUser');
        try {
            const response = await acUserSelf();

            if (response.status === 'success') {
                const cloudId = await msGetActiveCloud();
                const cloudDescription = CloudInfo[cloudId].description;
                const regionName = await msGetActiveRegionName();
                const service = `${cloudDescription}/${regionName}`;
                const theme = await msGetTheme();

                return {
                    sessionValid: true,
                    user: {
                        ...response.data,
                        service,
                        theme,
                        cloudDescription,
                        regionName,
                    },
                };
            } else {
                const theme = await msGetTheme();
                return {
                    sessionValid: false,
                    error: 'whoami call failed',
                    theme,
                };
            }
        } catch (error) {
            console.log('main: saWhoamiUser: error:', error);
            return { sessionValid: false, error };
        }
    });

    ipcMain.handle('saSetThemeUser', async (event, args) => {
        console.log('main: saSetThemeUser');
        const theme = args.theme;
        await msSetTheme(theme);
    });

    ipcMain.handle('saGetCloudInventory', async (event, args = {}) => {
        console.log('main: saGetCloudInventory');
        const { targetOrgs = nul, ignoreCaseInName = false } = args;

        const { inventory, isFilterApplied } = await serverGetCloudInventory(targetOrgs, ignoreCaseInName);

        return { cloudInventory: true, inventory, isFilterApplied };
    });

    ipcMain.handle('saGetDeviceStats', async (event, args = {}) => {
        console.log('main: saGetDeviceStats');
        const { siteId } = args;

        const inventory = await serverGetDeviceStats(siteId);

        return inventory;
    });

    ipcMain.handle('saProxyCall', async (event, args) => {
        console.log('main: saProxyCall');
        const { method, api, body } = args;

        try {
            const response = await acRequest(api, method, body);
            return { proxy: true, response };
        } catch (error) {
            return { proxy: false, error };
        }
    });

    ipcMain.handle('saOrgFilter', async (event, args) => {
        console.log('main: saOrgFilter');
        const { method, body } = args;

        if (method === 'GET') {
            const selfData = await acUserSelf();
            if (selfData.status === 'error') {
                return [];
            }

            const orgs = [];
            const filters = await msGetOrgFilter();

            const cloudId = await msGetActiveCloud();
            const cloudDescription = CloudInfo[cloudId].description;
            const regionName = await msGetActiveRegionName();
            const userEmail = await msGetUserEmail();
            const path = `${userEmail}/${cloudDescription}/${regionName}`;

            for (const v of selfData.data.privileges) {
                if (v.scope === 'org') {
                    const orgId = v.org_id;
                    const item = { name: v.name, id: orgId, path };
                    orgs.push(item);
                }
            }

            return { orgFilter: true, orgs, filters };
        } else if (method === 'SET') {
            const filters = body.filters;
            msSetOrgFilter(filters);
            return { orgFilter: true };
        } else {
            return { orgFilter: false, error: `Unknown method: "${method}"` };
        }
    });

    ipcMain.handle('saGetLocalInventory', async (event) => {
        console.log('main: saGetLocalInventory');
        const inventory = await msGetLocalInventory();

        return { localInventory: true, inventory };
    });

    ipcMain.handle('saSetLocalInventory', async (event, args) => {
        console.log('main: saSetLocalInventory');
        const inventory = args.inventory;
        await msSetLocalInventory(inventory);

        return { localInventory: true };
    });

    // SSH handling
    ipcMain.on('startSSHConnection', async (event, { id, cols, rows }) => {
        console.log('main: startSSHConnection: id: ' + id);
        const inventory = await msGetLocalInventory();
        const settings = await msLoadSettings();

        const bastionHost = settings?.bastionHost || {};

        const found = inventory.filter(
            ({ organization, site, address, port }) => id === `/Inventory/${organization}/${site}/${address}/${port}`
        );
        if (found.length === 0) {
            console.error('No device found: path id: ', id);
            return;
        }
        let device = found[0];

        const vault = await msLoadVault();

        const getPasswordFromVault = (tag) => {
            const vaultEntry = vault.find((item) => item.tag === tag);
            return vaultEntry ? vaultEntry.password : tag; // Return the password or null if not found
        };

        const isVaultFormat = (password) => {
            if (typeof password !== 'string') {
                return false; // Invalid input
            }
            // Check for the `${vault:tag_name}` format
            return (
                password.startsWith('${vault:') &&
                password.endsWith('}') &&
                password.split('${vault:')[1]?.slice(0, -1)?.trim() !== ''
            );
        };

        const getPassword = (password) => {
            if (isVaultFormat(password)) {
                const tagName = password.slice(8, -1).trim();
                const v = getPasswordFromVault(tagName);
                return v;
            }
            return password;
        };

        device.password = getPassword(device.password);

        if (bastionHost?.active) {
            startSSHConnectionProxy(event, device, bastionHost, {
                id,
                cols,
                rows,
            });
        } else {
            startSSHConnectionStandalone(event, device, { id, cols, rows });
        }
    });

    ipcMain.on('disconnectSSHSession', (event, { id }) => {
        console.log('main: disconnectSSHSession');

        if (sshSessions[id]) {
            sshSessions[id].end();
            delete sshSessions[id];
        }
    });

    ipcMain.handle('saGetDeviceFacts', async (event, args) => {
        console.log('main: saGetDeviceFacts');

        const { address, port, username, password, timeout, upperSerialNumber, bastionHost } = args;

        try {
            let reply = await getDeviceFacts(
                address,
                port,
                username,
                password,
                timeout,
                upperSerialNumber,
                bastionHost
            );

            if (reply?.message?.toLowerCase().includes('reset by peer')) {
                console.log('Connection reset by peer, retrying in 3 seconds...');
                await sleep(3000); // Wait for 3 seconds before retrying

                reply = await getDeviceFacts(
                    address,
                    port,
                    username,
                    password,
                    timeout,
                    upperSerialNumber,
                    bastionHost
                );
            }

            return { facts: true, reply };
        } catch (error) {
            console.error('Error getting device facts:', error);
            return { facts: false, reply: error };
        }
    });

    ipcMain.handle('saAdoptDevice', async (event, args) => {
        console.log('main: saAdoptDevice');

        const {
            organization,
            site,
            address,
            port,
            username,
            password,
            jsiTerm,
            deleteOutboundSSHTerm,
            bastionHost,
            ignoreCaseInName = false,
            ...others
        } = args;

        const cloudOrgs = await msGetCloudOrgs();

        console.log('Adopting device:', organization, site, address, port, ignoreCaseInName, cloudOrgs);

        let orgId = null;
        let siteId = null;

        // Adjust organization and site lookup to support ignoreCaseInName
        if (ignoreCaseInName) {
            const matchingOrg = Object.keys(cloudOrgs).find((org) => org.toLowerCase() === organization.toLowerCase());
            if (matchingOrg) {
                orgId = cloudOrgs[matchingOrg]?.id;
                const matchingSite =
                    cloudOrgs[matchingOrg]?.sites &&
                    Object.keys(cloudOrgs[matchingOrg].sites).find((s) => s.toLowerCase() === site.toLowerCase());
                if (matchingSite) {
                    siteId = cloudOrgs[matchingOrg].sites[matchingSite]?.id || null;
                }
            }
        } else {
            orgId = cloudOrgs[organization]?.id;
            siteId = cloudOrgs[organization]?.sites?.[site]?.id || null;
        }

        // Check if orgId or siteId is null
        if (!orgId) {
            console.error('Organization not found');
            return {
                adopt: false,
                reply: { message: 'Organization not found' },
            };
        }

        if (!siteId) {
            console.warn('Site not found, proceeding without siteId');
        }

        try {
            let endpoint = 'ocdevices';
            if (jsiTerm) {
                endpoint = 'jsi/devices';
            }

            const api = `orgs/${orgId}/${endpoint}/outbound_ssh_cmd${siteId ? `?site_id=${siteId}` : ''}`;
            const response = await acRequest(api, 'GET', null);

            const configCommand = deleteOutboundSSHTerm
                ? `delete system services outbound-ssh\n${response.cmd}\n`
                : `${response.cmd}\n`;

            const reply = await commitJunosSetConfig(address, port, username, password, configCommand, bastionHost);

            if (reply.status === 'success' && reply.data.includes('<commit-success/>')) {
                return { adopt: true, reply };
            } else {
                return { adopt: false, reply };
            }
        } catch (error) {
            console.error('Configuration failed!', error);
            return { adopt: false, reply: error };
        }
    });

    ipcMain.handle('saReleaseDevice', async (event, args) => {
        console.log('main: saReleaseDevice');

        const { organization, serial, ignoreCaseInName = false } = args;

        const cloudOrgs = await msGetCloudOrgs();

        // Adjust organization lookup to support ignoreCaseInName
        let orgId = null;
        if (ignoreCaseInName) {
            const matchingOrg = Object.keys(cloudOrgs).find((org) => org.toLowerCase() === organization.toLowerCase());
            orgId = cloudOrgs[matchingOrg]?.id;
        } else {
            orgId = cloudOrgs[organization]?.id;
        }

        // Check if orgId is null
        if (!orgId) {
            console.error('Organization not found');
            return {
                release: false,
                reply: { message: 'Organization not found' },
            };
        }

        try {
            console.log('device releasing!');

            const serialsPayload = typeof serial === 'string' ? [serial] : serial;

            const response = await acRequest(`orgs/${orgId}/inventory`, 'PUT', {
                op: 'delete',
                serials: serialsPayload,
            });

            return { release: true, reply: response };
        } catch (error) {
            console.error('Configuration failed!', error);
            return { release: false, reply: error };
        }
    });

    ipcMain.handle('saExecuteJunosCommand', async (event, args) => {
        console.log('main: saExecuteJunosCommand');

        try {
            const { address, port, username, password, command, timeout } = args;
            const reply = await executeJunosCommand(address, port, username, password, command, timeout);
            return { command: true, reply };
        } catch (error) {
            console.error('Junos command execution failed!', error);
            return { command: false, reply };
        }
    });

    ipcMain.handle('saLoadDeviceFacts', async (event) => {
        console.log('main: saLoadDeviceFacts');
        const facts = await msLoadDeviceFacts();

        return { deviceFacts: true, facts };
    });

    ipcMain.handle('saSaveDeviceFacts', async (event, args) => {
        console.log('main: saSaveDeviceFacts');
        const facts = args.facts;
        await msSaveDeviceFacts(facts);

        return { deviceFacts: true };
    });

    ipcMain.handle('saLoadSubnets', async (event) => {
        console.log('main: saLoadSubnets');
        const subnets = await msLoadSubnets();

        return { status: true, subnets };
    });

    ipcMain.handle('saSaveSubnets', async (event, args) => {
        console.log('main: saSaveSubnets');
        const subnets = args.subnets;
        await msSaveSubnets(subnets);
        // console.log('main: saSaveSubnets:', subnets);

        return { status: true };
    });

    ipcMain.handle('saLoadSettings', async (event) => {
        console.log('main: saLoadSettings');
        const settings = await msLoadSettings();

        return { status: true, settings };
    });

    ipcMain.handle('saSaveSettings', async (event, args) => {
        console.log('main: saSaveSettings');
        const settings = args.settings;
        await msSaveSettings(settings);
        // console.log('main: saSaveSettings:', settings);

        return { status: true };
    });

    ipcMain.handle('saGetGoogleSSOAuthCode', async (event, args) => {
        console.log('main: saGetGoogleSSOAuthCode');

        const cloudId = args.cloud;
        const regionName = args.region;

        if (!cloudId || !regionName) {
            return { login: 'error', error: 'Missing required fields' };
        }

        const response = await acGetGoogleSSOAuthorizationUrl(cloudId, regionName);

        if (response.status === 'success') {
            const authorizationUrl = response.authorizationUrl;
            console.log('saGetGoogleSSOAuthCode gets authorization url successfully');

            const { width, height } = screen.getPrimaryDisplay().workAreaSize;

            // Open the authorization URL in a new BrowserWindow
            const authWindow = new BrowserWindow({
                width: Math.floor(width * 0.8), // 80% of the screen width
                height: Math.floor(height * 0.7), // 70% of the screen height
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    enableRemoteModule: false,
                },
            });

            authWindow.loadURL(authorizationUrl);

            // Intercept the HTTP request to the callback URL
            session.defaultSession.webRequest.onBeforeRequest(
                { urls: ['http://localhost/callback*'] },
                (details, callback) => {
                    const url = new URL(details.url);
                    const authCode = url.searchParams.get('code');

                    if (authCode) {
                        // Complete the request processing
                        callback({ cancel: false });

                        // Load a success message and close the auth window after the request processing is done
                        setImmediate(() => {
                            // a built-in function in Node.js that schedules a callback to be executed immediately after I/O events
                            authWindow.loadURL('data:text/html,Authentication successful! You can close this window.');
                            authWindow.close();

                            // Send the authorization code to the renderer process
                            mainWindow.webContents.send('saGoogleSSOAuthCodeReceived', authCode);
                        });
                    } else {
                        callback({ cancel: false });
                    }
                }
            );

            return { login: true };
        } else {
            console.log('saGetGoogleSSOAuthCode failed to get authorization url: ', response);
            return { login: false, error: response.error };
        }
    });

    ipcMain.handle('saLoginUserGoogleSSO', async (event, args) => {
        console.log('main: saLoginUserGoogleSSO');

        const authCode = args.authCode;

        if (!authCode) return { login: 'error', error: 'Missing required fields' };

        const response = await acLoginUserGoogleSSO(authCode);

        if (response.status === 'success') {
            const cloudId = await msGetActiveCloud();
            const regionName = await msGetActiveRegionName();
            const cloudDescription = CloudInfo[cloudId].description;

            const service = `${cloudDescription}/${regionName}`;
            const theme = await msGetTheme();

            return {
                login: true,
                user: {
                    ...response.data,
                    service,
                    theme,
                    cloudDescription,
                    regionName,
                },
            };
        }
    });

    ipcMain.on('saToggleDevTools', () => {
        if (mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.webContents.closeDevTools();
        } else {
            mainWindow.webContents.openDevTools();
        }
    });

    ipcMain.handle('get-app-info', () => {
        return {
            name: app.getName(), // App name from package.json
            version: app.getVersion(), // App version from package.json
            electron: process.versions.electron,
            chrome: process.versions.chrome,
            node: process.versions.node,
            v8: process.versions.v8,
            os: process.platform,
            osVersion: process.getSystemVersion(),
            electronBuildId: process.versions.electronBuildId || 'Unknown',
        };
    });

    ipcMain.handle('get-device-network-condition', async (event, args) => {
        console.log('main: saGetDeviceNetworkCondition');

        const { address, port, username, password, timeout, bastionHost, termServer, termPort } = args;

        try {
            let reply = await getDeviceNetworkCondition(
                address,
                port,
                username,
                password,
                timeout,
                bastionHost,
                termServer,
                termPort
            );

            if (reply?.message?.toLowerCase().includes('timed out')) {
                console.log('Timeout detected, retrying in 3 seconds...');
                await sleep(3000);
                reply = await getDeviceNetworkCondition(
                    address,
                    port,
                    username,
                    password,
                    timeout,
                    bastionHost,
                    termServer,
                    termPort
                );
            } else if (reply?.message?.toLowerCase().includes('reset by peer')) {
                console.log('Connection reset by peer detected, retrying in 3 seconds...');
                await sleep(3000);
                reply = await getDeviceNetworkCondition(
                    address,
                    port,
                    username,
                    password,
                    timeout,
                    bastionHost,
                    termServer,
                    termPort
                );
            }

            return { networkConditionCollect: true, reply };
        } catch (error) {
            console.error('Network condition error:', error);
            return { networkConditionCollect: false, reply: error };
        }
    });

    ipcMain.on('restart-app', () => {
        console.log('Received restart-app request...');
        app.relaunch(); // Relaunch the Electron app
        app.exit(0); // Exit the current instance
    });

    ipcMain.on('clear-database-and-restart-app', async () => {
        console.log('Received clear-database-and-restart-app request...');

        try {
            await acUserLogout();
        } catch (error) {
            console.log('User logout failed, proceeding anyway:', error);
        }

        await clearAndCompactDatabase();
        app.relaunch(); // Relaunch the Electron app
        app.exit(0); // Exit the current instance
    });

    ipcMain.on('quit-app', async () => {
        console.log('Received quit-app request...');
        app.exit(0); // Exit the current instance
    });

    ipcMain.handle('saStoreVault', async (event, args) => {
        console.log('main: saStoreVault');
        const vault = args.vault;
        await msSaveVault(vault);

        return { result: true };
    });

    ipcMain.handle('saLoadVault', async (event) => {
        console.log('main: saLoadVault');
        const vault = await msLoadVault();

        return { result: true, vault };
    });
};
