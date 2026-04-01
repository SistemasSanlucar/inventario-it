import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentLang, setCurrentLang } from '../lib/i18n';
import { GraphAPIClient } from '../services/graph/GraphApiClient';
import { DataManager } from '../services/data/DataManager';
import * as authService from '../services/auth/msal';
import { setRuntimeServices, clearRuntimeServices, getDataManager } from '../services/runtime';
import { cache } from '../services/storage/cache';
import { showToast } from '../components/feedback/toast';
import { useIsMobile } from '../hooks/useIsMobile';

const CONFIRM_TYPES = ['eliminar-producto', 'eliminar-historial', 'toggle-tecnico', 'eliminar-asignacion'];
const FORM_MODAL_TYPES = ['entrada', 'salida', 'editar', 'tecnico', 'nueva-asignacion', 'nuevo-prestamo', 'ver-asignacion', 'devolver-material', 'duplicar', 'baja-empleado'];

function getStoredStockMinimo() {
    if (typeof window === 'undefined') return 2;
    return parseInt(localStorage.getItem('stockMinimoDefault') || '2', 10);
}

const initialSession = {
    user: null,
    isAdmin: false,
    accessDenied: false,
    loading: true,
};

const initialData = {
    inventory: [],
    technicians: [],
    history: [],
    assignments: [],
    catalogo: {},
    catalogoTipos: {},
    catalogoAccesorios: {},
    activos: [],
    ubicaciones: [],
    ubicacionesAll: [],
    adminsAll: [],
    sociedades: [],
    proveedores: [],
};

function buildInitialUi() {
    return {
        activeTab: 'dashboard',
        syncing: false,
        lastSync: null,
        modalType: null,
        selectedItem: null,
        showConfirm: false,
        confirmAction: null,
        tabFilter: null,
        language: getCurrentLang(),
        globalSearch: '',
        showGlobalResults: false,
        deepLinkEquipo: null,
    };
}

const initialPreferences = {
    stockMinimoDefault: getStoredStockMinimo(),
};

