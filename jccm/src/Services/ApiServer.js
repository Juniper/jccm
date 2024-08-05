import { ipcMain, BrowserWindow, session, screen } from 'electron';
import { getCloudInfoMinVersion } from '../config';
import { Client } from 'ssh2';

import { mainWindow } from '../main.js';

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
} from './mainStore';
import {
    acLookupRegions,
    acUserLogin,
    acUserMFA,
    acUserLogout,
    acUserSelf,
    acGetCloudSites,
    acGetCloudInventory,
    acRequest,
    acGetGoogleSSOAuthorizationUrl,
    acLoginUserGoogleSSO,
} from './ApiCalls';

import { CloudInfo } from '../config';
import { commitJunosSetConfig, executeJunosCommand, getDeviceFacts } from './Device';
const sshSessions = {};

const serverGetCloudInventory = async () => {
    console.log('main: serverGetCloudInventory');

    const orgFilters = await msGetOrgFilter();
    const selfData = await acUserSelf();

    if (selfData.status === 'error') {
        console.error('main: msGetCloudInventory failed', selfData.error);
        return { inventory: [], isFilterApplied: false };
    }

    const inventory = [];
    const orgs = {};

    for (const v of selfData.data.privileges) {
        if (v.scope === 'org') {
            const orgId = v.org_id;

            const item = { name: v.name, id: orgId };
            const sitesData = await acGetCloudSites(orgId);

            const sites = Object.fromEntries(
                Object.entries(sitesData.data).map(([key, value]) => [value.name, { id: value.id }])
            );

            orgs[v.name] = { id: v.org_id, sites };

            if (!!orgFilters[orgId]) continue;

            if (sitesData.status === 'success') {
                item.sites = sitesData.data;
            }
            const inventoryData = await acGetCloudInventory(orgId);
            if (inventoryData.status === 'success') {
                const devices = inventoryData.data;
                for (const device of devices) {
                    if (device.site_id) {
                        for (const site of item['sites'] || []) {
                            if (site.id === device.site_id) {
                                device.site_name = site.name;
                            }
                        }
                    }
                    device.org_name = item.name;
                }
                item.inventory = devices;
            }
            inventory.push(item);
        }
    }

    // Print out the cloud inventory
    // console.log(JSON.stringify(inventory, null, 2));

    await msSetCloudInventory(inventory);
    await msSetCloudOrgs(orgs);

    const isFilterApplied = Object.keys(orgFilters).length > 0;
    return { inventory, isFilterApplied };
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
        if (!password && !passcode) return { login: 'error', error: 'Missing authentication credentials' };

        if (password && !passcode) {
            const response = await acUserLogin(cloudId, regionName, email, password);

            if (response.status === 'success') {
                if (response.data.two_factor_required && !response.data.two_factor_passed) {
                    return { login: true, two_factor: true };
                } else {
                    const cloudDescription = CloudInfo[cloudId].description;
                    const service = `${cloudDescription}/${regionName}`;
                    const theme = await msGetTheme();
                    const { inventory, isFilterApplied } = await serverGetCloudInventory();
                    return {
                        login: true,
                        user: { ...response.data, service, theme, cloudDescription, regionName },
                        inventory,
                        isFilterApplied,
                    };
                }
            }
        } else if (passcode) {
            const response = await acUserMFA(passcode);

            if (response.status === 'success') {
                if (response.data.two_factor_verified) {
                    const cloudDescription = CloudInfo[cloudId].description;
                    const service = `${cloudDescription}/${regionName}`;
                    const theme = await msGetTheme();
                    const { inventory, isFilterApplied } = await serverGetCloudInventory();

                    return {
                        login: true,
                        user: { ...response.data, service, theme, cloudDescription, regionName },
                        inventory,
                        isFilterApplied,
                    };
                } else {
                    return { login: false, error: 'two factor auth failed' };
                }
            }
        } else {
            if (!password && !passcode) return { login: 'error', error: 'Missing authentication credentials.' };
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

                const { inventory, isFilterApplied } = await serverGetCloudInventory();

                return {
                    sessionValid: true,
                    user: { ...response.data, service, theme, cloudDescription, regionName },
                    inventory,
                    isFilterApplied,
                };
            } else {
                const theme = await msGetTheme();
                return { sessionValid: false, error: 'whoami call failed', theme };
            }
        } catch (error) {
            console.log('main: saWhoamiUser: error:', error);
            return { sessionValid: false, error };
        }
    });

    ipcMain.handle('saSetThemeUser', async (event, args) => {
        console.log('main: saSetThemeUser', args);
        const theme = args.theme;
        await msSetTheme(theme);
    });

    ipcMain.handle('saGetCloudInventory', async (event) => {
        console.log('main: saGetCloudInventory');
        const { inventory, isFilterApplied } = await serverGetCloudInventory();

        return { cloudInventory: true, inventory, isFilterApplied };
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

        const found = inventory.filter(
            ({ organization, site, address, port }) => id === `/Inventory/${organization}/${site}/${address}/${port}`
        );
        if (found.length === 0) {
            console.error('No device found: path id: ', id);
            return;
        }
        const device = found[0];
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
                    event.reply('sshDataReceived', { id, data: 'The SSH session has been closed.\r\n' });

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
    });

    ipcMain.on('disconnectSSHSession', (event, { id }) => {
        console.log('main: disconnectSSHSession');

        if (sshSessions[id]) {
            sshSessions[id].end();
            delete sshSessions[id];
        }
    });

    // IPC main handler to adopt the device
    ipcMain.handle('saAdoptDevice', async (event, args) => {
        console.log('main: saAdoptDevice');

        const { organization, site, address, port, username, password, jsiTerm, deleteOutboundSSHTerm, ...others } =
            args;

        const cloudOrgs = await msGetCloudOrgs();
        const orgId = cloudOrgs[organization]?.id;
        const siteId = cloudOrgs[organization]?.sites?.[site]?.id || null;

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

            const reply = await commitJunosSetConfig(address, port, username, password, configCommand);

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

        const { organization, serial } = args;

        const cloudOrgs = await msGetCloudOrgs();
        const orgId = cloudOrgs[organization]?.id;

        try {
            console.log('device releasing!');

            const response = await acRequest(`orgs/${orgId}/inventory`, 'PUT', {
                op: 'delete',
                serials: [serial],
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
        console.log('main: saSaveSubnets:', subnets);

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
        console.log('main: saSaveSettings:', settings);

        return { status: true };
    });

    ipcMain.handle('saGetDeviceFacts', async (event, args) => {
        console.log('main: saGetDeviceFacts');

        try {
            const { address, port, username, password, timeout, upperSerialNumber } = args;
            const reply = await getDeviceFacts(address, port, username, password, timeout, upperSerialNumber);

            return { facts: true, reply };
        } catch (error) {
            // console.error('saGetDeviceFacts: Junos command execution failed!', args, error);
            return { facts: false, reply: error };
        }
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
            const { inventory, isFilterApplied } = await serverGetCloudInventory();

            return {
                login: true,
                user: { ...response.data, service, theme, cloudDescription, regionName },
                inventory,
                isFilterApplied,
            };
        }
    });
};
