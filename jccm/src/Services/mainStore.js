import { app } from 'electron';
import path from 'path';
import Datastore from 'nedb-promises';
import { getActiveThemeName } from '../Frontend/Common/CommonVariables';
import { isBase64 } from 'validator'; // You might need to install the 'validator' package
import crypto from 'crypto';

// Define the path to the database file
const dbPath = path.join(app.getPath('userData'), 'sessionDB.db');
const db = Datastore.create({ filename: dbPath, autoload: true });

const sessionKey = 'session';
const cloudInventoryKey = 'cloudInventory';
const localInventoryKey = 'localInventory';
const deviceFactsKey = 'deviceFacts';
const subnetsKey = 'subnets';
const settingsKey = 'settings';

// Constants for encryption
const uniqueIdentifier = 'jccm@juniper.net';
const vaultKey = 'vault-data'; // Database key for the vault
const salt = 'fixed-salt'; // Use a consistent salt
const iterations = 1000;
const keyLength = 32; // 256-bit key

// Derive encryption key using PBKDF2
const deriveKey = (identifier) => {
    return crypto.pbkdf2Sync(identifier, salt, iterations, keyLength, 'sha256');
};

// Encrypt function
const encrypt = (text) => {
    const key = deriveKey(uniqueIdentifier);
    const iv = crypto.randomBytes(16); // Random IV for each encryption
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return {
        encryptedData: encrypted,
        iv: iv.toString('base64'), // Base64 encode the IV
    };
};

// Decrypt function
const decrypt = (encryptedData, ivBase64) => {
    const key = deriveKey(uniqueIdentifier);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivBase64, 'base64'));
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

/**
 * Function to remove all data from the database and compact the datafile.
 * @returns {Promise<void>} Resolves when the data is removed and the file is compacted.
 */
export const clearAndCompactDatabase = async () => {
    try {
        console.log('Removing all data from the database...');

        // Remove all documents from the database
        const numRemoved = await db.remove({}, { multi: true });
        console.log(`${numRemoved} documents removed from the database.`);

        // Compact the datafile
        await compactDatabase();
        console.log('Database compacted successfully.');
    } catch (error) {
        console.error('Error clearing and compacting the database:', error);
    }
};

/**
 * Function to compact the database file.
 */
const compactDatabase = () => {
    return new Promise((resolve, reject) => {
        try {
            db.compactDatafile();
            resolve();
        } catch (error) {
            reject(error);
        }
    });
};

const encodeToBase64 = (obj) => {
    return Buffer.from(JSON.stringify(obj)).toString('base64');
};

const decodeFromBase64 = (str) => {
    return JSON.parse(Buffer.from(str, 'base64').toString());
};

// Function to get the session
const getSession = async () => {
    let session = await db.findOne({ _id: sessionKey });
    if (!session) {
        session = {
            _id: sessionKey,
            token: undefined,
            cookies: undefined,
            cloudId: undefined,
            regions: undefined,
            activeRegion: undefined,
            userEmail: undefined,
            isUserLoggedIn: false,
            theme: getActiveThemeName('default'),
            cloudOrgs: {},
            orgFilter: {},
            subnets: [],
        };
        await db.insert(session);
    }
    return session;
};

// Replace Keyv functions with NeDB equivalents
export const msSetToken = async (token) => {
    const session = await getSession();
    session.token = token;
    await db.update({ _id: sessionKey }, session);
};

export const msGetToken = async () => {
    const session = await getSession();
    return session.token;
};

export const msSetActiveCloud = async (cloudId) => {
    const session = await getSession();
    session.cloudId = cloudId;
    await db.update({ _id: sessionKey }, session);
};

export const msGetActiveCloud = async () => {
    const session = await getSession();
    return session.cloudId;
};

export const msSetRegions = async (regions) => {
    const session = await getSession();
    session.regions = JSON.stringify(regions);
    await db.update({ _id: sessionKey }, session);
};

export const msGetRegions = async () => {
    const session = await getSession();
    if (session.regions) {
        return JSON.parse(session.regions);
    }
    return undefined;
};

export const msSetActiveRegionName = async (region) => {
    const session = await getSession();
    session.activeRegion = region;
    await db.update({ _id: sessionKey }, session);
};

export const msGetActiveRegionName = async () => {
    const session = await getSession();
    return session.activeRegion;
};

export const msIsUserLoggedIn = async () => {
    const session = await getSession();
    return session.isUserLoggedIn;
};

export const msSetUserEmail = async (userEmail) => {
    const session = await getSession();
    session.userEmail = userEmail;
    await db.update({ _id: sessionKey }, session);
};

export const msGetUserEmail = async () => {
    const session = await getSession();
    return session.userEmail;
};

export const msSetIsUserLoggedIn = async (flag) => {
    const session = await getSession();
    session.isUserLoggedIn = flag;
    await db.update({ _id: sessionKey }, session);
};

