import * as msal from '@azure/msal-browser'
import { CONFIG } from '../config'
import { cache } from './CacheManager'

let msalInstance: msal.PublicClientApplication

export async function initializeMSAL(): Promise<boolean> {
  try {
    msalInstance = new msal.PublicClientApplication({
      auth: CONFIG.msal,
      cache: { cacheLocation: 'localStorage', storeAuthStateInCookie: false },
    })
    await msalInstance.initialize()
    return true
  } catch (error) {
    console.error('Error inicializando MSAL:', error)
    return false
  }
}

export async function getAccessToken(): Promise<string | null> {
  const accounts = msalInstance.getAllAccounts()
  if (accounts.length === 0) return null
  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes: [...CONFIG.scopes],
      account: accounts[0],
    })
    return response.accessToken
  } catch (_) {
    return null
  }
}

export async function login(): Promise<{ name: string; email: string; token: string }> {
  const response = await msalInstance.loginPopup({ scopes: [...CONFIG.scopes] })
  msalInstance.setActiveAccount(response.account)
  return {
    name: response.account!.name!,
    email: response.account!.username,
    token: response.accessToken,
  }
}

export async function logout(): Promise<void> {
  try {
    cache.clear()
    await msalInstance.logoutPopup()
  } catch (_) { /* ignore */ }
}

export function getMsalInstance(): msal.PublicClientApplication {
  return msalInstance
}
