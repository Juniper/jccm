const { Client } = require('ssh2');
import { net } from 'electron';
import xml2js from 'xml2js';

const StatusErrorMessages = {
    SUCCESS: {
        status: 'success',
        message: 'Commands executed successfully',
    },
    AUTHENTICATION_FAILED: {
        status: 'Authentication failed',
        message: 'Authentication failed. Check your username and password.',
    },
    UNREACHABLE: {
        status: 'Unreachable',
        message: 'Unable to connect to host',
    },
    TIMEOUT: {
        status: 'Timeout',
        message: 'Connection timed out',
    },
    COMMIT_FAILED: {
        status: 'Commit failed',
        message: 'Commit error',
    },
    NO_RPC_REPLY: {
        status: 'No facts reply',
        message: 'No RPC reply found in the response',
    },
    INACTIVITY_TIMEOUT: {
        status: 'Inactivity timeout',
        message: 'Session closed due to inactivity',
    },
    SSH_CLIENT_ERROR: {
        status: 'SSH Client Error',
        message: '',
    },
};

/**
 * Processes a list of commands on a remote SSH server and captures their outputs and errors.
 * @param {string[]} commands - Array of commands to be sent.
 * @param {object} sshConfig - SSH connection configuration.
 * @param {number} commandInactivityTimeout - Timeout in milliseconds for inactivity on regular commands.
 * @param {number} commitInactivityTimeout - Timeout in milliseconds for inactivity on commit commands.
 * @returns {Promise<object>} - A promise that resolves to an object with results.
 */

const processCommands = async (
    commands,
    sshConfig,
    bastionHost = {},
    commandInactivityTimeout = 3000,
    commitInactivityTimeout = 60000
) => {
    try {
        if (bastionHost.active) {
            // console.log('run processCommands proxy');
            return await processCommandsProxy(
                commands,
                sshConfig,
                bastionHost,
                commandInactivityTimeout * 2,
                commitInactivityTimeout
            );
        } else {
            // console.log('run processCommands standalone');
            return await processCommandsStandalone(
                commands,
                sshConfig,
                commandInactivityTimeout,
                commitInactivityTimeout
            );
        }
    } catch (error) {
        throw error;
    }
};