export const msSetCookies = async (cookies) => {
    const session = await getSession();
    session.cookies = cookies;
    await db.update({ _id: sessionKey }, session);
};

export const msGetCookies = async () => {
    const session = await getSession();
    return session.cookies;
};

export const msSetTheme = async (theme) => {
    const session = await getSession();
    session.theme = theme;
    await db.update({ _id: sessionKey }, session);
};

export const msGetTheme = async () => {
    const session = await getSession();
    return session.theme || getActiveThemeName('default');
};

export const msSetCloudOrgs = async (orgs) => {
    const session = await getSession();
    const encodedOrgs = encodeToBase64(orgs);
    session.cloudOrgs = encodedOrgs;
    await db.update({ _id: sessionKey }, session);
};

export const msGetCloudOrgs = async () => {
    const session = await getSession();
    if (session.cloudOrgs && typeof session.cloudOrgs === 'string') {
        return decodeFromBase64(session.cloudOrgs);
    }
    return {};
};

export const msSetCloudInventory = async (inventory) => {
    const encodedInventory = encodeToBase64(inventory);
    await db.update({ _id: cloudInventoryKey }, { _id: cloudInventoryKey, data: encodedInventory }, { upsert: true });
};

export const msGetCloudInventory = async () => {
    const doc = await db.findOne({ _id: cloudInventoryKey });
    if (doc && typeof doc.data === 'string') {
        return decodeFromBase64(doc.data);
    }
    return [];
};

export const msGetOrgFilter = async () => {
    const session = await getSession();
    return session.orgFilter;
};

export const msSetOrgFilter = async (orgFilter) => {
    const session = await getSession();
    session.orgFilter = orgFilter;
    await db.update({ _id: sessionKey }, session);
};

export const msSetLocalInventory = async (inventory) => {
    const encodedInventory = encodeToBase64(inventory);

    await db.update(
        { _id: localInventoryKey },
        { $set: { data: encodedInventory } }, // Use $set to ensure the data field is replaced, not merged
        { upsert: true }
    );
};

export const msGetLocalInventory = async () => {
    const doc = await db.findOne({ _id: localInventoryKey });

    if (doc && doc.data) {
        if (typeof doc.data === 'string') {
            // Check if the data is a Base64 encoded string
            if (isBase64(doc.data)) {
                return decodeFromBase64(doc.data);
            }
        } else {
            // Data is presumably already an object or array
            return doc.data;
        }
    }
    return [];
};

export const msSaveDeviceFacts = async (facts) => {
    const encodedFacts = encodeToBase64(facts);
    await db.update({ _id: deviceFactsKey }, { _id: deviceFactsKey, data: encodedFacts }, { upsert: true });
};

export const msLoadDeviceFacts = async () => {
    const doc = await db.findOne({ _id: deviceFactsKey });
    if (doc && typeof doc.data === 'string') {
        return decodeFromBase64(doc.data);
    }
    return [];
};

export const msSaveSubnets = async (subnets) => {
    const encodedSubnets = encodeToBase64(subnets);
    await db.update({ _id: subnetsKey }, { _id: subnetsKey, data: encodedSubnets }, { upsert: true });
};

export const msLoadSubnets = async () => {
    const doc = await db.findOne({ _id: subnetsKey });
    if (doc && typeof doc.data === 'string') {
        return decodeFromBase64(doc.data);
    }
    return [];
};

export const msSaveSettings = async (settings) => {
    const encodedSettings = encodeToBase64(settings);
    await db.update({ _id: settingsKey }, { _id: settingsKey, data: encodedSettings }, { upsert: true });
};

export const msLoadSettings = async () => {
    const doc = await db.findOne({ _id: settingsKey });
    if (doc && typeof doc.data === 'string') {
        return decodeFromBase64(doc.data);
    }
    return [];
};

// Save Vault
export const msSaveVault = async (vault) => {
    const vaultString = JSON.stringify(vault); // Serialize the vault
    const { encryptedData, iv } = encrypt(vaultString); // Encrypt the vault data
    const encodedVault = Buffer.from(JSON.stringify({ encryptedData, iv })).toString('base64'); // Base64 encode

    await db.update({ _id: vaultKey }, { _id: vaultKey, data: encodedVault }, { upsert: true });
};

// Load Vault
export const msLoadVault = async () => {
    const doc = await db.findOne({ _id: vaultKey });

    if (doc && typeof doc.data === 'string') {
        const decodedData = JSON.parse(Buffer.from(doc.data, 'base64').toString('utf8')); // Decode from base64
        const decryptedVault = decrypt(decodedData.encryptedData, decodedData.iv); // Decrypt the data
        return JSON.parse(decryptedVault); // Parse the decrypted JSON
    }

    return []; // Return an empty array if no vault is found
};
