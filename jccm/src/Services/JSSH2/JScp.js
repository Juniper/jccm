import EventEmitter from 'events';
import fs from 'fs';

export const startScp = (connection) => {
    const events = new EventEmitter();

    process.nextTick(() => {
        try {
            events.upload = (localPath, remotePath) => {
                return new Promise((resolve, reject) => {
                    const readStream = fs.createReadStream(localPath);

                    connection.exec(`scp -v -t ${remotePath}`, (err, stream) => {
                        if (err) {
                            reject(new Error(`Failed to start SCP upload: ${err.message}`));
                            return;
                        }

                        let serverAcknowledged = 0;

                        stream.on('data', (data) => {
                            const response = data.toString();
                            if (response === '\0') {
                                serverAcknowledged++;

                                // Send metadata after the first acknowledgment
                                if (serverAcknowledged === 1) {
                                    try {
                                        const stats = fs.statSync(localPath);
                                        const metadata = `C0644 ${stats.size} ${localPath.split('/').pop()}\n`;
                                        stream.write(metadata);
                                    } catch (err) {
                                        reject(new Error(`Failed to send file metadata: ${err.message}`));
                                    }
                                }

                                // Start file transfer after metadata acknowledgment
                                if (serverAcknowledged === 2) {
                                    readStream.pipe(stream, { end: false });
                                    readStream.on('end', () => {
                                        stream.write('\0'); // Signal end of file
                                    });
                                    readStream.on('error', (err) => {
                                        reject(new Error(`Error reading local file: ${err.message}`));
                                    });
                                }

                                // Resolve after the final acknowledgment
                                if (serverAcknowledged === 3) {
                                    stream.end();
                                }
                            } else {
                                console.error(`Unexpected server response: ${response}`);
                                reject(new Error('Unexpected server response during SCP upload.'));
                                stream.end();
                            }
                        });

                        stream.on('close', (code) => {
                            if (code === 0 && serverAcknowledged === 3) {
                                events.emit('upload', { localPath, remotePath });
                                resolve(`File uploaded successfully: ${remotePath}`);
                            } else if (serverAcknowledged < 3) {
                                console.error('SCP upload failed: Missing server acknowledgment.');
                                reject(new Error('SCP upload failed: Missing server acknowledgment.'));
                            } else {
                                reject(new Error(`SCP upload failed with code ${code}`));
                            }
                        });

                        stream.on('error', (err) => {
                            reject(new Error(`SCP stream error: ${err.message}`));
                        });
                    });
                });
            };

            events.download = (remotePath, localPath) => {
                return new Promise((resolve, reject) => {
                    connection.exec(`scp -v -f ${remotePath}`, (err, stream) => {
                        if (err) {
                            reject(new Error(`Failed to start SCP download: ${err.message}`));
                            return;
                        }

                        const writeStream = fs.createWriteStream(localPath);
                        let metaReceived = false;
                        let fileSize = 0;
                        let bytesReceived = 0;

                        stream
                            .on('data', (data) => {
                                if (!metaReceived) {
                                    const metadata = data.toString().trim();

                                    // Match SCP metadata
                                    const match = metadata.match(/^C\d{4}\s+(\d+)\s(.+)$/);
                                    if (match) {
                                        fileSize = parseInt(match[1], 10);
                                        const fileName = match[2];

                                        // Send acknowledgment for metadata
                                        stream.write('\0');
                                        metaReceived = true;
                                    } else {
                                        console.error(`Unexpected SCP metadata: ${metadata}`);
                                        reject(new Error('Invalid SCP metadata.'));
                                        connection.end();
                                        return;
                                    }
                                } else {
                                    if (bytesReceived < fileSize) {
                                        // Write file content only until expected file size
                                        const chunk = data.slice(0, Math.min(data.length, fileSize - bytesReceived));
                                        bytesReceived += chunk.length;
                                        writeStream.write(chunk);
                                    }

                                    // Check if all bytes are received
                                    if (bytesReceived >= fileSize) {
                                        stream.write('\0');
                                    }
                                }
                            })
                            .on('close', () => {
                                if (bytesReceived === fileSize) {
                                    writeStream.end();
                                    events.emit('download', { remotePath, localPath });
                                    resolve(`File downloaded successfully: ${localPath}`);
                                } else {
                                    console.error(`bytesReceived: ${bytesReceived}`);
                                    console.error(`fileSize: ${fileSize}`);
                                    reject(new Error('File transfer incomplete. Bytes mismatch.'));
                                }
                            })
                            .on('error', (err) => {
                                reject(`SCP stream error: ${err.message}`);
                            });

                        writeStream.on('error', (err) => {
                            reject(new Error(`Failed to write local file: ${err.message}`));
                        });

                        // Send initial acknowledgment to begin transfer
                        stream.write('\0');
                    });
                });
            };

            events.close = () => {
                events.removeAllListeners();
                events.emit('end', 'SCP session closed.');
            };

            events.emit('ready', 'SCP session established.');
        } catch (err) {
            events.emit('error', err);
        }
    });

    return events;
};
