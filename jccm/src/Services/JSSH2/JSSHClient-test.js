import { connect } from 'http2';
import { createSshSession } from './JSSHClient.js';

const exampleSSHClient1 = async () => {
    try {
        const jumpHost = { host: '10.6.3.45', port: 22, username: 'poc', password: 'lab123' };
        // const targetHost = { host: '10.6.3.224', port: 22, username: 'regress', password: 'MaRtInI' };
        // const targetHost = { host: '10.6.3.224', port: 22, username: 'root', password: 'Embe1mpls' };
        const targetHost = { host: '10.6.3.224', port: 22, username: 'poc', password: 'lab123' };

        const sshEvent = await createSshSession(targetHost, jumpHost);

        sshEvent.on('target-ready', () => {
            console.log('Target SSH sshEvent established.');
            const cliEvent = sshEvent.startCli({ cols: 120, rows: 50 });
            cliEvent.on('ready', (info) => {
                console.log(info);
                cliEvent.on('data', (data) => {
                    process.stdout.write(data.toString());
                });
            });

            cliEvent.on('error', (err) => {
                console.error('CLI session error:', err.message);
                sshEvent.close();
            });

            cliEvent.on('end', (info) => {
                console.log(info);
                sshEvent.close();
            });

            const interval = setInterval(() => {
                cliEvent.write('show system information | display xml | no-more\n');
            }, 3000);

            process.on('SIGINT', () => {
                console.log('Closing session...');
                clearInterval(interval);
                cliEvent.close();
                sshEvent.close();
            });
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
};

const exampleSSHClient2 = async () => {
    try {
        const jumpHost = { host: '10.6.3.45', port: 22, username: 'poc', password: 'lab123' };
        // const targetHost = { host: '10.6.3.224', port: 22, username: 'regress', password: 'MaRtInI' };
        // const targetHost = { host: '10.6.3.224', port: 22, username: 'root', password: 'Embe1mpls' };
        const targetHost = { host: '10.6.3.224', port: 22, username: 'poc', password: 'lab123' };

        const sshEvent = await createSshSession(targetHost, null);

        sshEvent.on('target-ready', () => {
            console.log('Target SSH sshEvent established.');
            const netconfEvent = sshEvent.startNetconf();

            netconfEvent.on('ready', (info) => {
                console.log(info);

                const interval = setInterval(() => {
                    netconfEvent.rpcRequest({ rpc: '<get-system-information/>' }).then((reply) => {
                        console.log('NETCONF reply:', reply);
                    });
                }, 3000);

                process.on('SIGINT', () => {
                    console.log('Closing session...');
                    clearInterval(interval);
                    netconfEvent.close();
                    sshEvent.close();
                });
            });
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
};

const exampleSSHClient3 = async () => {
    try {
        const jumpHost = { host: '10.6.3.45', port: 22, username: 'poc', password: 'lab123' };
        // const targetHost = { host: '10.6.3.224', port: 22, username: 'regress', password: 'MaRtInI' };
        // const targetHost = { host: '10.6.3.224', port: 22, username: 'root', password: 'Embe1mpls' };
        const targetHost = { host: '10.6.3.224', port: 22, username: 'poc', password: 'lab123' };

        const rootPassword = 'Embe1mpls';

        const sshEvent = await createSshSession(targetHost, null);

        sshEvent.on('target-ready', () => {
            console.log('Target SSH sshEvent established.');
            const captureEvent = sshEvent.startCapture('xe-0/0/0:0', rootPassword);

            captureEvent.on('start', (info) => {
                console.log(`start: ${JSON.stringify(info)}`);
            });

            const interval = setInterval(() => {
                captureEvent.checkWireshark();
            }, 1000);

            setTimeout(() => {
                console.log('Stopping capture...');
                clearInterval(interval);
                captureEvent.close();
                sshEvent.close();
            }, 30000);
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
};

exampleSSHClient3();
console.log('Connecting to SSH server...');
