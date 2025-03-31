import { Client } from 'ssh2';
import { EventEmitter } from 'events';
import { startCli } from './JCli.js';
import { startNetconf } from './JNetconf.js';
import { startCapture } from './JTcpdump.js';
import { startScp } from './JScp.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createSshSession = async (targetHost, jumpHost = null) => {
    const events = new EventEmitter();
    const jumpServer = jumpHost ? new Client() : null;
    const targetServer = new Client();
    const sessionState = {
        jumpConnected: false,
        targetConnected: false,
        jumpConnection: null,
        targetConnection: null,
    };

    const connectToTarget = (stream = null) => {
        targetServer
            .on('ready', async () => {
                sessionState.targetConnection = targetServer;
                sessionState.targetConnected = true;
                events.emit('target-ready', 'Target server connected.');
            })
            .on('error', (err) => {
                sessionState.targetConnected = false;
                sessionState.targetConnection = null;
                events.emit('target-error', new Error(`Target error: ${err.message}`));
            })
            .on('end', () => {
                sessionState.targetConnected = false;
                sessionState.targetConnection = null;
                events.emit('target-closed', 'Target server disconnected.');
            })
            .connect(stream ? { ...targetHost, sock: stream } : targetHost);
    };

    if (jumpHost) {
        jumpServer
            .on('ready', () => {
                sessionState.jumpConnection = jumpServer;
                sessionState.jumpConnected = true;
                events.emit('jump-ready', 'Jump server connected.');
                jumpServer.forwardOut('127.0.0.1', 12345, targetHost.host, targetHost.port, (err, stream) => {
                    if (err) {
                        events.emit('jump-error', new Error(`Forwarding failed: ${err.message}`));
                        jumpServer.end();
                        return;
                    }

                    events.emit('forward-ready', 'Forwarding established.');
                    connectToTarget(stream);
                });
            })
            .on('error', (err) => {
                sessionState.jumpConnected = false;
                sessionState.jumpConnection = null;
                events.emit('jump-error', new Error(`Jump error: ${err.message}`));
            })
            .on('end', () => {
                sessionState.jumpConnected = false;
                sessionState.jumpConnection = null;
                events.emit('jump-closed', 'Jump server disconnected.');
            })
            .connect(jumpHost);
    } else {
        connectToTarget();
    }

    events.close = () => {
        if (targetServer && !targetServer.destroyed) {
            console.log('Closing target server connection...');
            targetServer.end();
        }
        if (jumpServer && !jumpServer.destroyed) {
            console.log('Closing jump server connection...');
            jumpServer.end();
        }
        
        events.emit('closed', 'All connections closed.');
        console.log('All connections closed.');
    };

    events.getSessionState = () => sessionState;
    events.startCli = ({ cols, rows }) => startCli({ connection: targetServer, cols, rows });
    events.startNetconf = () => startNetconf(targetServer);
    events.startCapture = (interfaceName, rootPassword, filter = '') => startCapture(targetServer, interfaceName, rootPassword, filter);
    events.startScp = () => startScp(targetServer);

    return events;
};

const monitorConfigChanges = async (
    sshEvents,
    pollInterval = 3000,
    onChangeCallback = null,
    dampingThreshold = 5,
    maxDelay = 60000 // 1 minute
) => {
    let lastChangedTimestamp = ''; // Initial empty timestamp
    let lastCallbackTime = Date.now(); // Track the last callback time
    let changeCount = 0; // Count changes during busy periods
    let busyFlag = false; // Indicates whether the system is in a busy state
    let shouldContinue = true; // Flag to control polling loop

    const resetState = () => {
        console.log('Resetting state...');
        if (busyFlag) sshEvents.emit('status', { busy: false, count: 0, message: 'System is idle.' });
        changeCount = 0;
        busyFlag = false;
        lastCallbackTime = Date.now();
    };

    const getLastChangedTimestamp = async () => {
        try {
            const rpc = `
                <get-configuration database="candidate" format="text">
                    <configuration>
                        <version/>
                    </configuration>
                </get-configuration>
            `;
            const { text } = await sshEvents.sendToNetconf(rpc);

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

    const runCallback = async (currentTimestamp, previousTimestamp) => {
        if (typeof onChangeCallback === 'function') {
            try {
                await onChangeCallback(currentTimestamp, previousTimestamp);
            } catch (callbackError) {
                console.error('Error in onChangeCallback:', callbackError.message);
            }
        }
        lastChangedTimestamp = currentTimestamp; // Update only when callback runs
        lastCallbackTime = Date.now(); // Update the last callback time
    };

    const pollForChanges = async () => {
        if (!shouldContinue) return; // Exit if flag indicates to stop

        try {
            const currentTimestamp = await getLastChangedTimestamp();
            const now = Date.now();
            const timeSinceLastCallback = now - lastCallbackTime;

            if (currentTimestamp !== lastChangedTimestamp) {
                changeCount++;
                console.log(`Configuration change detected. Count: ${changeCount}`);

                if (changeCount <= dampingThreshold) {
                    console.log('Below damping threshold. Running callback.');
                    await runCallback(currentTimestamp, lastChangedTimestamp);
                } else if (busyFlag) {
                    if (timeSinceLastCallback > maxDelay) {
                        console.log(`Max delay exceeded (${maxDelay}ms). Running callback.`);
                        await runCallback(currentTimestamp, lastChangedTimestamp);
                        // Do not reset changeCount or busyFlag here
                    } else {
                        console.log('System is busy. Skipping callback.');
                    }
                } else {
                    console.log('Entering busy state.');
                    busyFlag = true;
                    sshEvents.emit('status', { busy: true, count: changeCount, message: 'System is busy.' });
                }
            } else {
                if (changeCount > dampingThreshold && busyFlag) {
                    console.log('No changes detected after busy period. Running callback.');
                    await runCallback(currentTimestamp, lastChangedTimestamp);
                    resetState();
                } else {
                    console.log('No changes detected. Resetting state.');
                    resetState();
                }
            }
        } catch (error) {
            console.error('Polling stopped due to an error:', error.message);
            return; // Stop further polling on error
        }

        // Schedule the next poll
        setTimeout(pollForChanges, pollInterval);
    };

    // Stop polling when the target session or NETCONF channel closes
    sshEvents.on('netconf-closed', () => {
        shouldContinue = false;
        console.log('Monitoring stopped: NETCONF channel closed.');
    });
    sshEvents.on('target-closed', () => {
        shouldContinue = false;
        console.log('Monitoring stopped: Target session closed.');
    });

    // Start polling
    await pollForChanges();
};
