import EventEmitter from 'events';
import { Parser } from 'xml2js';
import hexy from 'hexy';

const netconfQueue = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Configure the XML parser with the given options
const parser = new Parser({
    explicitArray: false,
    explicitChildren: false,
    preserveChildrenOrder: true,
    mergeAttrs: true,
});

const hexDump = (buffer) => {
    const options = { width: 16, format: 'twos', caps: 'upper' };
    return hexy.hexy(buffer, options);
};

const executeCommand = async (conn, command) => {
    return new Promise((resolve, reject) => {
        conn.exec(command, (err, stream) => {
            if (err) return reject(err);

            let output = '';
            let errorOutput = '';

            stream
                .on('close', (code, signal) => {
                    if (errorOutput) {
                        return reject(new Error(`Command failed: ${errorOutput}`));
                    }
                    resolve(output);
                })
                .on('data', (data) => {
                    output += data.toString();
                })
                .stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });
        });
    });
};

const getShellFacts = async (connection) => {
    // console.log('connection config', connection.config);

    const username = connection.config.username;
    let isRootShell = username === 'root';

    let isJunosOs = false;
    let isJunosCliShell = false;

    const junosOsTestCommand1 = 'show system information | display xml';
    const junosOsTestCommand2 = 'cli -c "show system information | display xml"';

    await executeCommand(connection, junosOsTestCommand1)
        .then((output) => {
            isJunosOs = true;
            isJunosCliShell = true;
        })
        .catch(async (err) => {
            await executeCommand(connection, junosOsTestCommand2)
                .then((output) => {
                    isJunosOs = true;
                    isJunosCliShell = false;
                })
                .catch((err) => {
                    isJunosOs = false;
                    isJunosCliShell = false;
                });
        });

    return { isRootShell, isJunosOs, isJunosCliShell };
};

const compactRpc = (rpc) => {
    if (typeof rpc !== 'string') {
        throw new Error('RPC input must be a string.');
    }

    return rpc
        .replace(/\n/g, '') // Remove newlines
        .replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
        .replace(/>\s+</g, '><') // Remove spaces between tags
        .trim(); // Trim leading/trailing spaces
};

const simplifyParsedObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (
            value &&
            typeof value === 'object' &&
            '_' in value &&
            (Object.keys(value).length === 1 || // Allow only `_` key
                (Object.keys(value).length === 2 &&
                    Object.keys(value).every((k) => k === '_' || k.startsWith('xmlns'))))
        ) {
            obj[key] = value._; // Replace object with `_` value
        } else if (typeof value === 'object') {
            simplifyParsedObject(value); // Recursive processing
        }
    }
    return obj;
};

const rpcRequest = async ({ stream, rpc, timeoutMs = 0 }) => {
    return new Promise((resolve, reject) => {
        const netconfEndMark = ']]>]]>'; // NETCONF end mark

        let accumulatedData = '';
        let timeout; // Timeout reference

        const onData = async (data) => {
            accumulatedData += data.toString(); // Accumulate the data as a string

            // Check if the NETCONF end mark is present
            if (accumulatedData.includes(netconfEndMark)) {
                if (timeoutMs > 0) clearTimeout(timeout); // Clear the timeout
                stream.removeListener('data', onData); // Stop listening for data
                stream.removeListener('error', onError); // Cleanup error listener

                const text = accumulatedData.replace(/<rpc-reply[^>]*>([\s\S]*?)<\/rpc-reply>/, '$1').trim();
                try {
                    let parsed = await parser.parseStringPromise(text);
                    parsed = simplifyParsedObject(parsed);
                    resolve({ text, parsed });
                } catch (parseError) {
                    resolve({ text, parsed: null });
                }
            }
        };

        const onError = (err) => {
            if (timeoutMs > 0) clearTimeout(timeout);
            stream.removeListener('data', onData);
            reject(err);
        };

        function onTimeout() {
            stream.removeListener('data', onData);
            stream.removeListener('error', onError);
            reject(new Error(`Timeout exceeded: ${timeoutMs}ms`));
        }

        if (timeoutMs > 0) timeout = setTimeout(onTimeout, timeoutMs + 3000);

        stream.on('data', onData);
        stream.on('error', onError);

        if (rpc.length > 0) {
            const compactedRpc = compactRpc(`<rpc>${rpc}</rpc>`);
            stream.write(compactedRpc + '\n');
        }
    });
};

const processQueue = async (stream) => {
    while (netconfQueue.length > 0) {
        const { rpc, timeoutMs, resolve, reject } = netconfQueue.shift(); // Get the first request in the queue

        try {
            const result = await rpcRequest({ stream, rpc, timeoutMs });
            resolve(result);
        } catch (err) {
            reject(err);
        }
    }
};

const queueRpcRequest = ({ stream, rpc, timeoutMs = 0 }) => {
    return new Promise((resolve, reject) => {
        netconfQueue.push({ rpc, timeoutMs, resolve, reject });

        // If this is the only item in the queue, start processing
        if (netconfQueue.length === 1) {
            processQueue(stream).catch((err) => {
                console.error('Error processing NETCONF queue:', err.message);
            });
        }
    });
};

export const startNetconf = (connection) => {
    const events = new EventEmitter();

    // Defer execution to ensure events are set up
    process.nextTick(() => {
        try {
            console.log('Gathering shell facts...');
            getShellFacts(connection)
                .then((facts) => {
                    if (!facts.isJunosOs) {
                        throw new Error('Unsupported shell');
                    }

                    let command = 'netconf';

                    if (!facts.isRootShell && facts.isJunosCliShell) {
                        command = 'start shell command netconf';
                    }

                    connection.exec(command, async (err, stream) => {
                        if (err) {
                            events.emit('error', new Error(`Failed to start shell: ${err.message}`));
                            return;
                        }

                        events.rpcRequest = ({ rpc, timeoutMs = 0 }) => {
                            return queueRpcRequest({ stream, rpc, timeoutMs });
                        };

                        events.close = () => {
                            while (netconfQueue.length > 0) {
                                const { reject } = netconfQueue.shift();
                                reject(new Error('Session closed before processing'));
                            }
                            stream.end();
                            events.emit('end', { message: 'NETCONF session closed' });
                        };

                        const hello = await rpcRequest({ stream, rpc: '', timeoutMs: 3000 });
                        events.emit('ready', 'NETCONF session established');

                        stream.on('error', (err) => {
                            events.emit('error', new Error(`Stream error: ${err.message}`));
                        });

                        stream.on('close', () => {
                            events.emit('end', { message: 'NETCONF session ended' });
                            connection.end();
                        });
                    });
                })
                .catch((err) => {
                    events.emit('error', err);
                });
        } catch (err) {
            events.emit('error', err);
        }
    });

    return events;
};
