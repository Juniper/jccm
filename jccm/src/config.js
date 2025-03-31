import NodeCache from 'node-cache';

export const CloudInfo = {
    mist: {
        description: 'Juniper MIST Wired / WAN Assurance + JSI',
        lookupApiUrl: 'https://api.mist.com/api/v1/sso/lookup',
    },
    jmra: {
        description: 'Juniper MIST Routing Assurance + JSI',
        lookupApiUrl: 'https://routing.ai.juniper.net/api/v1/login/lookup',
    },
    jsi: {
        description: 'Juniper Support Insights [JSI]',
        lookupApiUrl: 'https://jsi.ai.juniper.net/api/v1/login/lookup',
    },
};

export const getCloudInfoMinVersion = () => {
    return Object.entries(CloudInfo).map(([key, value]) => ({
        id: key,
        description: value.description,
    }));
};
