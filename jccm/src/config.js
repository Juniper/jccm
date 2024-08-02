import NodeCache from 'node-cache';

export const CloudInfo = {
    mist: {
        description: 'Juniper Mist Cloud',
        lookupApiUrl: 'https://api.mist.com/api/v1/sso/lookup',
    },
    jsi: {
        description: 'Juniper Support Insights',
        lookupApiUrl: 'https://jsi.ai.juniper.net/api/v1/login/lookup',
    },
    juniper: {
        description: 'Juniper Routing Assurance',
        lookupApiUrl: 'https://routing.ai.juniper.net/api/v1/login/lookup',
    },
};

export const getCloudInfoMinVersion = () => {
    return Object.entries(CloudInfo).map(([key, value]) => ({
        id: key,
        description: value.description,
    }));
};
