import { ipcMain } from 'electron';
import { Client } from 'ssh2';
import xml2js from 'xml2js';

import { msGetLocalInventory, msLoadSettings, msLoadVault } from './mainStore.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const plainText = (text) => text.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');

const configTrackingSessions = {};

class Queue {
    constructor() {
        this.items = [];
        this.pendingResolvers = [];
    }

    push(data) {
        if (this.pendingResolvers.length > 0) {
            const resolve = this.pendingResolvers.shift();
            resolve(data);
        } else {
            this.items.push(data);
        }
    }

    async pop() {
        if (this.items.length > 0) {
            return this.items.shift();
        }

        return new Promise((resolve) => {
            this.pendingResolvers.push(resolve);
        });
    }

    clear() {
        this.items = [];
        this.pendingResolvers.forEach((resolve) => resolve('__QUEUE_CLEARED__')); // Use a sentinel value
        this.pendingResolvers = [];
    }
    isEmpty() {
        return this.items.length === 0 && this.pendingResolvers.length === 0;
    }
}

class NetconfSession {
    constructor(
        host,
        port,
        username,
        password,
        bastionHost = '',
        bastionPort = 0,
        bastionUsername = '',
        bastionPassword = '',
        useProxy = false
    ) {
        this.isUsingProxy = useProxy;
        const isBastionValid = bastionHost && bastionPort > 0 && bastionUsername && bastionPassword;

        if (useProxy && !isBastionValid) {
            throw new Error(
                'Invalid bastion configuration: all bastion parameters must be provided if proxy is enabled.'
            );
        }

        if (useProxy) {
            this.connHost = bastionHost;
            this.connPort = bastionPort;
            this.connUsername = bastionUsername;
            this.connPassword = bastionPassword;
        } else {
            this.connHost = host;
            this.connPort = port;
            this.connUsername = username;
            this.connPassword = password;
        }

        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;

        this.bastionHost = bastionHost;
        this.bastionPort = bastionPort;
        this.bastionUsername = bastionUsername;
        this.bastionPassword = bastionPassword;

        this.conn = null;
        this.stream = null;
        this.requestQueue = new Queue();
        this.replyQueue = new Queue();
        this.sessionOpened = false;
        this.incomingBuffer = '';

        this.SHELL_PROMPT_PATTERN = /\n[\s\S]*?[@#>%$]\s$/;
        this.PASSWORD_INPUT_PATTERN = /password:/i;
        this.CONNECTION_CHECKING_PATTERN = new RegExp(
            [
                `${this.username}@${this.host}:`, // Matches "<username>@<host>:"
                `ssh: connect to host ${this.host} port ${this.port}:`, // Matches SSH connection errors
                `Permission denied`, // Matches authentication failures
                `Unable to negotiate with ${this.host} port ${this.port}:`, // Matches SSH connection errors
                `password:`, // Matches password prompts
                `\\n[\\s\\S]*?[@#>%$]\\s$`, // Matches shell prompt pattern
            ].join('|'), // Combine patterns using "OR" operator
            'i' // Case-insensitive flag
        );
        this.HELLO_PATTERN = /<hello[\s\S]*?<\/hello>/;
        this.REPLY_END = /]]>]]>/;

        this.PROMPT_PATTERN = this.SHELL_PROMPT_PATTERN;
    }
    async startSession() {
        this.conn = new Client();
        this.buffer = '';

        return new Promise((resolve, reject) => {
            this.conn.on('ready', () => {
                this.conn.shell({ cols: 2000, rows: 1000 }, (err, stream) => {
                    if (err) {
                        this.cleanupSession().catch(console.error);
                        return reject(new Error(`Failed to start shell: ${err.message}`));
                    }

                    this.stream = stream;
                    this.sessionOpened = true;

                    this.stream.on('data', this.handleData.bind(this));
                    this.stream.on('error', (err) => {
                        reject(err);
                    });

                    this.initializeSession()
                        .then(resolve)
                        .catch((error) => {
                            this.cleanupSession().catch(console.error);
                            reject(error);
                        });
                });
            });

            this.conn.on('error', (err) => {
                this.cleanupSession().catch(console.error);
                reject(err);
            });

            this.conn.on('close', () => {
                this.cleanupSession().catch(console.error);
            });

            this.conn.connect({
                host: this.connHost,
                port: this.connPort,
                username: this.connUsername,
                password: this.connPassword,
                readyTimeout: 5000,
                timeout: 5000,
                poll: 10,
                keepaliveInterval: 10000,
                keepaliveCountMax: 3,
            });
        });
    }

    handleData(data) {
        this.buffer += data.toString();
        // process.stdout.write(data);

        try {
            if (this.PROMPT_PATTERN.test(this.buffer)) {
                this.replyQueue.push(this.buffer);
                this.buffer = '';
            }
        } catch (error) {
            console.error('>>>> Error:', error.message);
        }
    }

    async getData() {
        while (true) {
            const reply = await this.replyQueue.pop();
            if (reply === '__QUEUE_CLEARED__') {
                continue;
            }
            return reply;
        }
    }

    async initializeSession() {
        this.PROMPT_PATTERN = this.SHELL_PROMPT_PATTERN;
        await this.getData(); // wait until the shell prompt is received

        try {
            if (this.isUsingProxy) {
                await this.connectDevice(this.host, this.port, this.username, this.password);
            }

            await this.runServer();

            this.processQueue().catch(console.error);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async connectDevice(host, port, username, password) {
        this.PROMPT_PATTERN = this.CONNECTION_CHECKING_PATTERN;

        try {
            const sshOptions = [
                '-o StrictHostKeyChecking=no',
                '-o ConnectTimeout=3',
                '-o NumberOfPasswordPrompts=1',
                '-o PreferredAuthentications=keyboard-interactive',
            ].join(' ');

            const command = `ssh -tt ${sshOptions} -p ${port} ${username}@${host};exit`;
            this.stream.write(command + '\n');

            await this.waitForPasswordInput();
            await this.verifyPasswordPass();
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async waitForPasswordInput() {
        this.PROMPT_PATTERN = this.CONNECTION_CHECKING_PATTERN;

        let isPasswordInputReady = false;

        return new Promise((resolve, reject) => {
            // Capture the reject function for use in setTimeout
            const passwordInputDetectTimeout = setTimeout(() => {
                if (!isPasswordInputReady) {
                    clearTimeout(passwordInputDetectTimeout); // Ensure no redundant timeouts
                    reject(new Error('Password input not received within timeout.'));
                }
            }, 5000);

            const checkQueue = async () => {
                try {
                    while (!isPasswordInputReady) {
                        const response = await this.getData();

                        if (this.PASSWORD_INPUT_PATTERN.test(response)) {
                            isPasswordInputReady = true;
                            clearTimeout(passwordInputDetectTimeout);
                            this.stream.write(this.password + '\n');
                            resolve(); // Resolve the promise
                        } else {
                            // Check for error messages and remove escape control characters from the response before rejecting.
                            let v = response?.trim().replace(/\r/g, '').split('\n').at(-1);
                            v = plainText(v);
                            reject(new Error(v));
                        }
                    }
                } catch (error) {
                    clearTimeout(passwordInputDetectTimeout);
                    reject(new Error(`Error while waiting for password input: ${error.message}`));
                }
            };

            checkQueue().catch(reject); // Propagate errors from checkQueue
        });
    }

    async verifyPasswordPass() {
        this.PROMPT_PATTERN = this.CONNECTION_CHECKING_PATTERN;

        try {
            const response = await this.getData();

            if (!this.SHELL_PROMPT_PATTERN.test(response)) {
                throw new Error(response);
            }
        } catch (error) {
            throw new Error(`Failed to verify password: ${error.message}`);
        }
    }

    async runServer() {
        this.PROMPT_PATTERN = this.SHELL_PROMPT_PATTERN;
        this.stream.write('cli\n');
        await this.getData();
        await sleep(500);

        this.PROMPT_PATTERN = this.REPLY_END;
        this.stream.write('start shell command netconf\n');
        await sleep(500);

        await this.waitForHello();
    }

    async waitForHello() {
        this.PROMPT_PATTERN = this.REPLY_END;

        try {
            const response = await Promise.race([
                this.getData(), // Wait for hello data
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('NETCONF hello not received within timeout.')), 5000)
                ), // Timeout after 5 seconds
            ]);

            if (this.HELLO_PATTERN.test(response)) {
                return;
            } else {
                throw new Error('NETCONF hello not received.');
            }
        } catch (error) {
            throw new Error(`Failed to wait for hello: ${error.message}`);
        }
    }

    async sendRpc(command) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ command: `<rpc>${command}</rpc>`, resolve, reject });
        });
    }

    async processQueue() {
        this.PROMPT_PATTERN = this.REPLY_END;

        while (this.sessionOpened) {
            const request = await this.requestQueue.pop(); // Wait for next request

            if (!request || request === '__QUEUE_CLEARED__') {
                continue;
            }

            const { command, resolve, reject } = request;

            try {
                this.stream.write(command + '\n');
                const reply = await this.getData(); // Wait for response

                resolve(reply);
            } catch (error) {
                reject(error);
            }
        }
    }

    async cleanupSession() {
        try {
            if (this.stream && this.sessionOpened) {
                this.stream.write('<rpc><close-session/></rpc>\n');
                await sleep(100);
            }
        } catch (err) {
            console.error(`${id}: Error during session cleanup:`, err.message);
        } finally {
            if (this.conn) this.conn.end();

            if (this.stream) this.stream.removeAllListeners('data');

            this.stream = null;
            this.sessionOpened = false;
            this.requestQueue.clear();
            this.replyQueue.clear();
            this.buffer = '';
        }
    }
}

