import { spawn, execSync } from 'child_process';
import EventEmitter from 'events';
import hexy from 'hexy';
import fs from 'fs';
import os from 'os';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function captureDataWithDuration(stream, durationMs = 1000) {
    return new Promise((resolve) => {
        let accumulatedData = '';

        function onData(data) {
            accumulatedData += data; // Accumulate the data
        }

        // Attach the listener
        stream.on('data', onData);

        // Set a timeout to remove the listener after the duration
        setTimeout(() => {
            stream.removeListener('data', onData); // Remove the listener
            resolve(accumulatedData); // Resolve the accumulated data
        }, durationMs);
    });
}

const detectWiresharkPath = () => {
    const platform = os.platform();

    if (platform === 'darwin') {
        // macOS: Check known paths and Homebrew installation
        const possiblePaths = [
            '/Applications/Wireshark.app/Contents/MacOS/Wireshark', // Official Installer
            '/usr/local/bin/wireshark', // Homebrew (Intel)
            '/opt/homebrew/bin/wireshark', // Homebrew (Apple Silicon)
        ];

        for (const path of possiblePaths) {
            if (fs.existsSync(path)) {
                return path;
            }
        }

        // Check if Wireshark is in the PATH
        try {
            const path = execSync('which wireshark', { encoding: 'utf8' }).trim();
            if (path) {
                return path;
            }
        } catch (err) {
            // Ignore errors
        }
    } else if (platform === 'win32') {
        // Windows: Check default installation paths
        const possiblePaths = [
            'C:\\Program Files\\Wireshark\\Wireshark.exe', // Default location (64-bit)
            'C:\\Program Files (x86)\\Wireshark\\Wireshark.exe', // Default location (32-bit)
        ];

        for (const path of possiblePaths) {
            if (fs.existsSync(path)) {
                return path;
            }
        }

        // Check if Wireshark is in the PATH
        try {
            const path = execSync('where wireshark', { encoding: 'utf8' }).trim();
            if (path) {
                return path;
            }
        } catch (err) {
            // Ignore errors
        }
    } else if (platform === 'linux') {
        // Linux: Check if Wireshark is in the PATH
        try {
            const path = execSync('which wireshark', { encoding: 'utf8' }).trim();
            if (path) {
                return path;
            }
        } catch (err) {
            // Ignore errors
        }

        // Check common installation paths
        const possiblePaths = ['/usr/bin/wireshark', '/usr/local/bin/wireshark'];

        for (const path of possiblePaths) {
            if (fs.existsSync(path)) {
                return path;
            }
        }
    }

    throw new Error('Wireshark not found on this system.');
};

const runWireshark = (wiresharkPath) => {
    console.log('Starting Wireshark...');

    // Start Wireshark process
    const wireshark = spawn(wiresharkPath, ['-k', '-i', '-'], {
        stdio: ['pipe', 'ignore', 'ignore'], // Keep stdin open for piping data
        detached: true, // Detach the process
    });

    // Unref the process to let Node.js exit cleanly
    wireshark.unref();

    // Optional logging for debugging
    wireshark.on('spawn', () => {
        console.log('Wireshark process started (detached).');
    });

    wireshark.on('error', (err) => {
        console.error(`Failed to start Wireshark: ${err.message}`);
    });

    // Handle Ctrl+C (SIGINT)
    process.on('SIGINT', () => {
        console.log('Received SIGINT (Ctrl+C). Cleaning up...');
        wireshark.kill('SIGINT'); // Send SIGINT to Wireshark process
        process.exit(); // Exit the main process
    });

    return wireshark;
};

