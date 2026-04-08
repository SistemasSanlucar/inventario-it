import { getAccessToken } from './auth'
import { cache } from './CacheManager'
import { CONFIG } from '../config'
import { ErrorLog } from './ErrorLog'

export class GraphAPIClient {
  private accessToken: string
  private baseUrl = 'https://graph.microsoft.com/v1.0'

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async getValidToken(): Promise<string> {
    try {
      const fresh = await getAccessToken()
      if (fresh) {
        this.accessToken = fresh
        return fresh
      }
    } catch (_) { /* ignore */ }
    return this.accessToken
  }

  async request(endpoint: string, options: { method?: string; body?: string; headers?: Record<string, string> } = {}): Promise<any> {
    const token = await this.getValidToken()
    const url = endpoint.startsWith('http') ? endpoint : this.baseUrl + endpoint
    const headers: Record<string, string> = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...options.headers,
    }
    try {
      const response = await fetch(url, { ...options, headers })
      if (response.status === 401) {
        ErrorLog.warn('GraphAPI', 'Token expirado, reintentando login silencioso...')
        try {
          const newToken = await getAccessToken()
          if (newToken) {
            this.accessToken = newToken
            const retry = await fetch(url, {
              ...options,
              headers: { ...headers, Authorization: 'Bearer ' + newToken },
            })
            if (!retry.ok) {
              const err = await retry.json()
              throw new Error(err.error?.message || 'HTTP ' + retry.status)
            }
            if (retry.status === 204) return null
            return await retry.json()
          }
        } catch (retryErr: any) {
          ErrorLog.error('GraphAPI.tokenRefresh', retryErr.message || 'No se pudo refrescar el token')
        }
      }
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || 'HTTP ' + response.status)
      }
      if (response.status === 204) return null
      return await response.json()
    } catch (error) {
      console.error('Graph API Error:', error)
      throw error
    }
  }

  async getListItems(listName: string, forceRefresh = false): Promise<any[]> {
    if (!forceRefresh) {
      const cached = cache.get(listName) as any[] | null
      if (cached) return cached
    }
    let endpoint: string | null =
      '/sites/' + CONFIG.sharepoint.sitePath + ':/lists/' + listName + '/items?expand=fields&$top=500'
    let allItems: any[] = []
    while (endpoint) {
      const result = await this.request(endpoint)
      const page = (result.value || []).map((item: any) => ({
        ...item.fields,
        sharePointId: item.id,
      }))
      allItems = allItems.concat(page)
      const nextLink = result['@odata.nextLink']
      if (nextLink) {
        endpoint = nextLink.replace(this.baseUrl, '')
      } else {
        endpoint = null
      }
    }
    cache.set(listName, allItems)
    return allItems
  }

  async createListItem(listName: string, data: Record<string, any>): Promise<any> {
    const endpoint = '/sites/' + CONFIG.sharepoint.sitePath + ':/lists/' + listName + '/items'
    const result = await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({ fields: data }),
    })
    cache.clearKey(listName)
    return { ...result.fields, sharePointId: result.id }
  }

  async updateListItem(listName: string, itemId: string, data: Record<string, any>): Promise<boolean> {
    const endpoint =
      '/sites/' + CONFIG.sharepoint.sitePath + ':/lists/' + listName + '/items/' + itemId + '/fields'
    await this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    cache.clearKey(listName)
    return true
  }

  async deleteListItem(listName: string, itemId: string): Promise<boolean> {
    const endpoint =
      '/sites/' + CONFIG.sharepoint.sitePath + ':/lists/' + listName + '/items/' + itemId
    await this.request(endpoint, { method: 'DELETE' })
    cache.clearKey(listName)
    return true
  }

  async getCurrentUser(): Promise<any> {
    return await this.request('/me')
  }

  async searchUsers(searchTerm: string): Promise<any[]> {
    if (!searchTerm || searchTerm.length < 2) return []
    try {
      const endpoint =
        "/users?$filter=startswith(displayName,'" +
        searchTerm +
        "') or startswith(givenName,'" +
        searchTerm +
        "') or startswith(surname,'" +
        searchTerm +
        "')&$select=id,displayName,mail,department,jobTitle&$top=10"
      const result = await this.request(endpoint)
      return result.value || []
    } catch (_) {
      try {
        const result = await this.request(
          '/users?$search="displayName:' +
            searchTerm +
            '"&$select=id,displayName,mail,department,jobTitle&$top=10',
          { headers: { ConsistencyLevel: 'eventual' } }
        )
        return result.value || []
      } catch (_) {
        return []
      }
    }
  }
}
