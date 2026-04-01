import { CONFIG } from '../../lib/config';
import { cache } from '../storage/cache';

let msalInstance = null;

export async function initialize() {
    try {
        msalInstance = new msal.PublicClientApplication({ auth: CONFIG.msal, cache: { cacheLocation: 'localStorage', storeAuthStateInCookie: false } });
        await msalInstance.initialize();
        return true;
    } catch (error) {
        console.error('Error inicializando MSAL:', error);
        return false;
    }
}

export function getInstance() {
    return msalInstance;
}

export async function getAccessToken() {
    const accounts = msalInstance?.getAllAccounts() || [];
    if (accounts.length === 0) return null;
    try {
        const response = await msalInstance.acquireTokenSilent({ scopes: CONFIG.scopes, account: accounts[0] });
        return response.accessToken;
    } catch (error) {
        return null;
    }
}

export async function login() {
    const response = await msalInstance.loginPopup({ scopes: CONFIG.scopes });
    msalInstance.setActiveAccount(response.account);
    return { name: response.account.name, email: response.account.username, token: response.accessToken };
}

export async function logout() {
    try {
        cache.clear();
        await msalInstance?.logoutPopup();
    } catch (error) {}
}