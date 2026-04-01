import { CONFIG } from '../../lib/config';
import { cache } from '../storage/cache';

export class GraphAPIClient {
        constructor(accessToken) { this.accessToken = accessToken; this.baseUrl = 'https://graph.microsoft.com/v1.0'; }
        async request(endpoint, options = {}) {
            const url = this.baseUrl + endpoint;
            const headers = { 'Authorization': 'Bearer ' + this.accessToken, 'Content-Type': 'application/json', ...options.headers };
            try {
                const response = await fetch(url, { ...options, headers });
                if (!response.ok) { const error = await response.json(); throw new Error(error.error?.message || 'HTTP ' + response.status); }
                if (response.status === 204) return null;
                return await response.json();
            } catch(error) { console.error('Graph API Error:', error); throw error; }
        }
        async getListItems(listName, forceRefresh = false) {
            if (!forceRefresh) {
                const cached = cache.get(listName);
                if (cached) return cached;
            }
            let endpoint = '/sites/' + CONFIG.sharepoint.sitePath + ':/lists/' + listName + '/items?expand=fields&$top=500';
            let allItems = [];
            // Paginación con @odata.nextLink
            while (endpoint) {
                const result = await this.request(endpoint);
                const page = (result.value || []).map(item => ({ ...item.fields, sharePointId: item.id }));
                allItems = allItems.concat(page);
                const nextLink = result['@odata.nextLink'];
                if (nextLink) {
                    // nextLink es una URL completa, extraer solo el path+query relativo
                    endpoint = nextLink.replace(this.baseUrl, '');
                } else {
                    endpoint = null;
                }
            }
            cache.set(listName, allItems);
            return allItems;
        }
        async createListItem(listName, data) {
            const endpoint = '/sites/' + CONFIG.sharepoint.sitePath + ':/lists/' + listName + '/items';
            const result = await this.request(endpoint, { method: 'POST', body: JSON.stringify({ fields: data }) });
            cache.clearKey(listName); // Invalida la caché de esta lista
            return { ...result.fields, sharePointId: result.id };
        }
        async updateListItem(listName, itemId, data) {
            const endpoint = '/sites/' + CONFIG.sharepoint.sitePath + ':/lists/' + listName + '/items/' + itemId + '/fields';
            await this.request(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
            cache.clearKey(listName); // Invalida la caché de esta lista
            return true;
        }
        async deleteListItem(listName, itemId) {
            const endpoint = '/sites/' + CONFIG.sharepoint.sitePath + ':/lists/' + listName + '/items/' + itemId;
            await this.request(endpoint, { method: 'DELETE' });
            cache.clearKey(listName); // Invalida la caché de esta lista
            return true;
        }
        async getCurrentUser() { return await this.request('/me'); }
        async searchUsers(searchTerm) {
            if (!searchTerm || searchTerm.length < 2) return [];
            try {
                const endpoint = "/users?$filter=startswith(displayName,'" + searchTerm + "') or startswith(givenName,'" + searchTerm + "') or startswith(surname,'" + searchTerm + "')&$select=id,displayName,mail,department,jobTitle&$top=10";
                const result = await this.request(endpoint);
                return result.value || [];
            } catch(error) {
                try {
                    const result = await this.request('/users?$search="displayName:' + searchTerm + '"&$select=id,displayName,mail,department,jobTitle&$top=10', { headers: { 'ConsistencyLevel': 'eventual' } });
                    return result.value || [];
                } catch(e) { return []; }
            }
        }
    }