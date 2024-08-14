export const getHostCount = (subnet) => {
    const prefixLength = parseInt(subnet.split('/')[1], 10);
    let hostCount;

    if (prefixLength === 32) {
        hostCount = 1;
    } else if (prefixLength === 31) {
        hostCount = 2;
    } else if (24 < prefixLength && prefixLength <= 30) {
        hostCount = 2 ** (32 - prefixLength) - 2;
    } else {
        const numSubnets = 2 ** (24 - prefixLength);
        hostCount = numSubnets * 254;
    }
    if (hostCount < 0) hostCount = 0;

    return hostCount;
};

export const getHostCountMultiple = (subnets) => {
    let totalCount = 0;
    for (const v of subnets) {
        const { subnet } = v;
        const hostCount = getHostCount(subnet);
        totalCount += hostCount;
    }
    return totalCount;
};

export const ipToString = (ipn) => {
    const a = (ipn >> 24) & 0xff;
    const b = (ipn >> 16) & 0xff;
    const c = (ipn >> 8) & 0xff;
    const d = (ipn >> 0) & 0xff;
    return `${a}.${b}.${c}.${d}`;
};

export const stringToIp = (ips) => {
    const v = ips.split('.').map((part) => parseInt(part, 10));
    const ipn = v[0] * 2 ** 24 + v[1] * 2 ** 16 + v[2] * 2 ** 8 + v[3];
    return ipn;
};

export const getNetworkAddress = (ips, prefixLength) => {
    const ipn = stringToIp(ips);
    const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
    const network = ipn & mask;
    return ipToString(network);
};

export const cleanupSubnet = (subnet) => {
    const [ips, prefix] = subnet.split('/');
    const prefixLength = parseInt(prefix, 10);

    const ipn = stringToIp(ips);
    const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
    const network = ipn & mask;
    return `${ipToString(network)}/${prefixLength}`;
};


export function* _getSubnetList(subnet) {
    const [baseIp, prefix] = subnet.split('/');
    const prefixLength = parseInt(prefix, 10);

    if (24 < prefixLength) {
        const baseIpNum = stringToIp(baseIp) & (0xffffffff << (32 - prefixLength) >>> 0);
        const subnetString = `${ipToString(baseIpNum)}/${prefixLength}`;
        yield subnetString;
        return;
    }

    const baseIpNum = stringToIp(baseIp) & 0xffffff00;
    const numSubnets = 2 ** (24 - prefixLength);

    for (let i = 0; i < numSubnets; i++) {
        const subnetNum = baseIpNum + i * 2 ** 8;
        const subnetString = `${ipToString(subnetNum)}/24`;
        yield subnetString;
    }
}

export function* _getHostList(subnet) {
    for (const s of _getSubnetList(subnet)) {
        const [baseIp, prefix] = s.split('/');
        const prefixLength = parseInt(prefix, 10);
        const networkAddress = getNetworkAddress(baseIp, prefixLength);
        const startIpNum = stringToIp(networkAddress);

        if (prefixLength === 32) {
            yield networkAddress;
        } else if (prefixLength === 31) {
            yield networkAddress;
            const nextIp = ipToString(startIpNum + 1);
            yield nextIp;
        } else {
            const hostCount = 2 ** (32 - prefixLength);
            for (let i = 1; i < hostCount - 1; i++) {
                const nextIp = ipToString(startIpNum + i);
                yield nextIp;
            }
        }
    }
}

export function* getHostListMultiple(subnets) {
    console.log('getHostListMultiple...');
    for (const v of subnets) {
        const { subnet, port, username, password } = v;
        for (const host of _getHostList(subnet)) {
            yield { address: host, host, port, username, password };
        }
    }
}