export const startCapture = (connection, interfaceName, rootPassword, matching = '') => {
    const events = new EventEmitter();
    let streamForCapture = null;
    let wireshark = null;

    // Defer execution to ensure events are set up
    process.nextTick(() => {
        try {
            let wiresharkPath;
            try {
                wiresharkPath = detectWiresharkPath();
            } catch (err) {
                events.emit('error', err);
                return;
            }

            console.log(`Wireshark detected at: ${wiresharkPath}`);

            getShellFacts(connection)
                .then((facts) => {
                    if (!facts.isJunosOs) {
                        throw new Error('Unsupported shell');
                    }

                    const tcpdump = `sh -c "stty -onlcr; tcpdump -n -s10000 -i ${interfaceName} -U -w - ${matching} 2>/dev/null"`;
                    const setupCommands = [];

                    if (!facts.isRootShell) {
                        if (facts.isJunosCliShell) {
                            setupCommands.push('start shell');
                        }
                        setupCommands.push('su', rootPassword);
                    }

                    connection.shell(
                        { term: 'dumb', cols: 200, rows: 100, highWaterMark: 1024 * 1024 },
                        async (err, stream) => {
                            if (err) {
                                events.emit('error', new Error(`Failed to start shell: ${err.message}`));
                                return;
                            }

                            streamForCapture = stream;

                            try {
                                // Execute setup commands
                                for (const command of setupCommands) {
                                    await sleep(500);
                                    stream.write(`${command}\n`);
                                }

                                const data = await captureDataWithDuration(stream, 500);

                                if (data.toLowerCase().includes('sorry')) {
                                    throw new Error('Authentication failed');
                                }

                                // Start Wireshark process
                                wireshark = runWireshark(wiresharkPath);

                                wireshark.stdin.on('close', () => {
                                    console.log('Wireshark stdin closed.');
                                });

                                wireshark.on('close', () => {
                                    console.log('Wireshark closed.');
                                });

                                let accumulatedBuffer = Buffer.alloc(0);
                                let done = false;

                                stream.on('data', function onData(data) {
                                    if (!done) accumulatedBuffer = Buffer.concat([accumulatedBuffer, data]);

                                    const suffixes = ['\r\n', '\n'];
                                    let tcpdumpIndex = -1;
                                    let matchedBuffer = null;

                                    // Detect and process tcpdump command
                                    for (const suffix of suffixes) {
                                        const candidateBuffer = Buffer.from(tcpdump + suffix);
                                        if (!done && accumulatedBuffer.includes(candidateBuffer)) {
                                            tcpdumpIndex = accumulatedBuffer.indexOf(candidateBuffer);
                                            matchedBuffer = candidateBuffer;
                                            break;
                                        }
                                    }

                                    if (tcpdumpIndex !== -1 && matchedBuffer) {
                                        const after = accumulatedBuffer.subarray(tcpdumpIndex + matchedBuffer.length);
                                        wireshark.stdin.write(after);

                                        done = true;
                                        stream.pipe(wireshark.stdin);
                                        stream.removeListener('data', onData);

                                        events.emit('start', { message: 'Capture started successfully' });
                                    }
                                });

                                stream.on('error', (err) => {
                                    events.emit('error', new Error(`Stream error: ${err.message}`));
                                });

                                stream.on('close', () => {
                                    events.emit('end', { message: 'Capture ended' });
                                    connection.end();
                                });

                                // Start tcpdump
                                stream.write(`${tcpdump}\n`);
                            } catch (streamErr) {
                                events.emit('error', streamErr);
                                connection.end();
                            }
                        }
                    );
                })
                .catch((err) => {
                    events.emit('error', err);
                });
        } catch (err) {
            events.emit('error', err);
        }
    });

    events.close = async () => {
        console.log('Closing capture process...');

        // Close the SSH stream to stop `tcpdump` on the remote device
        if (streamForCapture) {
            console.log('Closing SSH stream for capture...');
            streamForCapture.end();
        }

        if (wireshark) {
            console.log('Closing Wireshark stdin...');
            if (wireshark.stdin) {
                wireshark.stdin.removeAllListeners();
                wireshark.stdin.end();
            }
            wireshark.removeAllListeners();
            console.log('Wireshark process cleaned up.');
        }

        // Notify listeners of the end event
        events.emit('end', { message: 'Capture process terminated by close method.' });
    };

    events.checkWireshark = () => {
        if (wireshark) {
            if (wireshark.stdin) {
                if (wireshark.stdin.writable) {
                    console.log('Wireshark stdin is still open.');
                } else {
                    console.log('Wireshark stdin is closed.');
                }
            } else {
                console.log('Wireshark stdin does not exist.');
            }
        }
    };

    return events;
};