export function useInventoryApp() {
    const [session, setSession] = useState(initialSession);
    const [data, setData] = useState(initialData);
    const [ui, setUi] = useState(buildInitialUi);
    const [preferences, setPreferences] = useState(initialPreferences);
    const isMobile = useIsMobile();

    const applyLoadedData = useCallback((loadedData, extra = {}) => {
        setData({
            inventory: loadedData.inventory || [],
            technicians: loadedData.technicians || [],
            history: loadedData.history || [],
            assignments: loadedData.assignments || [],
            catalogo: loadedData.catalogo || {},
            catalogoTipos: loadedData.catalogoTipos || {},
            catalogoAccesorios: loadedData.catalogoAccesorios || {},
            activos: loadedData.activos || [],
            ubicaciones: loadedData.ubicaciones || [],
            ubicacionesAll: loadedData.ubicacionesAll || [],
            adminsAll: loadedData.adminsAll || [],
            sociedades: loadedData.sociedades || [],
            proveedores: loadedData.proveedores || [],
        });

        if (extra.session) {
            setSession((current) => ({ ...current, ...extra.session }));
        }

        setUi((current) => ({
            ...current,
            syncing: false,
            lastSync: new Date(),
            ...(extra.ui || {}),
        }));
    }, []);

    const initializeApp = useCallback(async () => {
        try {
            const msalReady = await authService.initialize();
            if (!msalReady) {
                throw new Error('MSAL init failed');
            }

            const accounts = authService.getInstance()?.getAllAccounts() || [];
            if (accounts.length === 0) {
                setSession((current) => ({ ...current, loading: false }));
                return;
            }

            const token = await authService.getAccessToken();
            if (!token) {
                setSession((current) => ({ ...current, loading: false }));
                return;
            }

            const graphClient = new GraphAPIClient(token);
            const dataManager = new DataManager(graphClient);
            setRuntimeServices({ graphClient, dataManager });

            const currentUser = await graphClient.getCurrentUser();
            const loadedData = await dataManager.loadAllData();

            const isAdmin = (loadedData.admins || []).some((item) => item.Email && item.Email.toLowerCase() === currentUser.mail.toLowerCase() && (item.Activo === true || item.Activo === 'Yes'));
            const isTechnician = (loadedData.technicians || []).some((item) => item.email && item.email.toLowerCase() === currentUser.mail.toLowerCase() && item.activo);

            if (!isAdmin && !isTechnician) {
                setSession({
                    user: { name: currentUser.displayName, email: currentUser.mail },
                    isAdmin: false,
                    accessDenied: true,
                    loading: false,
                });
                return;
            }

            applyLoadedData(loadedData, {
                session: {
                    user: { name: currentUser.displayName, email: currentUser.mail },
                    isAdmin,
                    accessDenied: false,
                    loading: false,
                },
                ui: {
                    syncing: false,
                },
            });

            showToast('Bienvenido, ' + currentUser.displayName, 'success');

            const params = new URLSearchParams(window.location.search);
            const equipoId = params.get('equipo');
            if (equipoId) {
                const activo = (loadedData.activos || []).find((item) => item.idEtiqueta === equipoId.toUpperCase());
                if (activo) {
                    setUi((current) => ({ ...current, activeTab: 'equipos', deepLinkEquipo: activo }));
                } else {
                    showToast('Equipo no encontrado: ' + equipoId, 'warning');
                }
                window.history.replaceState({}, '', window.location.pathname);
            }
        } catch (error) {
            console.error('Error inicializando app:', error);
            showToast('Error cargando la aplicacion', 'error');
            setSession((current) => ({ ...current, loading: false }));
        }
    }, [applyLoadedData]);

    useEffect(() => {
        initializeApp();
    }, [initializeApp]);

    const refreshData = useCallback(async () => {
        const dataManager = getDataManager();
        if (!dataManager) return;
        try {
            const loadedData = await dataManager.loadAllData();
            applyLoadedData(loadedData);
        } catch (error) {
            console.error('Error refreshing:', error);
        }
    }, [applyLoadedData]);

    const handleLogin = useCallback(async () => {
        try {
            await authService.login();
            await initializeApp();
        } catch (error) {
            showToast('Error al iniciar sesion', 'error');
        }
    }, [initializeApp]);

    const handleLogout = useCallback(async () => {
        await authService.logout();
        clearRuntimeServices();
        setSession({
            user: null,
            isAdmin: false,
            accessDenied: false,
            loading: false,
        });
        setData(initialData);
        setUi(buildInitialUi());
        setPreferences({
            stockMinimoDefault: getStoredStockMinimo(),
        });
        showToast('Sesion cerrada correctamente', 'success');
    }, []);

    const syncData = useCallback(async (showMessage) => {
        const dataManager = getDataManager();
        if (!dataManager || ui.syncing) return;
        setUi((current) => ({ ...current, syncing: true }));
        try {
            cache.clear();
            const loadedData = await dataManager.loadAllData();
            applyLoadedData(loadedData, { ui: { syncing: false } });
            if (showMessage) {
                showToast('Sincronizado correctamente', 'success');
            }
        } catch (error) {
            setUi((current) => ({ ...current, syncing: false }));
        }
    }, [applyLoadedData, ui.syncing]);

    const handleTabChange = useCallback((tab) => {
        setUi((current) => ({ ...current, activeTab: tab, tabFilter: null }));
    }, []);

    const handleNavigate = useCallback((tab, filter) => {
        setUi((current) => ({ ...current, activeTab: tab, tabFilter: filter || null }));
    }, []);

    const openModal = useCallback((type, item) => {
        setUi((current) => {
            if (CONFIRM_TYPES.includes(type)) {
                return { ...current, showConfirm: true, confirmAction: { type, item }, modalType: null, selectedItem: item || null };
            }
            return { ...current, modalType: type, selectedItem: item || null, showConfirm: false, confirmAction: null };
        });
    }, []);

    const closeModal = useCallback(() => {
        setUi((current) => ({ ...current, modalType: null, selectedItem: null, showConfirm: false, confirmAction: null }));
    }, []);

    const confirmAction = useCallback(async () => {
        const dataManager = getDataManager();
        if (!dataManager || !ui.confirmAction) return;

        try {
            if (ui.confirmAction.type === 'eliminar-producto') {
                await dataManager.deleteInventoryItem(ui.confirmAction.item.id);
                showToast('Producto eliminado', 'success');
            } else if (ui.confirmAction.type === 'eliminar-historial') {
                await dataManager.deleteHistoryItem(ui.confirmAction.item.id);
                showToast('Registro eliminado', 'success');
            } else if (ui.confirmAction.type === 'toggle-tecnico') {
                await dataManager.toggleTechnicianStatus(ui.confirmAction.item.id, ui.confirmAction.item.activo);
                showToast('Estado actualizado', 'success');
            } else if (ui.confirmAction.type === 'eliminar-asignacion') {
                await dataManager.deleteAssignment(ui.confirmAction.item.id);
                showToast('Asignacion eliminada', 'success');
            }

            setUi((current) => ({ ...current, showConfirm: false, confirmAction: null }));
            const loadedData = await dataManager.loadAllData();
            applyLoadedData(loadedData);
        } catch (error) {
            console.error('Error:', error);
            showToast('Error: ' + error.message, 'error');
        }
    }, [applyLoadedData, ui.confirmAction]);

    const setLanguage = useCallback((language) => {
        setCurrentLang(language);
        setUi((current) => ({ ...current, language }));
    }, []);

    const setGlobalSearch = useCallback((value) => {
        setUi((current) => ({
            ...current,
            globalSearch: value,
            showGlobalResults: value.length >= 2,
        }));
    }, []);

    const hideGlobalResults = useCallback(() => {
        setUi((current) => ({ ...current, showGlobalResults: false }));
    }, []);

    const selectGlobalResult = useCallback((result) => {
        setUi((current) => ({
            ...current,
            activeTab: result.tab,
            globalSearch: '',
            showGlobalResults: false,
            tabFilter: null,
        }));
    }, []);

    const clearDeepLink = useCallback(() => {
        setUi((current) => ({ ...current, deepLinkEquipo: null }));
    }, []);

    const setStockMinimoDefault = useCallback((value) => {
        localStorage.setItem('stockMinimoDefault', String(value));
        setPreferences({ stockMinimoDefault: value });
    }, []);

    const stats = useMemo(() => ({
        totalProductos: data.inventory.length,
        totalUnidades: data.inventory.reduce((sum, item) => sum + item.stock, 0),
        stockBajo: data.inventory.filter((item) => item.stock > 0 && item.stock <= item.stockMinimo).length,
        movimientosHoy: data.history.filter((entry) => new Date(entry.fecha).toDateString() === new Date().toDateString()).length,
    }), [data.history, data.inventory]);

    const globalResults = useMemo(() => {
        if (ui.globalSearch.length < 2) return [];
        const query = ui.globalSearch.toLowerCase();
        const results = [];

        (data.inventory || []).forEach((item) => {
            if ((item.nombre || '').toLowerCase().includes(query) || (item.barcode || '').includes(query)) {
                results.push({ type: 'inventory', icon: '📦', label: item.nombre, sub: item.barcode, tab: 'inventario' });
            }
        });

        (data.activos || []).forEach((item) => {
            if ((item.idEtiqueta || '').toLowerCase().includes(query) || (item.numSerie || '').toLowerCase().includes(query) || (item.modelo || '').toLowerCase().includes(query)) {
                results.push({ type: 'equipo', icon: '💻', label: item.tipo + ' · ' + item.modelo, sub: item.idEtiqueta, tab: 'equipos' });
            }
        });

        (data.assignments || [])
            .filter((item) => item.estado === 'Activo')
            .forEach((item) => {
                if ((item.nombreEmpleado || '').toLowerCase().includes(query) || (item.emailEmpleado || '').toLowerCase().includes(query)) {
                    results.push({ type: 'asignacion', icon: '📋', label: item.nombreEmpleado, sub: item.emailEmpleado, tab: 'asignaciones' });
                }
            });

        return results.slice(0, 8);
    }, [data.activos, data.assignments, data.inventory, ui.globalSearch]);

    const getLastSyncText = useCallback(() => {
        if (!ui.lastSync) return '';
        const diff = Math.floor((new Date() - ui.lastSync) / 1000);
        if (diff < 60) return 'Hace un momento';
        if (diff < 3600) return 'Hace ' + Math.floor(diff / 60) + ' min';
        return 'Hace ' + Math.floor(diff / 3600) + 'h';
    }, [ui.lastSync]);

    const viewState = useMemo(() => ({
        ...session,
        ...data,
        activeTab: ui.activeTab,
        syncing: ui.syncing,
        lastSync: ui.lastSync,
        modalType: ui.modalType,
        selectedItem: ui.selectedItem,
        showConfirm: ui.showConfirm,
        confirmAction: ui.confirmAction,
        tabFilter: ui.tabFilter,
        lang: ui.language,
        globalSearch: ui.globalSearch,
        showGlobalResults: ui.showGlobalResults,
        deepLinkEquipo: ui.deepLinkEquipo,
        stockMinimoDefault: preferences.stockMinimoDefault,
    }), [data, preferences.stockMinimoDefault, session, ui]);

    return {
        session,
        data,
        ui,
        preferences,
        viewState,
        stats,
        globalResults,
        isMobile,
        formModalTypes: FORM_MODAL_TYPES,
        getLastSyncText,
        actions: {
            handleLogin,
            handleLogout,
            refreshData,
            syncData,
            handleTabChange,
            handleNavigate,
            openModal,
            closeModal,
            confirmAction,
            setLanguage,
            setGlobalSearch,
            hideGlobalResults,
            selectGlobalResult,
            clearDeepLink,
            setStockMinimoDefault,
        },
    };
}
