const { electronAPI } = window;

import useStore from '../Common/StateStore';
const { getPasswordFromVault } = useStore.getState(); 

const isVaultFormat = (password) => {
    if (typeof password !== 'string') {
        return false; // Invalid input
    }
    // Check for the `${vault:tag_name}` format
    return password.startsWith('${vault:') && password.endsWith('}') && password.split('${vault:')[1]?.slice(0, -1)?.trim() !== '';
};

export const getPassword = (password) => {
    if (isVaultFormat(password)) {
        // Extract the tag name between `${vault:` and `}`
        const tagName = password.slice(8, -1).trim(); // Remove `${vault:` and trailing `}`
        const v = getPasswordFromVault(tagName); // Fetch from vault
        console.log('vault password:', v);
        return v; // Return the retrieved password
    }
    return password; // Return plain password if not in vault format
};

export const getDeviceFacts = async (device, upperSerialNumber=false, bastionHost = {}) => {
    let { address, port, username, password, timeout } = device;
    password = getPassword(password);

    const response = await electronAPI.saGetDeviceFacts({ address, port, username, password, timeout, upperSerialNumber, bastionHost });

    if (response.facts) {
        return { status: true, result: response.reply };
    } else {
        return { status: false, result: response.reply  };
    }
};

export const adoptDevices = async (device, jsiTerm=false, deleteOutboundSSHTerm=false, bastionHost = {}, ignoreCaseInName = false) => {
    let { address, port, username, password, organization, site } = device;
    password = getPassword(password);

    const response = await electronAPI.saAdoptDevice({ address, port, username, password, organization, site, jsiTerm, deleteOutboundSSHTerm, bastionHost, ignoreCaseInName });

    if (response?.adopt) {
        return { status: true, result: response.reply };
    } else {
        console.log('adoptDevice has failed', response);
        return { status: false, result: response.reply };
    }
};

export const releaseDevices = async (deviceInfo) => {
    const { organization, serialNumber, ignoreCaseInName = false} = deviceInfo;
    const response = await electronAPI.saReleaseDevice({ organization, serial: serialNumber, ignoreCaseInName });

    if (response.release) {
        return { status: true, result: response.reply };
    } else {
        console.log('releaseDevices has failed', response);
        return { status: false, result: response.reply };
    }
};

export const executeJunosCommand = async (device, command) => {
    let { address, port, username, password } = device.data;
    password = getPassword(password);

    const timeout = 5000;
    const response = await electronAPI.saExecuteJunosCommand({ address, port, username, password, command, timeout });

    if (response.command) {
        return { status: true, result: response.reply };
    } else {
        console.log('executeJunosCommand has failed', response);
        return { status: false, result: response.reply  };
    }
};

export const getDeviceNetworkCondition = async (device, bastionHost = {}, termServer='oc-term.mistsys.net', termPort=2200) => {
    let { address, port, username, password, timeout } = device;
    password = getPassword(password);

    const response = await electronAPI.saGetDeviceNetworkCondition({ address, port, username, password, timeout, bastionHost, termServer, termPort });

    if (response.networkConditionCollect) {
        return { status: true, result: response.reply };
    } else {
        return { status: false, result: response.reply  };
    }
};


