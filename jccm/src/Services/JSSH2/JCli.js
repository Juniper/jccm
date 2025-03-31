import EventEmitter from 'events';
import { Parser } from 'xml2js';
import hexy from 'hexy';
import { resolve } from 'path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const hexDump = (buffer) => {
    const options = { width: 16, format: 'twos', caps: 'upper' };
    return hexy.hexy(buffer, options);
};

const executeSshCommand = async (connection, command) => {
    return new Promise((resolve, reject) => {
        connection.exec(command, (err, stream) => {
            if (err) return reject(new Error(`Failed to execute command: ${err.message}`));

            let output = '';
            let errorOutput = '';

            stream
                .on('data', (data) => {
                    // process.stdout.write(data.toString());
                    output += data.toString();
                })
                .stderr.on('data', (data) => {
                    errorOutput += data.toString();
                })
                .on('close', () => {
                    if (errorOutput) {
                        reject(new Error(`Command error: ${errorOutput.trim()}`));
                    } else {
                        resolve(output.trim());
                    }
                });
        });
    });
};

export const executeJunosCommand = async ({ connection, command }) => {
    const primaryCommand = `${command}`; // Direct execution
    const fallbackCommand = `cli -c "${command}"`; // Use CLI mode

    try {
        const output = await executeSshCommand(connection, primaryCommand);
        return output;
    } catch (primaryError) {
        try {
            const output = await executeSshCommand(connection, fallbackCommand);
            return output;
        } catch (fallbackError) {
            throw new Error(
                `Both primary and fallback commands failed. Primary error: ${primaryError.message}, Fallback error: ${fallbackError.message}`
            );
        }
    }
};

const parser = new Parser({
    explicitArray: false,
    explicitChildren: false,
    preserveChildrenOrder: true,
    mergeAttrs: true,
});

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

export const xmlToObject = async (xml) => {
    const text = xml.replace(/<rpc-reply[^>]*>([\s\S]*?)<\/rpc-reply>/, '$1').trim();
    try {
        let parsed = await parser.parseStringPromise(text);
        parsed = simplifyParsedObject(parsed);
        return parsed;
    } catch (parseError) {
        console.error('Error parsing XML:', parseError.message);
        console.error('Faulty XML fragment:', text.slice(0, 500)); // Log the first 500 characters of the XML
        throw new Error('Failed to parse XML. Please check the input.');
    }
};

export const startCli = ({ connection, cols = 80, rows = 25 }) => {
    const events = new EventEmitter();

    // Defer execution to ensure events are set up
    process.nextTick(() => {
        try {
            connection.shell({ cols, rows }, (err, stream) => {
                if (err) {
                    events.emit('error', new Error(`Failed to start shell: ${err.message}`));
                    return;
                }

                events.write = (data) => {
                    stream.write(data);
                };

                events.resize = ({ cols, rows }) => {
                    stream.setWindow(rows, cols, 0, 0);
                };

                events.close = () => {
                    try {
                        if (stream) {
                            stream.removeAllListeners();
                            stream.end();
                        }
                        events.removeAllListeners();
                        events.emit('end', 'The CLI session has been closed.');
                    } catch (err) {
                        events.emit('error', new Error(`Failed to close CLI session: ${err.message}`));
                    }
                };
                events.emit('ready', 'CLI session established.');

                stream.on('data', (data) => {
                    events.emit('data', data.toString());
                });

                stream.on('close', () => {
                    events.emit('end', 'The CLI stream has been closed.');
                });
            });
        } catch (err) {
            events.emit('error', err);
        }
    });

    return events;
};
