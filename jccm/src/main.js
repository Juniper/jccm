import { app, BrowserWindow, screen, dialog } from 'electron';
import path from 'path';
import os from 'os';

import { setupApiHandlers } from './Services/ApiServer'; // Import the API handlers
import { setupAutoUpdate } from './Services/AutoUpdate'; // Import the auto-update setup function
import { setupApiConfigTrackingHandlers } from './Services/ApiConfigTracking'; // Import the API config tracking handlers

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

// Determine the platform
const platform = os.platform();

console.log('platform: ' + platform);

if (platform === 'linux') {
    // Set userData path to the home directory for Linux
    const userHome = process.env.HOME || process.env.USERPROFILE; // Cross-platform way to get home directory
    app.setPath('userData', path.join(userHome, '.jccm'));
}

// Initialize mainWindow as undefined
export let mainWindow;

// A function to send log messages from the main process to the renderer
export const sendLogMessage = (type, ...args) => {
    // Send the log message to the renderer via IPC
    mainWindow.webContents.send('onLogMessage', { type, args });
};

export const sendTabKeyDownEvent = () => {
    mainWindow.webContents.send('onTabKeyDown');
};

export const sendEscKeyDownEvent = () => {
    mainWindow.webContents.send('onEscKeyDown');
};


const createWindow = () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow = new BrowserWindow({
        width: Math.floor(width * 0.95),
        height: Math.floor(height * 0.95),
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
            nodeIntegration: false,
            contextIsolation: true,
            rememberPassword: false, // Disable the password saving feature
            autoFill: false,
        },
    });

    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
    console.log('Window Created');
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    setupApiHandlers(); // Set up IPC handlers
    setupApiConfigTrackingHandlers(); // Set up API config tracking handlers

    createWindow();

    setupAutoUpdate(); // Set up auto-update

    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// app.on('ready', async () => {
//     await initializeDatabase();
// });

// process.on('uncaughtException', (error) => {
//     console.error('An uncaught error occurred!');
//     console.error(error.stack);

//     // dialog.showErrorBox('An error occurred', `Sorry, an unexpected error occurred: ${error.message}`);

//     // Optionally exit the application if needed
//     // app.quit();
//   });

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // You can add additional logic here to log the error to a file, or display a custom error message
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // You can add additional logic here to log the error to a file, or display a custom error message
});