function processCommandsStandalone(
    commands,
    sshConfig,
    commandInactivityTimeout = 5000,
    commitInactivityTimeout = 60000
) {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        let currentCommand = null;
        let eachCommandOutput = '';
        let allCommandsOutput = '';
        let timeoutHandle;
        let stream;

        const results = [];
        const promptPattern = /\n[\s\S]*?[@#>%$]\s$/;
        const resetTimeout = (timeout) => {
            clearTimeout(timeoutHandle);
            timeoutHandle = setTimeout(() => {
                stream.end();
                conn.end();
                reject({
                    ...StatusErrorMessages.INACTIVITY_TIMEOUT,
                    error: `CLI Inactivity timeout of ${timeout / 1000} seconds exceeded.`,
                });
            }, timeout);
        };

        const getCommand = () => {
            if (commands.length > 0) {
                const cmd = commands.shift();
                return cmd;
            } else {
                // console.log('>>>>>>>>> no more command....');
                stream.end();
                stream.close();
            }
        };

        const onDataReceived = (data) => {
            const output = data.toString();

            // process.stdout.write(output);

            eachCommandOutput += output;
            allCommandsOutput += output;

            resetTimeout(
                currentCommand && currentCommand.startsWith('commit')
                    ? commitInactivityTimeout
                    : commandInactivityTimeout
            );

            if (promptPattern.test(eachCommandOutput)) {
                eachCommandOutput = '';

                while (true) {
                    const cmd = getCommand();
                    if (cmd) {
                        if (cmd.startsWith('jcli-inactivity-timeout')) {
                            const parts = cmd.split(/\s+/);
                            const number = parseInt(parts[1], 10);
                            commandInactivityTimeout = number * 1000; // to ms
                            // console.log(`commandInactivityTimeout: ${commandInactivityTimeout} ms`);
                            continue;
                        } else if (cmd.startsWith('jedit-inactivity-timeout')) {
                            const parts = cmd.split(/\s+/);
                            const number = parseInt(parts[1], 10);
                            commitInactivityTimeout = number * 1000; // to ms
                            // console.log(`commitInactivityTimeout: ${commitInactivityTimeout} ms`);
                            continue;
                        } else {
                            if (cmd.startsWith('show') || cmd.startsWith('commit')) {
                                currentCommand = `${cmd} | display xml | no-more\n`;
                            } else {
                                currentCommand = `${cmd}\n`;
                            }
                            stream.write(currentCommand);
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
        };

        conn.on('ready', () => {
            const shellOptions = {
                cols: 2000, // Number of columns for the terminal
                rows: 80, // Number of rows for the terminal
            };

            conn.shell(shellOptions, (err, _stream) => {
                if (err) {
                    conn.end();
                    reject({
                        ...StatusErrorMessages.UNREACHABLE,
                        error: err.message,
                    });
                    return;
                }

                stream = _stream;

                resetTimeout(commandInactivityTimeout);

                stream.on('data', (data) => onDataReceived(data));
                stream.stderr.on('data', (data) => onDataReceived(data, true));
                stream.on('close', () => {
                    // const regex = /<rpc-reply[\s\S]*?<\/rpc-reply>/gi;
                    const regex = /^<rpc-reply[\s\S]*?<\/rpc-reply>$/gim;
                    let match;
                    while ((match = regex.exec(allCommandsOutput)) !== null) {
                        results.push(match[0]);
                    }
                    resolve({
                        ...StatusErrorMessages.SUCCESS,
                        data: results,
                    });
                    conn.end();
                    clearTimeout(timeoutHandle);
                });
            });
        });
        conn.on('error', (err) => {
            conn.end();
            if (err.level === 'client-authentication') {
                reject({
                    ...StatusErrorMessages.AUTHENTICATION_FAILED,
                    error: err.message,
                });
            } else if (err.level === 'client-timeout') {
                reject({
                    ...StatusErrorMessages.TIMEOUT,
                    error: err.message,
                });
            } else {
                reject({
                    ...StatusErrorMessages.UNREACHABLE,
                    error: err.message,
                });
            }
        }).connect(sshConfig);
    });
}

function processCommandsProxy(
    _commands,
    sshConfig,
    bastionHost,
    commandInactivityTimeout = 5000,
    commitInactivityTimeout = 60000,
    sshConnectTimeout = 5000
) {
    const commands = [..._commands];

    // console.log('processCommandsProxy bastionHost: ', bastionHost);
    // console.log('processCommandsProxy commands: ', commands);

    return new Promise((resolve, reject) => {
        const sshOptions = [
            '-o StrictHostKeyChecking=no',
            '-o ConnectTimeout=3',
            '-o NumberOfPasswordPrompts=1',
            '-o PreferredAuthentications=keyboard-interactive',
        ].join(' ');

        const linuxSSHCommand = `ssh -tt ${sshOptions} -p ${sshConfig.port} ${sshConfig.username}@${sshConfig.host}`;
        const junosSSHCommand = `start shell command "ssh -tt ${sshOptions} -p ${sshConfig.port} ${sshConfig.username}@${sshConfig.host}"`;

        const conn = new Client();

        let currentCommand = null;
        let eachCommandOutput = '';
        let allCommandsOutput = '';
        let timeoutHandle;
        let stream;
        let sshClientPasswordPass = false;
        let sshClientCommand = '';
        let sshClientError = false;
        let isJunosDeviceBastionHostFound = false;

        const results = [];
        const promptPattern = /\n[\s\S]*?[@#>%$]\s$/;
        const resetTimeout = (timeout) => {
            clearTimeout(timeoutHandle);
            timeoutHandle = setTimeout(() => {
                stream.end();
                conn.end();
                reject({
                    ...StatusErrorMessages.INACTIVITY_TIMEOUT,
                    message: `${StatusErrorMessages.INACTIVITY_TIMEOUT.message}`,
                });
            }, timeout);
        };

        const getCommand = () => {
            if (commands.length > 0) {
                const cmd = commands.shift();
                return cmd;
            } else {
                stream.end();
                stream.close();
            }
        };

        const onDataReceived = (data) => {
            const output = data.toString();

            // process.stdout.write(output);

            eachCommandOutput += output;
            allCommandsOutput += output;

            // Check for password prompt and send the password
            if (
                !sshClientPasswordPass &&
                currentCommand &&
                currentCommand.startsWith(sshClientCommand) &&
                eachCommandOutput.toLowerCase().includes('password:')
            ) {
                stream.write(`${sshConfig.password}\n`);
                sshClientPasswordPass = true;
            }

            if (currentCommand && currentCommand.startsWith(sshClientCommand)) {
                resetTimeout(sshConnectTimeout);
            } else if (currentCommand && currentCommand.startsWith('commit')) {
                resetTimeout(commitInactivityTimeout);
            } else {
                resetTimeout(commandInactivityTimeout);
            }

            // Check for a prompt in the command output
            if (promptPattern.test(eachCommandOutput)) {
                // Setup SSH command if it hasn't been set
                if (!sshClientCommand) {
                    if (
                        !isJunosDeviceBastionHostFound &&
                        eachCommandOutput.toLowerCase().includes('junos') &&
                        bastionHost.username !== 'root'
                    ) {
                        sshClientCommand = junosSSHCommand;
                        isJunosDeviceBastionHostFound = true;
                    } else {
                        sshClientCommand = linuxSSHCommand;
                    }
                    commands.unshift(sshClientCommand);
                }

                // Handle specific Junos errors
                if (isJunosDeviceBastionHostFound) {
                    const junosErrorPatterns = ['could not create child process', 'no more processes'];
                    const isErrorPresent = junosErrorPatterns.some((pattern) =>
                        eachCommandOutput.toLowerCase().includes(pattern)
                    );

                    if (isErrorPresent) {
                        terminateConnectionWithErrorMessage('Failed to execute the SSH client');
                        return; // Early exit to prevent further processing
                    }
                }

                // Process SSH error messages using a consolidated error handler
                processSSHErrorMessages(eachCommandOutput, sshConfig);

                // Reset command output buffer
                eachCommandOutput = '';

                // Process incoming commands
                processIncomingCommands();
            }

            // Function to handle the extraction and cleanup of error messages
            function processSSHErrorMessages(output, config) {
                const patterns = [
                    `^${config.username}@${config.host}: (.+)$`,
                    `^ssh: connect to host ${config.host} port ${config.port}: (.+)$`,
                    `^kex_exchange_identification: read: (.+)$`,
                ];

                patterns.forEach((pattern) => {
                    const regex = new RegExp(`${pattern}`, 'm');
                    const match = output.match(regex);

                    if (match && match[1]) {
                        const cleanedErrorMessage = match[1].replace(/\.$/, '');
                        terminateConnectionWithErrorMessage(cleanedErrorMessage);
                    }
                });
            }

            function terminateConnectionWithErrorMessage(message) {
                conn.end();
                clearTimeout(timeoutHandle);
                sshClientError = true;
                reject({
                    ...StatusErrorMessages.SSH_CLIENT_ERROR,
                    message: message,
                });
            }

            function processIncomingCommands() {
                while (true) {
                    const cmd = getCommand();
                    if (!cmd) break;

                    const parts = cmd.split(/\s+/);
                    const timeoutKeyword = parts[0].toLowerCase();
                    const number = parseInt(parts[1], 10);

                    switch (timeoutKeyword) {
                        case 'jcli-inactivity-timeout':
                            commandInactivityTimeout = number * 1000;
                            break;
                        case 'jedit-inactivity-timeout':
                            commitInactivityTimeout = number * 1000;
                            break;
                        default:
                            currentCommand =
                                cmd.startsWith('show') || cmd.startsWith('commit')
                                    ? `${cmd} | display xml | no-more\n`
                                    : `${cmd}\n`;
                            stream.write(currentCommand);
                            // console.log('>>> currentCommand:', currentCommand);
                            return;
                    }
                }
            }
        };

        conn.on('ready', () => {
            const shellOptions = {
                cols: 2000, // Number of columns for the terminal
                rows: 80, // Number of rows for the terminal
            };

            conn.shell(shellOptions, (err, _stream) => {
                if (err) {
                    conn.end();
                    reject({
                        ...StatusErrorMessages.UNREACHABLE,
                    });
                    return;
                }

                stream = _stream;

                resetTimeout(commandInactivityTimeout);

                stream.on('data', (data) => onDataReceived(data));

                stream.on('close', () => {
                    if (!sshClientError) {
                        // console.log('>>> all commands output:', allCommandsOutput);

                        // const regex = /<rpc-reply[\s\S]*?<\/rpc-reply>/gi;
                        const regex = /^<rpc-reply[\s\S]*?<\/rpc-reply>$/gim;

                        let match;
                        while ((match = regex.exec(allCommandsOutput)) !== null) {
                            results.push(match[0]);
                        }
                        resolve({
                            ...StatusErrorMessages.SUCCESS,
                            data: results,
                        });
                    }
                    conn.end();
                    clearTimeout(timeoutHandle);
                });
            });
        });
        conn.on('error', (err) => {
            conn.end();
            if (err.level === 'client-authentication') {
                reject({
                    ...StatusErrorMessages.AUTHENTICATION_FAILED,
                    message: `Bastion Host: ${StatusErrorMessages.AUTHENTICATION_FAILED.message}`,
                });
            } else if (err.level === 'client-timeout') {
                reject({
                    ...StatusErrorMessages.TIMEOUT,
                    message: `Bastion Host: ${StatusErrorMessages.TIMEOUT.message}`,
                });
            } else {
                reject({
                    ...StatusErrorMessages.UNREACHABLE,
                    message: `Bastion Host: ${StatusErrorMessages.UNREACHABLE.message}`,
                });
            }
        }).connect(bastionHost);
    });
}

const getRpcReply = (rpcName, result) => {
    // Escape any special characters in rpcName to safely include it in the regex
    const escapedRpcName = rpcName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Construct the regex pattern dynamically using the escaped rpcName variable
    const regex = new RegExp(`<${escapedRpcName}[\\s\\S]*?<\\/${escapedRpcName}>`, 'gi');

    const match = regex.exec(result);
    if (match !== null) {
        return match[0];
    }
    return null;
};

export const getDeviceFacts = async (
    address,
    port,
    username,
    password,
    timeout,
    upperSerialNumber = false,
    bastionHost = {}
) => {
    const commands = [
        'show system information',
        'show chassis hardware',
        'show virtual-chassis',
        'show route summary',
        `show route ${address}`,
        'exit',
    ];

    if (username === 'root') commands.unshift('cli');

    const sshConfig = {
        host: address,
        port,
        username,
        password,
        readyTimeout: timeout,
    };

    try {
        const results = await processCommands(commands, sshConfig, bastionHost);

        if (results.status === 'success') {
            // console.log('Command executed successfully');

            const parser = new xml2js.Parser({ explicitArray: false }); // Consider setting explicitArray to false to simplify the structure
            const facts = {};
            let rpcReply;

            for (const result of results.data) {
                rpcReply = getRpcReply('system-information', result);

                if (rpcReply !== null) {
                    // console.log(`rpc system-information reply: ${JSON.stringify(rpcReply, null, 2)}`);

                    const parsedData = await parser.parseStringPromise(rpcReply);
                    const info = parsedData['system-information'];

                    // console.log(`system-information: ${JSON.stringify(info, null, 2)}`);

                    facts.systemInformation = {
                        hardwareModel: info['hardware-model'],
                        osName: info['os-name'],
                        osVersion: info['os-version'],
                        serialNumber: upperSerialNumber ? info['serial-number'].toUpperCase() : info['serial-number'],
                        hostName: info['host-name'],
                    };
                }

                rpcReply = getRpcReply('chassis-mac-addresses', result);
                if (rpcReply !== null) {
                    // console.log(`rpc chassis-mac-addresses reply: ${JSON.stringify(rpcReply, null, 2)}`);

                    const parsedData = await parser.parseStringPromise(rpcReply);
                    const info = parsedData['chassis-mac-addresses'];

                    // console.log(`chassis-mac-addresses: ${JSON.stringify(info, null, 2)}`);

                    facts.chassisMacAddresses = info['mac-address-information'];
                }

                rpcReply = getRpcReply('chassis-inventory', result);
                if (rpcReply !== null) {
                    // console.log(`rpc chassis-inventory reply: ${JSON.stringify(rpcReply, null, 2)}`);

                    const parsedData = await parser.parseStringPromise(rpcReply);
                    const info = parsedData['chassis-inventory'];

                    facts.chassisInventory = info;
                }

                rpcReply = getRpcReply('virtual-chassis-information', result);
                if (rpcReply !== null) {
                    const v = await parser.parseStringPromise(rpcReply);

                    let members = v['virtual-chassis-information']['member-list']['member'];

                    // console.log(
                    //     `rpc virtual-chassis-information reply: ${JSON.stringify(
                    //         members,
                    //         null,
                    //         2
                    //     )}`
                    // );

                    // Normalize members to always be an array
                    if (!Array.isArray(members)) {
                        members = [members];
                    }

                    const vcMembers = members.map((member) => ({
                        model: member['member-model'],
                        serial: member['member-serial-number'],
                        slot: member['member-id'],
                        role: member['member-role'],
                    }));

                    facts.vc = vcMembers;
                }

                rpcReply = getRpcReply('route-summary-information', result);

                if (rpcReply !== null) {
                    const parsedData = await parser.parseStringPromise(rpcReply);
                    const info = parsedData['route-summary-information'];

                    facts.routeSummaryInformation = {
                        routerId: info['router-id'],
                    };
                }

                rpcReply = getRpcReply('route-information', result);

                if (rpcReply !== null) {
                    const parsedData = await parser.parseStringPromise(rpcReply);
                    let info = parsedData['route-information'];

                    // If info is an array, pick the first element
                    if (Array.isArray(info)) {
                        info = info[0];
                    }

                    // Safely handle route-table
                    let routeTable = info['route-table'];
                    if (Array.isArray(routeTable)) {
                        routeTable = routeTable[0];
                    }

                    // Safely handle rt
                    let rt = routeTable['rt'];
                    if (Array.isArray(rt)) {
                        rt = rt[0];
                    }

                    // Safely handle rt-entry
                    let rtEntry = rt['rt-entry'];
                    if (Array.isArray(rtEntry)) {
                        rtEntry = rtEntry[0];
                    }

                    // Safely handle nh
                    let nh = rtEntry['nh'];
                    if (Array.isArray(nh)) {
                        nh = nh[0];
                    }

                    const name = nh['nh-local-interface'] || nh['via'] || 'Unknown';
                    facts.interface = { name };
                }
            }

            // Validate gathered facts
            const missingInfo = ['systemInformation', 'chassisInventory'].filter((info) => !facts[info]);

            if (missingInfo.length) {
                console.error(`Missing data: ${missingInfo.join(', ')}`);
                throw {
                    ...StatusErrorMessages.SSH_CLIENT_ERROR,
                    message: `Rpc reply missing (${missingInfo.join(', ')})`,
                };
            }

            facts.status = 'success';

            return facts;
        } else {
            console.error(
                `getDeviceFacts Error(${address}:${port}) type 1: status: ${results.status} message: ${results.message}`
            );
            throw results;
        }
    } catch (error) {
        console.error(`getDeviceFacts Error(${address}:${port}): ${JSON.stringify(error)}`);
        throw error;
    }
};

export const commitJunosSetConfig = async (
    address,
    port,
    username,
    password,
    config,
    bastionHost = {},
    readyTimeout = 10000
) => {
    const configs = config
        .trim()
        .split(/\n/)
        .map((line) => line.trim());

    const commands = ['edit exclusive private', ...configs, 'commit', 'exit'];
    if (username === 'root') commands.unshift('cli');

    const sshConfig = {
        host: address,
        port,
        username,
        password,
        readyTimeout,
    };

    try {
        const results = await processCommands(commands, sshConfig, bastionHost);

        if (results.status === 'success') {
            let commitReply = null;
            let rpcReply;

            for (const result of results.data) {
                rpcReply = getRpcReply('commit-results', result);

                if (rpcReply !== null) {
                    // console.log(`rpc commit-results reply: ${rpcReply}`);
                    commitReply = rpcReply;
                }
            }

            if (commitReply && commitReply.includes('<commit-success/>')) {
                // console.log('>>>>>commit success');
                return {
                    status: 'success',
                    message: 'Configuration committed successfully',
                    data: commitReply,
                };
            }

            throw StatusErrorMessages.COMMIT_ERROR;
        } else {
            console.error(
                `commitJunosSetConfig Error(${address}:${port}) type 1: status: ${results.status} message: ${results.message}`
            );
            throw results;
        }
    } catch (error) {
        console.error(`commitJunosSetConfig Error(${address}:${port}): ${JSON.stringify(error)}`);
        throw error;
    }
};

export const getDeviceNetworkCondition = async (
    address,
    port,
    username,
    password,
    timeout,
    bastionHost = {},
    termServer = 'oc-term.mistsys.net',
    termPort = 2200
) => {
    const commands = [
        `start shell sh command "printf '<rpc-reply>\\n<curl-output>\\n\\n'; printf '\\n' | curl -v telnet://${termServer}:${termPort} --connect-timeout 3 --max-time 3; printf '\\n\\n</curl-output>\\n</rpc-reply>\\n'"`,
        'exit',
    ];

    if (username === 'root') commands.unshift('cli');

    const sshConfig = {
        host: address,
        port,
        username,
        password,
        readyTimeout: timeout,
    };

    try {
        const results = await processCommands(commands, sshConfig, bastionHost, 5000);

        if (results.status === 'success') {
            const parser = new xml2js.Parser({ explicitArray: false }); // Consider setting explicitArray to false to simplify the structure
            const networkCondition = {
                dns: false,
                access: false,
                route: false,
                message: '',
            };
            let rpcReply;

            for (const result of results.data) {
                rpcReply = getRpcReply('curl-output', result);

                if (rpcReply !== null) {
                    if (rpcReply.includes('* Connected to')) {
                        networkCondition.message = `Connection to ${termServer}:${termPort} verified successfully.`;
                        networkCondition.dns = true;
                        networkCondition.access = true;
                        networkCondition.route = true;
                    } else if (rpcReply.includes('* Could not resolve host')) {
                        networkCondition.message = `DNS resolution failed for ${termServer}.`;
                        networkCondition.dns = false;
                        networkCondition.access = false;
                        networkCondition.route = false;
                    } else if (rpcReply.includes('* Connection timed out')) {
                        networkCondition.message = `Access to ${termServer}:${termPort} timed out.`;
                        networkCondition.dns = true;
                        networkCondition.access = false;
                        networkCondition.route = true;
                    } else if (rpcReply.includes('No route to host')) {
                        networkCondition.message = `No route to host: ${termServer}.`;
                        networkCondition.dns = true;
                        networkCondition.access = false;
                        networkCondition.route = false;
                    } else if (rpcReply.includes('Operation not permitted')) {
                        networkCondition.message = `Access to ${termServer}:${termPort} was refused.`;
                        networkCondition.dns = true;
                        networkCondition.access = false;
                        networkCondition.route = true;
                    } else {
                        networkCondition.message = `Unknown network issue for ${termServer}:${termPort}.`;
                        networkCondition.dns = true;
                        networkCondition.access = false;
                        networkCondition.route = true;
                    }
                }
            }

            return networkCondition;
        } else {
            console.error(
                `getDeviceNetworkCondition Error(${address}:${port}) type 1: status: ${results.status} message: ${results.message}`
            );
            throw results;
        }
    } catch (error) {
        console.error(`getDeviceNetworkCondition Error(${address}:${port}): ${JSON.stringify(error)}`);
        throw error;
    }
};
