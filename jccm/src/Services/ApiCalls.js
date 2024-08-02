import NodeCache from 'node-cache';
import originalFetch from 'node-fetch'; // Rename to avoid naming conflicts
import FetchCookie from 'fetch-cookie';
import { CookieJar } from 'tough-cookie';

const cookieJar = new CookieJar();
const fetch = FetchCookie(originalFetch, cookieJar); // Wraps node-fetch with cookie support

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
        throw new Error(
            `acRequest Request failed with status ${response.status}: ${JSON.stringify(errorData, null, 2)}`
        );
    }

    const cookiesData = response.headers.get('Set-Cookie');
    if (cookiesData) {
        const csrfToken = getCsrfToken(cookiesData);
        if (csrfToken) {
            await msSetToken(csrfToken);
        }
    }
    try {
        const responseData = await response.json(); // Consume the body here
        return responseData; // Return JSON data directly
    } catch (error) {
        throw new Error(`acRequest Request failed with status ${error}`);
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
        const accounts = data.accounts || [];

        if (accounts.length === 0) {
            const { protocol, host } = new URL(url);
            const site = `${protocol}//${host}`;
            accounts.push({ api_url: site, type: 'local' });
        }

        const envFiles = accounts.map((account) => {
            let url = account.api_url;
            url = (url.includes('mist.com') ? url.replace('https://api', 'https://manage') : url) + '/env.json';
            return url;
        });

        const environments = await apiGetCloudRegionEnv(envFiles);

        const regions = environments.reduce((regions, environment) => {
            regions[environment.name] = environment;
            return regions;
        }, {});

        await msSetRegions(regions);

        return { status: 'success', regions: Object.keys(regions) };
    } catch (error) {
        console.error('User lookup failed!', error.message);
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
                    resolve(cookies.map((cookie) => cookie.toString()).join('; '));
                }
            });
        });

        await msSetCookies(cookies);

        const selfData = await acUserSelf();
        return selfData;
    } catch (error) {
        console.error('User login failed!', error.message);
        return { status: 'error', error };
    }
};

export const acUserLogout = async () => {
    try {
        await acRequest('logout', 'POST');
        await msSetIsUserLoggedIn(false);
        await msSetToken(null);
        await msSetCookies(null);
        return { status: 'success' };
    } catch (error) {
        console.error('User logout failed!', error.message);
        return { status: 'error', error };
    }
};

export const acUserMFA = async (passcode) => {
    try {
        await acRequest('login/two_factor', 'POST', { two_factor: passcode });
        try {
            const selfData = await acUserSelf();
            return selfData;
        } catch (error) {
            console.error('User self failed!', error.message);
            return { status: 'error', error };
        }
    } catch (error) {
        console.error('User MFA failed!', error.message);
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
        console.error('User self failed!', error.message);
        await msSetIsUserLoggedIn(false);
        return { status: 'error', error };
    }
};

export const acGetCloudSites = async (orgId) => {
    const isLoggedIn = await msIsUserLoggedIn();
    if (!isLoggedIn) return { status: 'error', error: 'User is not logged in.' };

    try {
        const data = await acRequest(`orgs/${orgId}/sites`, 'GET');
        return { status: 'success', data };
    } catch (error) {
        console.error('apiGetSites failed!', error.message);
        return { status: 'error', error };
    }
};

export const acGetCloudInventory = async (orgId) => {
    const isLoggedIn = await msIsUserLoggedIn();
    if (!isLoggedIn) return { status: 'error', error: 'User is not logged in.' };

    try {
        const data = await acRequest(`orgs/${orgId}/inventory`, 'GET');
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
                    resolve(cookies.map((cookie) => cookie.toString()).join('; '));
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
