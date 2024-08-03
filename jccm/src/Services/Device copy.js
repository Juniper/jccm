import { NodeSSH } from 'node-ssh';
import xml2js from 'xml2js';

const StatusMessages = {
    SUCCESS: 'success',
    AUTHENTICATION_FAILED: 'authentication failed',
    UNREACHABLE: 'unreachable',
    TIMEOUT: 'timeout',
    COMMIT_FAILED: 'commit_failed',
    NO_RPC_REPLY: 'no_rpc_reply',
    INACTIVITY_TIMEOUT: 'inactivity_timeout',
};

const ErrorMessages = {
    AUTHENTICATION_FAILED: 'Authentication failed. Check your username and password.',
    TIMEOUT: 'Connection timed out',
    UNREACHABLE: 'Unable to connect to host',
    COMMIT_ERROR: 'Commit error',
    COMMIT_NO_SUCCESS: 'Commit did not return success',
    NO_RPC_REPLY: 'No RPC reply found in the response',
    INACTIVITY_TIMEOUT: 'Session closed due to inactivity',
};


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const executeJunosCommand = async (address, port, username, password, cmd, timeout = 5000) => {
    const command = `${cmd} | no-more`;
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: address,
            port: port,
            username: username,
            password: password,
            readyTimeout: timeout,
        });

        const result = await ssh.execCommand(command);

        if (result.stderr) {
            throw new Error(`executeJunosCommand Error: ${result.stderr}`);
        }

        return {
            status: StatusMessages.SUCCESS,
            message: 'Command executed successfully',
            data: result.stdout,
        };
    } catch (error) {
        let message = ErrorMessages.UNREACHABLE;
        let status = StatusMessages.UNREACHABLE;

        if (error.message.includes('All configured authentication methods failed')) {
            message = ErrorMessages.AUTHENTICATION_FAILED;
            status = StatusMessages.AUTHENTICATION_FAILED;
        } else if (error.message.includes('Timed out while waiting for handshake')) {
            message = ErrorMessages.TIMEOUT;
            status = StatusMessages.TIMEOUT;
        }

        // console.error('executeJunosCommand: error:', error);
        throw { status, message, data: error.message };
    } finally {
        ssh.dispose();
    }
};

export const getDeviceFacts = async (address, port, username, password, timeout, upperSerialNumber = false) => {
    const command = 'show system information | display xml';

    const result = await executeJunosCommand(address, port, username, password, command, timeout);

    if (result.status === 'success') {
        try {
            const parser = new xml2js.Parser();
            const parsedResult = await parser.parseStringPromise(result.data);
            const systemInformation = parsedResult['rpc-reply']['system-information'][0];

            const deviceFacts = {
                hardwareModel: systemInformation['hardware-model'][0],
                osName: systemInformation['os-name'][0],
                osVersion: systemInformation['os-version'][0],
                serialNumber: upperSerialNumber
                    ? systemInformation['serial-number'][0].toUpperCase()
                    : systemInformation['serial-number'][0],
                hostName: systemInformation['host-name'][0],
                status: 'success',
            };

            return deviceFacts;
        } catch (err) {
            console.log('getDeviceFacts: result: ', result);
            console.error('getDeviceFacts: Error parsing XML:', err);
            throw new Error('getDeviceFacts: Error parsing XML');
        }
    } else {
        throw result;
    }
};

export const commitJunosSetConfig = async (
    address,
    port,
    username,
    password,
    config,
    timeout = 60000,
    inactivityTimeout = 30000
) => {
    const command = `edit exclusive private\n${config}\ncommit | display xml\nexit\n\n\n`;
    console.log(`command:\n${command}`);

    let inactivityTimer;
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: address,
            port: port,
            username: username,
            password: password,
            readyTimeout: timeout,
            timeout: timeout,
        });

        const shell = await ssh.requestShell({
            cols: 2000, // Number of columns
            rows: 100, // Number of rows
        });
        let data = '';
        let stderr = '';

        const resetInactivityTimer = () => {
            if (inactivityTimer) {
                clearTimeout(inactivityTimer);
            }
            inactivityTimer = setTimeout(() => {
                shell.end();
                ssh.dispose();
                throw new Error(ErrorMessages.INACTIVITY_TIMEOUT);
            }, inactivityTimeout);
        };

        shell
            .on('data', (chunk) => {
                // console.log(chunk.toString());

                data += chunk.toString();
                resetInactivityTimer();
            })
            .stderr.on('data', (chunk) => {
                // console.log(chunk.toString());

                stderr += chunk.toString();
                resetInactivityTimer();
            });

        // shell.write(command);

        const sendCommandWithFlowControl = async (command) => {
            const buffer = Buffer.from(command);
            const chunkSize = 100;
            for (let i = 0; i < buffer.length; i += chunkSize) {
                const end = Math.min(i + chunkSize, buffer.length);
                const chunk = buffer.subarray(i, end); // Use subarray instead of slice
                shell.write(chunk);
                console.log(chunk.toString() + ' | '); // Ensure proper string conversion for logging
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        };

        await sendCommandWithFlowControl(command);


        resetInactivityTimer();
        shell.write('exit\n\n\n');

        await new Promise((resolve, reject) => {
            shell.on('close', (code, signal) => {
                clearTimeout(inactivityTimer);
                if (stderr) {
                    reject(new Error(stderr));
                } else {
                    resolve();
                }
            });

            shell.on('end', () => {
                resolve();
            });
        });

        const rpcReply = data.match(/<rpc-reply[\s\S]*?<\/rpc-reply>/);

        if (rpcReply) {
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(rpcReply[0]);

            const commitResults = result['rpc-reply']['commit-results'];
            if (commitResults) {
                const error = commitResults[0]['xnm:error'];
                if (error) {
                    const errorMessage = error[0].message[0].trim();
                    throw {
                        status: StatusMessages.COMMIT_FAILED,
                        message: ErrorMessages.COMMIT_ERROR,
                        data: errorMessage,
                    };
                }
            }

            if (rpcReply[0].includes('<commit-success/>')) {
                return {
                    status: StatusMessages.SUCCESS,
                    message: 'Configuration committed successfully',
                    data: rpcReply[0],
                };
            } else {
                throw {
                    status: StatusMessages.COMMIT_FAILED,
                    message: ErrorMessages.COMMIT_NO_SUCCESS,
                    data: rpcReply[0],
                };
            }
        } else {
            throw {
                status: StatusMessages.NO_RPC_REPLY,
                message: ErrorMessages.NO_RPC_REPLY,
                data: data,
            };
        }
    } catch (error) {
        let message = ErrorMessages.UNREACHABLE;
        let status = StatusMessages.UNREACHABLE;

        if (error.message.includes('All configured authentication methods failed')) {
            message = ErrorMessages.AUTHENTICATION_FAILED;
            status = StatusMessages.AUTHENTICATION_FAILED;
        } else if (error.message.includes('Timed out while waiting for handshake')) {
            message = ErrorMessages.TIMEOUT;
            status = StatusMessages.TIMEOUT;
        } else if (error.message === ErrorMessages.INACTIVITY_TIMEOUT) {
            status = StatusMessages.INACTIVITY_TIMEOUT;
            message = ErrorMessages.INACTIVITY_TIMEOUT;
        } else if (error.status) {
            throw error; // Re-throw custom errors
        }

        console.error('commitJunosSetConfig: error:', error);
        throw { status, message };
    } finally {
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
        }
        ssh.dispose();
    }
};
