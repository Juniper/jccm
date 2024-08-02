const { electronAPI } = window;

export const adoptDevices = async (device, jsiTerm=false) => {
    const { address, port, username, password, organization, site } = device;
    const response = await electronAPI.saAdoptDevice({ address, port, username, password, organization, site, jsiTerm });

    if (response.adopt) {
        return { status: true, result: response.result };
    } else {
        console.log('adoptDevice has failed', response);
        return { status: false, result: response.result };
    }
};

export const releaseDevices = async (device, serialNumber) => {
    const { organization } = device;
    const response = await electronAPI.saReleaseDevice({ organization, serial: serialNumber });

    if (response.release) {
        return { status: true, result: response.result };
    } else {
        console.log('releaseDevices has failed', response);
        return { status: false, result: response.result };
    }
};

export const executeJunosCommand = async (device, command) => {
    const { address, port, username, password } = device.data;
    const timeout = 5000;
    const response = await electronAPI.saExecuteJunosCommand({ address, port, username, password, command, timeout });

    if (response.command) {
        return { status: true, result: response.reply };
    } else {
        console.log('executeJunosCommand has failed', response);
        return { status: false, result: response.reply  };
    }
};

export const getDeviceFacts = async (device, upperSerialNumber=false) => {
    const { address, port, username, password, timeout } = device;
    const response = await electronAPI.saGetDeviceFacts({ address, port, username, password, timeout, upperSerialNumber });

    if (response.facts) {
        return { status: true, result: response.reply };
    } else {
        return { status: false, result: response.reply  };
    }
};