const parser = new xml2js.Parser({
    explicitArray: false, // Avoid wrapping values in arrays
    explicitChildren: false, // Do not include children under '_'
    preserveChildrenOrder: true, // Maintain the XML structure order
    mergeAttrs: true, // Merge attributes into the same object
});

const getRpcReply = (rpcName, data) => {
    // Escape any special characters in rpcName to safely include it in the regex
    const escapedRpcName = rpcName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Construct the regex pattern dynamically using the escaped rpcName variable
    const regex = new RegExp(`<${escapedRpcName}[\\s\\S]*?<\\/${escapedRpcName}>`, 'gi');
    const match = regex.exec(data);
    if (match !== null) {
        return match[0];
    }
    return null;
};

export const setupApiConfigTrackingHandlers = () => {
    ipcMain.on('openConfigTracking', async (event, id) => {
        console.log(`${id}: openConfigTracking`);

        const inventory = await msGetLocalInventory();
        const settings = await msLoadSettings();

        const bastionHost = settings?.bastionHost || {};

        const found = inventory.filter(
            ({ organization, site, address, port }) => id === `/Inventory/${organization}/${site}/${address}/${port}`
        );
        if (found.length === 0) {
            console.error('Config tracking: no device found: path id: ', id);
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

        const { address, port, username, password } = device;
        const {
            host: bastionAddress,
            port: bastionPort,
            username: bastionUsername,
            password: bastionPassword,
        } = bastionHost;

        let session;
        try {
            session = new NetconfSession(
                address,
                port,
                username,
                password,
                bastionAddress,
                bastionPort,
                bastionUsername,
                bastionPassword,
                bastionHost?.active
            );

            await session.startSession();
            console.log(`${id}: NETCONF session started.`);

            configTrackingSessions[id] = { session, isVisible: true };
            event.reply(`onConfigTracking-${id}`, { event: 'open', data: { id, address } });

            let previousConfigTimestamp = '';

            const getLastChangedTimestamp = async () => {
                try {
                    const rpc = `
                        <get-configuration database="candidate" format="text">
                            <configuration>
                                <version/>
                            </configuration>
                        </get-configuration>
                    `;
                    const text = await session.sendRpc(rpc);

                    // Extract the timestamp using regex
                    const match = text.match(/## Last changed:\s+(.+)/);
                    if (match && match[1]) {
                        return match[1].trim();
                    } else {
                        console.warn('No "Last changed" timestamp found in the configuration.');
                        return '';
                    }
                } catch (error) {
                    console.error('Failed to retrieve configuration timestamp:', error.message);
                    shouldContinue = false; // Stop polling on error
                    throw error; // Re-throw the error to ensure proper handling
                }
            };

            const checkConfigChange = async () => {
                try {
                    const currentTimestamp = await getLastChangedTimestamp();

                    if (currentTimestamp === previousConfigTimestamp) {
                        return false; // No change detected
                    }
                    previousConfigTimestamp = currentTimestamp;
                    return true; // Change detected
                } catch (error) {
                    console.error(`${id}: Error retrieving config:`, error.message);
                    throw new Error(`Error in checkConfigChange: ${error.message}`); // Propagate the error
                }
            };

            const sendConfig = async () => {
                const rpcGetConfig = '<get-configuration format="text" database="candidate"/>';
                const rpcGetSetConfig = '<get-configuration format="set" database="candidate"/>';

                let configText = '';
                let configSet = '';

                try {
                    const response = await session.sendRpc(rpcGetConfig);
                    const rpcReply = getRpcReply('configuration-text', response);
                    if (rpcReply !== null) {
                        const parsedData = await parser.parseStringPromise(rpcReply);
                        configText = parsedData?.['configuration-text']?._ ?? '';
                        configText = configText.trim();
                        configText = configText.replace(/\r\n/g, '\n');
                    }
                } catch (error) {
                    console.error(`${id}: Error retrieving config:`, error.message);
                    throw new Error(`Error in sendConfig: ${error.message}`); // Propagate the error
                }

                try {
                    const response = await session.sendRpc(rpcGetSetConfig);
                    const rpcReply = getRpcReply('configuration-set', response);
                    if (rpcReply !== null) {
                        const parsedData = await parser.parseStringPromise(rpcReply);
                        configSet = parsedData?.['configuration-set']?._ ?? '';
                        configSet = configSet.trim();
                        configSet = configSet.replace(/\r\n/g, '\n');
                    }
                } catch (error) {
                    console.error(`${id}: Error retrieving config:`, error.message);
                    throw new Error(`Error in sendConfig: ${error.message}`); // Propagate the error
                }

                if (configText?.length > 0 && configSet?.length > 0) {
                    event.reply(`onConfigTracking-${id}`, {
                        event: 'config',
                        data: { id, configText, configSet },
                    });
                } else {
                    console.error(`${id}: Empty config output.`);
                }
            };

            while (configTrackingSessions[id]) {
                if (configTrackingSessions[id]?.isVisible) {
                    // console.log(`${id}: Checking for config changes...`);

                    const isChanged = await checkConfigChange();
                    if (isChanged) {
                        console.log(`${id}: Config changed.`);
                        await sendConfig();
                    }
                }
                await sleep(5000);
            }
        } catch (error) {
            event.reply(`onConfigTracking-${id}`, { event: 'error', data: { id, message: error.message } });
            console.error(`${id}: Error creating Netconf Session:`, error.message);
        } finally {
            session.cleanupSession().catch(console.error);
            event.reply(`onConfigTracking-${id}`, { event: 'close', data: { id } });
        }
    });

    ipcMain.handle('rpcRequestConfigTracking', async (event, args) => {
        const { id, rpc } = args;

        // console.log(`${id}: rpcRequestConfigTracking rpc:`, rpc);

        if (!configTrackingSessions[id]) {
            console.error('Config tracking session not found:', id);
            return null;
        }

        const { session } = configTrackingSessions[id];
        try {
            const response = await session.sendRpc(rpc);
            return response;
        } catch (error) {
            console.error(`${id} rpc: ${rpc.replace('\n', ' ')} reply error:`, rpc, error.message);
            return { error: error.message };
        }
    });

    ipcMain.on('closeConfigTracking', (event, id) => {
        console.log(`${id}: closeConfigTracking`);

        if (configTrackingSessions[id]) {
            configTrackingSessions[id]?.session.cleanupSession();
            delete configTrackingSessions[id];
        }
    });

    ipcMain.on('isVisibleConfigTracking', (event, id, isVisible) => {
        console.log(`${id}: isVisibleConfigTracking`, isVisible);
        if (configTrackingSessions[id]) {
            configTrackingSessions[id].isVisible = isVisible;
        }
    });
};
