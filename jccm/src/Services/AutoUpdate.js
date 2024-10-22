import { app, ipcMain, autoUpdater } from 'electron';

import { mainWindow } from '../main.js';

const server = 'https://update.electronjs.org';
const target = `${process.platform}-${process.arch}/${app.getVersion()}`;
const feed = `${server}/Juniper/jccm/${target}`;

autoUpdater.setFeedURL(feed);
console.log(`AutoUpdater URL feed: ${feed}`);

export const setupAutoUpdate = () => {
    ipcMain.on('quit-and-install', () => {
        console.log('Received quit-and-install...');
        autoUpdater.quitAndInstall();
    });

    ipcMain.handle('check-for-auto-update-support', () => {
        console.log('Checking for auto-update support...');

        const platform = process.platform; // Get the current platform

        if (platform === 'darwin') {
            console.log('Auto-update is supported on macOS.');
            return true;
        } else if (platform === 'win32') {
            console.log('Auto-update is supported on Windows.');
            return true;
        } else {
            console.log('Auto-update is not supported on this platform.');
            return false;
        }
    });
    
    let isFirstUpdateCheck = true; // Track if it's the first call

    ipcMain.handle('check-for-updates', (event) => {
        console.log('Checking for updates...');

        return new Promise((resolve, reject) => {
            const delay = isFirstUpdateCheck ? 10000 : 0; // 10-second delay for the first call only because of https://www.electronjs.org/docs/latest/api/auto-updater#windows
            isFirstUpdateCheck = false; // Reset after first call

            setTimeout(() => {
                let isUpdateAvailable = false;

                autoUpdater.once('update-available', () => {
                    console.log('Update available.');
                    isUpdateAvailable = true;
                });

                autoUpdater.once('update-not-available', () => {
                    console.log('No update available.');
                    isUpdateAvailable = false;
                });

                // Timeout to finalize the check if listeners do not resolve quickly
                const timeout = setTimeout(() => {
                    console.log('Update check will complete in 3 seconds. Please wait...');
                    autoUpdater.removeAllListeners('update-available');
                    autoUpdater.removeAllListeners('update-not-available');
                    console.log('Update check result:', isUpdateAvailable);
                    resolve(isUpdateAvailable);
                }, 3000);

                // Initiate the update check
                autoUpdater.checkForUpdates();
            }, delay); // Apply the delay if it's the first call
        });
    });

    autoUpdater.on('update-downloaded', () => {
        console.log('Update downloaded');
        mainWindow.webContents.send('update-downloaded');
    });

    autoUpdater.on('error', (error) => {
        console.log('Error in auto-updater.', error.message);
        mainWindow.webContents.send('auto-update-error', { error });
    });
};
