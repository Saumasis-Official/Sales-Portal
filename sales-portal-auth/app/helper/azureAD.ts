import configuration from '../config/environments/dev';
import jwt from 'jsonwebtoken';
import { ConfidentialClientApplication } from '@azure/msal-node';

const msalConfig = {
    auth: {
        clientId: configuration.azureAD['clientID'],
        authority: configuration.azureAD['authority'],
        clientSecret: configuration.azureAD['secret'],
    },
};
const tokenRequest = {
    scopes: configuration.azureAD['scopes'],
};

let cca: any = {
    acquireTokenByClientCredential: async () => {
        return { accessToken: 'test' };
    },
};

if (process.env.NODE_ENV !== 'test') {
    cca = new ConfidentialClientApplication(msalConfig);
}

let token: any;

const fetchToken = async () => {
    return (await cca.acquireTokenByClientCredential(tokenRequest))?.accessToken;
};

const getToken = async () => {
    if (!token) {
        token = await fetchToken();
    }
    const expTime = new Date(jwt.decode(token) ? jwt.decode(token).exp * 1000 : 0);
    const nowTime = new Date();
    const diffSecs: number = (Number(expTime) - Number(nowTime)) / 1000;

    if (diffSecs <= 0) {
        token = await fetchToken();
    }
    return token;
};

const getEmailSearchUrl = (searchText: string) => {
    return configuration.azureAD['email_search_uri'].replace('#email#', searchText);
};

const getApiHeader = async () => {
    return {
        headers: {
            Authorization: `Bearer ${await getToken()}`,
            ConsistencyLevel: 'eventual',
        },
    };
};

export default {
    getToken,
    getEmailSearchUrl,
    getApiHeader,
};
