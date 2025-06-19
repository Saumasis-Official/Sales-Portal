import config from '../config/server';
import axios from 'axios';
export function url(resource, service = 'auth') {
    
    const baseConfig = config[config.serviceServerName[service]]
    if (!resource) {
        return `${baseConfig.url}${baseConfig.path}${baseConfig.version}`
    }
    return `${baseConfig.url}${baseConfig.path}${baseConfig.version}${baseConfig[resource]}`
}
export function setAuthToken(token) {
    if (token) {
        axios.defaults.headers.common['authorization'] = `${token}`;
    } else {
        delete axios.defaults.headers.common['authorization'];
    }
}
export function setGeoLocation(location) {
    if (location) {
        axios.defaults.headers.common['Location'] = `${location.lng},${location.lat}`;
    } else {
        delete axios.defaults.headers.common['Location'];
    }
}
export function getAuthToken() {
    return localStorage.token;
}