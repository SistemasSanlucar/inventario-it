import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppShell from './AppShell';

function createController(overrides = {}) {
    return {
        session: {
            user: null,
            isAdmin: false,
            accessDenied: false,
            loading: false,
            ...(overrides.session || {}),
        },
        data: {
            inventory: [],
            history: [],
            activos: [],
            assignments: [],
            ...(overrides.data || {}),
        },
        ui: {
            activeTab: 'dashboard',
            syncing: false,
            lastSync: null,
            modalType: null,
            selectedItem: null,
            showConfirm: false,
            confirmAction: null,
            tabFilter: null,
            language: 'es',
            globalSearch: '',
            showGlobalResults: false,
            deepLinkEquipo: null,
            ...(overrides.ui || {}),
        },
        preferences: {
            stockMinimoDefault: 2,
            ...(overrides.preferences || {}),
        },
        viewState: {
            user: null,
            isAdmin: false,
            accessDenied: false,
            inventory: [],
            history: [],
            activos: [],
            assignments: [],
            stockMinimoDefault: 2,
            ...(overrides.viewState || {}),
        },
        stats: {
            totalProductos: 0,
            totalUnidades: 0,
            stockBajo: 0,
            movimientosHoy: 0,
            ...(overrides.stats || {}),
        },
        globalResults: [],
        isMobile: false,
        formModalTypes: ['entrada'],
        getLastSyncText: () => '',
        actions: {
            handleLogin: vi.fn(),
            handleLogout: vi.fn(),
            refreshData: vi.fn(),
            syncData: vi.fn(),
            handleTabChange: vi.fn(),
            handleNavigate: vi.fn(),
            openModal: vi.fn(),
            closeModal: vi.fn(),
            confirmAction: vi.fn(),
            setLanguage: vi.fn(),
            setGlobalSearch: vi.fn(),
            hideGlobalResults: vi.fn(),
            selectGlobalResult: vi.fn(),
            clearDeepLink: vi.fn(),
            setStockMinimoDefault: vi.fn(),
            ...(overrides.actions || {}),
        },
        ...(overrides.controller || {}),
    };
}

describe('AppShell', () => {
    it('shows a loading screen while session is loading', () => {
        render(<AppShell controller={createController({ session: { loading: true } })} />);
        expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    it('renders the login screen when there is no user', () => {
        render(<AppShell controller={createController()} />);
        expect(screen.getByRole('button', { name: /Iniciar Sesión con Microsoft/i })).toBeInTheDocument();
    });

    it('renders access denied view when the session is blocked', () => {
        render(
            <AppShell
                controller={createController({
                    session: {
                        user: { name: 'Test', email: 'test@sanlucar.com' },
                        accessDenied: true,
                    },
                    viewState: {
                        user: { name: 'Test', email: 'test@sanlucar.com' },
                        accessDenied: true,
                    },
                })}
            />
        );

        expect(screen.getByText('Acceso Denegado')).toBeInTheDocument();
        expect(screen.getByText('test@sanlucar.com')).toBeInTheDocument();
    });
});
