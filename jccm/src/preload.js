import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that perform the API calls
contextBridge.exposeInMainWorld('electronAPI', {
    saFetchAvailableClouds: () => ipcRenderer.invoke('saFetchAvailableClouds'),
    saLookupApiEndpoint: (args) => ipcRenderer.invoke('saLookupApiEndpoint', args),

    saLoginUser: (args) => ipcRenderer.invoke('saLoginUser', args),
    saLogoutUser: () => ipcRenderer.invoke('saLogoutUser'),

    saDeviceModels: () => ipcRenderer.invoke('device-models'),

    saGetGoogleSSOAuthCode: (args) => ipcRenderer.invoke('saGetGoogleSSOAuthCode', args),
    saGoogleSSOAuthCodeReceived: (callback) =>
        ipcRenderer.on('saGoogleSSOAuthCodeReceived', (event, code) => callback(code)),
    saLoginUserGoogleSSO: (args) => ipcRenderer.invoke('saLoginUserGoogleSSO', args),

    saWhoamiUser: () => ipcRenderer.invoke('saWhoamiUser'),
    saSetThemeUser: (args) => ipcRenderer.invoke('saSetThemeUser', args),
    saGetCloudInventory: (args) => ipcRenderer.invoke('saGetCloudInventory', args),
    saProxyCall: (args) => ipcRenderer.invoke('saProxyCall', args),
    saOrgFilter: (args) => ipcRenderer.invoke('saOrgFilter', args),
    saGetLocalInventory: () => ipcRenderer.invoke('saGetLocalInventory'),
    saSetLocalInventory: (args) => ipcRenderer.invoke('saSetLocalInventory', args),

    saLoadDeviceFacts: () => ipcRenderer.invoke('saLoadDeviceFacts'),
    saSaveDeviceFacts: (args) => ipcRenderer.invoke('saSaveDeviceFacts', args),

    saLoadSubnets: () => ipcRenderer.invoke('saLoadSubnets'),
    saSaveSubnets: (args) => ipcRenderer.invoke('saSaveSubnets', args),

    saLoadSettings: () => ipcRenderer.invoke('saLoadSettings'),
    saSaveSettings: (args) => ipcRenderer.invoke('saSaveSettings', args),

    startSSHConnection: (config) => ipcRenderer.send('startSSHConnection', config),
    sendSSHInput: (id, data) => ipcRenderer.send(`sendSSHInput-${id}`, data),
    resizeSSHSession: (id, size) => ipcRenderer.send(`resizeSSHSession-${id}`, size),
    disconnectSSHSession: (id) => ipcRenderer.send('disconnectSSHSession', { id }),
    sshSessionOpened: (callback) => ipcRenderer.on('sshSessionOpened', (event, id) => callback(id)),
    onSSHDataReceived: (callback) => ipcRenderer.on('sshDataReceived', (event, data) => callback(data)),
    onSSHErrorOccurred: (callback) => ipcRenderer.on('sshErrorOccurred', (event, error) => callback(error)),
    onSSHSessionClosed: (callback) => ipcRenderer.on('sshSessionClosed', (event, data) => callback(data)),

    on: (channel, listener) => ipcRenderer.on(channel, listener),
    off: (channel, listener) => ipcRenderer.removeListener(channel, listener),

    saAdoptDevice: (args) => ipcRenderer.invoke('saAdoptDevice', args),
    saReleaseDevice: (args) => ipcRenderer.invoke('saReleaseDevice', args),
    saExecuteJunosCommand: (args) => ipcRenderer.invoke('saExecuteJunosCommand', args),
    saGetDeviceFacts: (args) => ipcRenderer.invoke('saGetDeviceFacts', args),
    saCommitJunosSetConfig: (args) => ipcRenderer.invoke('saCommitJunosSetConfig', args),

    saToggleDevTools: () => ipcRenderer.send('saToggleDevTools'),
    onLogMessage: (callback) => ipcRenderer.on('onLogMessage', (event, args) => callback(args)),
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),

    saGetDeviceNetworkCondition: (args) => ipcRenderer.invoke('get-device-network-condition', args),

    checkForAutoUpdateSupport: () => ipcRenderer.invoke('check-for-auto-update-support'), // renderer -> main -> renderer

    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'), // renderer -> main -> renderer
    quitAndInstall: () => ipcRenderer.send('quit-and-install'), // renderer -> main

    updateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event) => callback()), // main -> renderer
    autoUpdateError: (callback) => ipcRenderer.on('auto-update-error', (event, args) => callback(args)), // main -> renderer

    restartApp: () => ipcRenderer.send('restart-app'), // renderer -> main
    clearDatabaseAndRestartApp: () => ipcRenderer.send('clear-database-and-restart-app'), // renderer -> main
    quitApp: () => ipcRenderer.send('quit-app'), // renderer -> main

    saStoreVault: (args) => ipcRenderer.invoke('saStoreVault', args),
    saLoadVault: () => ipcRenderer.invoke('saLoadVault'),
});
