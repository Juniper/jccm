import NodeCache from 'node-cache';
import originalFetch from 'node-fetch'; // Rename to avoid naming conflicts
import FetchCookie from 'fetch-cookie';
import { CookieJar } from 'tough-cookie';

const cookieJar = new CookieJar();
const fetch = FetchCookie(originalFetch, cookieJar); // Wraps node-fetch with cookie support

import { sendLogMessage } from '../main.js';

import { CloudInfo } from '../config';
import {
    msSetToken,
    msGetToken,
    msSetActiveCloud,
    msSetRegions,
    msGetRegions,
    msSetActiveRegionName,
    msGetActiveRegionName,
    msSetIsUserLoggedIn,
    msSetCookies,
    msGetCookies,
    msIsUserLoggedIn,
    msSetUserEmail,
    msGetCloudOrgs,
    msSetCloudOrgs,
} from './mainStore';

export const callbackUrl = 'http://localhost/callback';

const getCsrfToken = (cookieString) => {
    const regex = /csrftoken.*?=(.*?);/i;
    const match = regex.exec(cookieString + ';'); // Add a semicolon to handle edge cases where csrftoken is the last in the list
    return match ? match[1] : null;
};
const normalizeUrl = (apiBase, api) => {
    let url = `${apiBase}/${api}`;
    url = url.replace(/([^:])\/\/+/g, '$1/');
    return url;
};

export const acRequest = async (api, method, body = null) => {
    const activeRegionName = await msGetActiveRegionName();
    const regions = await msGetRegions();
    const activeRegion = regions[activeRegionName];
    const url = normalizeUrl(activeRegion.apiBase, api);

    // console.log('acRequest', url, method, body);

    const headers = {
        'Content-Type': 'application/json',
    };

    const cookies = await msGetCookies();
    if (cookies) {
        headers['Cookie'] = cookies;
    }

    const token = await msGetToken();

    if (token) headers['X-Csrftoken'] = token;

    const spec = {
        method: method,
        credentials: 'include', // This can be critical for cookies if withCredentials is needed
        headers: headers,
    };
    if (body) spec.body = JSON.stringify(body);

    const response = await fetch(url, spec);

    if (!response.ok) {
        const errorData = await response.json(); // Try to extract error details from the response
        throw errorData;
    }

    try {
        const cookiesData = response.headers.get('Set-Cookie');
        if (cookiesData) {
            const csrfToken = getCsrfToken(cookiesData);
            if (csrfToken) {
                await msSetToken(csrfToken);
            }
        }
    } catch (error) {
        throw new Error(`acRequest "${api}" cookiesData set issue ${error}`);
    }

    try {
        const responseData = await response.json(); // Consume the body here

        return responseData; // Return JSON data directly
    } catch (error) {
        throw new Error(
            `acRequest "${api}" acRequest Request failed with status ${error}`
        );
    }
};

export const acLookupRegions = async (cloudId, email) => {
    const apiGetCloudRegionEnv = async (envFiles) => {
        try {
            const regionsPromises = envFiles.map(async (envFile) => {
                const response = await fetch(envFile);
                const env = await response.json();
                if (!env.name) env.name = 'default';
                return env;
            });
            return await Promise.all(regionsPromises);
        } catch (error) {
            return [];
        }
    };

    try {
        const cloud = CloudInfo[cloudId];
        const url = cloud.lookupApiUrl;
        if (!url) return { status: 'error', error: 'Cloud not found' };

        const response = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }), // Assuming you might need both cloud and email
        });

        const data = await response.json();

        sendLogMessage(
            'INFO',
            `Cloud list contains the account ("${email}") with the following result:`,
            data
        );

        const accounts = data.accounts || [];

        if (accounts.length === 0) {
            const { protocol, host } = new URL(url);
            const site = `${protocol}//${host}`;
            accounts.push({ api_url: site, type: 'local' });
        }

        const envFiles = accounts.map((account) => {
            let url = account.api_url;
            url =
                (url.includes('mist.com')
                    ? url.replace('https://api', 'https://manage')
                    : url) + '/env.json';
            return url;
        });

        const environments = await apiGetCloudRegionEnv(envFiles);

        const regions = environments.reduce((regions, environment) => {
            regions[environment.name] = environment;
            return regions;
        }, {});

        sendLogMessage(
            'INFO',
            `Region list contains the account ("${email}") with the following result:`,
            regions
        );

        await msSetRegions(regions);

        return { status: 'success', regions: Object.keys(regions) };
    } catch (error) {
        console.error('User lookup failed!', error.message);
        sendLogMessage(
            'ERROR',
            `Failed to look up cloud list containing the account ("${email}") with the following result:`,
            error
        );
        return { status: 'error', error };
    }
};

