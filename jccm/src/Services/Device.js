const { Client } = require('ssh2');
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
};

/**
 * Processes a list of commands on a remote SSH server and captures their outputs and errors.
 * @param {string[]} commands - Array of commands to be sent.
 * @param {object} sshConfig - SSH connection configuration.
 * @param {number} commandInactivityTimeout - Timeout in milliseconds for inactivity on regular commands.
 * @param {number} commitInactivityTimeout - Timeout in milliseconds for inactivity on commit commands.
 * @returns {Promise<object>} - A promise that resolves to an object with results.
 */
function processCommands(commands, sshConfig, commandInactivityTimeout = 3000, commitInactivityTimeout = 60000) {
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
                    const regex = /<rpc-reply[\s\S]*?<\/rpc-reply>/gi;
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

export const getDeviceFacts = async (address, port, username, password, timeout, upperSerialNumber = false) => {
    const commands = [
        'show system information',
        'show virtual-chassis',
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
        const results = await processCommands(commands, sshConfig);

        if (results.status === 'success') {
            console.log('Command executed successfully');

            const parser = new xml2js.Parser({ explicitArray: false }); // Consider setting explicitArray to false to simplify the structure
            const facts = {};
            let rpcReply;

            for (const result of results.data) {
                // console.log(`result: ${JSON.stringify(result, null, 2)}\n\n`);

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
                    // console.log(`rpc virtual-chassis-information reply: ${JSON.stringify(rpcReply, null, 2)}`);

                    const v = await parser.parseStringPromise(rpcReply);
                    const vcMembers = v['virtual-chassis-information']['member-list']['member'].map((member) => ({
                          model: member['member-model'],
                          serial: member['member-serial-number'],
                          slot: member['member-id'],
                          role: member['member-role'],
                      }))
        
                    facts.vc = vcMembers;
                }
            }

            // console.log(`>>>facts: ${JSON.stringify(facts, null, 2)}`);

            // Validate gathered facts
            const missingInfo = ['systemInformation'].filter(
                (info) => !facts[info]
            );

            if (missingInfo.length) {
                console.error(`Missing data: ${missingInfo.join(', ')}`);
                throw StatusErrorMessages.NO_RPC_REPLY;
            }

            facts.status = 'success';

            console.log('facts:', JSON.stringify(facts, null, 2));

            return facts;
        } else {
            console.error(`getDeviceFacts Error type 1: status: ${results.status} message: ${results.message}`);
            throw results;
        }
    } catch (error) {
        console.error(`getDeviceFacts Error message: "${error.message}"`);
        throw error; // Rethrow the error after logging it
    }
};

export const commitJunosSetConfig = async (address, port, username, password, config, readyTimeout = 10000) => {
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
        const results = await processCommands(commands, sshConfig);

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
            console.error(`getDeviceFacts Error type 1: status: ${results.status} message: ${results.message}`);
            throw results;
        }
    } catch (error) {
        console.error(`getDeviceFacts Error message: "${error.message}"`);
        throw error; // Rethrow the error after logging it
    }
};