export const acUserLogin = async (cloudId, regionName, email, password) => {
    await msSetActiveCloud(cloudId);
    await msSetActiveRegionName(regionName);
    try {
        await acRequest('login', 'POST', { email, password });
        const regions = await msGetRegions();

        const activeRegion = regions[regionName];
        const url = activeRegion.apiBase;

        const cookies = await new Promise((resolve, reject) => {
            cookieJar.getCookies(url, (err, cookies) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(
                        cookies.map((cookie) => cookie.toString()).join('; ')
                    );
                }
            });
        });

        await msSetCookies(cookies);

        const selfData = await acUserSelf();
        sendLogMessage(
            'INFO',
            `User ("${email}") login returned the following result:`,
            selfData
        );
        
        return selfData;
    } catch (error) {
        console.error('User login failed!!!', error.message);
        sendLogMessage(
            'ERROR',
            `User ("${email}") login failed with the following result:`,
            error
        );

        return { status: 'error', error };
    }
};

export const acUserLogout = async () => {
    try {
        await acRequest('logout', 'POST');
        await msSetIsUserLoggedIn(false);
        await msSetToken(null);
        await msSetCookies(null);

        sendLogMessage(
            'INFO',
            `User logout successful.`
        );
        

        return { status: 'success' };
    } catch (error) {
        console.error('User logout failed!', error.message);
        sendLogMessage(
            'ERROR',
            `User logout failed with the following result:`,
            error
        );

        return { status: 'error', error };
    }
};

export const acUserMFA = async (passcode) => {
    try {
        await acRequest('login/two_factor', 'POST', { two_factor: passcode });
        try {
            const selfData = await acUserSelf();
            sendLogMessage(
                'INFO',
                `User MFA login returned the following result:`,
                selfData
            );
    
            return selfData;
        } catch (error) {
            console.error('User self failed!', error.message);
            sendLogMessage(
                'INFO',
                `User MFA login failed returned the following result:`,
                error
            );
            
    
            return { status: 'error', error };
        }
    } catch (error) {
        console.error('User MFA failed!', error.message);
        sendLogMessage(
            'ERROR',
            `User MFA login failed with the following result:`,
            error
        );

        return { status: 'error', error };
    }
};

export const acUserSelf = async () => {
    const token = await msGetToken();

    if (!token) return { status: 'error', error: 'User is not logged in.' };

    try {
        const selfData = await acRequest('self', 'GET');

        await msSetIsUserLoggedIn(true);
        await msSetUserEmail(selfData.email);

        return { status: 'success', data: selfData };
    } catch (error) {
        await msSetIsUserLoggedIn(false);
        return { status: 'error', error };
    }
};

export const acDeviceModels = async () => {
    try {
        const deviceModels = await acRequest('const/device_models', 'GET');

        return { status: 'success', deviceModels };
    } catch (error) {
        return { status: 'error', error };
    }
};

export const acGetCloudSites = async (orgId) => {
    const isLoggedIn = await msIsUserLoggedIn();
    if (!isLoggedIn)
        return { status: 'error', error: 'User is not logged in.' };

    try {
        const data = await acRequest(`orgs/${orgId}/sites`, 'GET');
        return { status: 'success', data };
    } catch (error) {
        return { status: 'error', error };
    }
};

export const acGetCloudInventory = async (orgId) => {
    const isLoggedIn = await msIsUserLoggedIn();
    if (!isLoggedIn)
        return { status: 'error', error: 'User is not logged in.' };

    try {
        const data1 = await acRequest(
            `orgs/${orgId}/inventory?vc=true&type=switch`,
            'GET'
        );
        const _data2 = await acRequest(
            `orgs/${orgId}/inventory?vc=true&type=gateway`,
            'GET'
        );
        const data2 = _data2.filter((device) => !device.model.includes('SSR'));
        const data3 = await acRequest(
            `orgs/${orgId}/inventory?vc=true&type=router`,
            'GET'
        );

        const data = [...data1, ...data2, ...data3];

        // Commented out because of API throttling issues...
        // Filter devices where vc_map equals map (ensure this condition is correct)
        // const vc_nodes = data.filter((device) => device.vc_mac === device.mac);

        // Fetch VC details for filtered devices concurrently
        // await Promise.all(
        //     vc_nodes.map(async (device) => {
        //         try {
        //             const vc = await acRequest(`sites/${device.site_id}/devices/${device.id}/vc`, 'GET');
        //             device.vc = vc;
        //         } catch (error) {
        //             console.error(
        //                 `Failed to fetch VC details for device ${device.id} in the site ${device.site_id}:`,
        //                 error
        //             );
        //         }
        //     })
        // );

        return { status: 'success', data };
    } catch (error) {
        return { status: 'error', error };
    }
};

export const acGetDeviceStats = async (siteId, deviceId) => {
    const isLoggedIn = await msIsUserLoggedIn();
    if (!isLoggedIn)
        return { status: 'error', error: 'User is not logged in.' };

    try {
        const data = await acRequest(
            `sites/${siteId}/stats/devices/${deviceId}`,
            'GET'
        );
        return { status: 'success', data };
    } catch (error) {
        console.error('apiGetSites failed!', error.message);
        return { status: 'error', error };
    }
};

export const acGetDeviceStatsType = async (siteId, type) => {
    const isLoggedIn = await msIsUserLoggedIn();
    if (!isLoggedIn)
        return { status: 'error', error: 'User is not logged in.' };

    try {
        const data = await acRequest(
            `sites/${siteId}/stats/devices?type=switch`,
            'GET'
        );
        return { status: 'success', data };
    } catch (error) {
        console.error('apiGetSites failed!', error.message);
        return { status: 'error', error };
    }
};

export const acGetGoogleSSOAuthorizationUrl = async (cloudId, regionName) => {
    const URL = `login/oauth/google?forward=${encodeURIComponent(callbackUrl)}`;

    await msSetActiveCloud(cloudId);
    await msSetActiveRegionName(regionName);

    try {
        const data = await acRequest(URL, 'GET');

        const clientID = data.client_id;
        const authorizationUrl = data.authorization_url;

        return { status: 'success', authorizationUrl };
    } catch (error) {
        console.error('Error retrieving authorization details:', error);
        return { status: 'error', error };
    }
};

export const acLoginUserGoogleSSO = async (code) => {
    try {
        const data = await acRequest('login/oauth/google', 'POST', { code });

        const regions = await msGetRegions();
        const activeRegionName = await msGetActiveRegionName();
        const activeRegion = regions[activeRegionName];

        const url = activeRegion.apiBase;
        const cookies = await new Promise((resolve, reject) => {
            cookieJar.getCookies(url, (err, cookies) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(
                        cookies.map((cookie) => cookie.toString()).join('; ')
                    );
                }
            });
        });

        await msSetCookies(cookies);

        const selfData = await acUserSelf();
        return selfData;
    } catch (error) {
        console.error('User Google SSO login failed!', error.message);
        return { status: 'error', error };
    }
};
