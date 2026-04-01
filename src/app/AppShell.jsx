import { T } from '../lib/i18n';
import { CONFIG } from '../lib/config';
import { startBarcodeScanner } from '../services/scanner/scannerService';
import LoginScreen from '../features/auth/LoginScreen';
import Dashboard from '../features/dashboard/Dashboard';
import InventoryView from '../features/inventory/InventoryView';
import HistoryView from '../features/history/HistoryView';
import AssignmentsView from '../features/assignments/AssignmentsView';
import EquiposView from '../features/equipment/EquiposView';
import AdminPanel from '../features/admin/AdminPanel';
import MobileView from '../features/mobile/MobileView';
import FormModal from '../components/modals/FormModal';
import ConfirmModal from '../components/modals/ConfirmModal';

function renderActiveTab(controller) {
    const { ui, viewState, actions } = controller;

    if (ui.activeTab === 'dashboard') {
        return <Dashboard state={viewState} onNavigate={actions.handleNavigate} />;
    }

    if (ui.activeTab === 'inventario') {
        return <InventoryView state={viewState} onRefresh={actions.refreshData} onOpenModal={actions.openModal} initialFilter={ui.tabFilter} />;
    }

    if (ui.activeTab === 'equipos') {
        return <EquiposView state={viewState} onRefresh={actions.refreshData} initialFilter={ui.tabFilter} deepLinkEquipo={ui.deepLinkEquipo} onClearDeepLink={actions.clearDeepLink} />;
    }

    if (ui.activeTab === 'asignaciones') {
        return <AssignmentsView state={viewState} onRefresh={actions.refreshData} onOpenModal={actions.openModal} initialFilter={ui.tabFilter} />;
    }

    if (ui.activeTab === 'historial') {
        return <HistoryView state={viewState} onRefresh={actions.refreshData} onOpenModal={actions.openModal} initialFilter={ui.tabFilter} />;
    }

    return (
        <AdminPanel
            state={viewState}
            onRefresh={actions.refreshData}
            onSetStockMinimo={actions.setStockMinimoDefault}
            isAdmin={controller.session.isAdmin}
        />
    );
}

function getConfirmMessage(confirmAction, selectedItem) {
    if (!confirmAction) return '';

    if (confirmAction.type === 'eliminar-producto') {
        return '¿Eliminar "' + (selectedItem?.nombre || '') + '"?';
    }

    if (confirmAction.type === 'eliminar-historial') {
        return '¿Eliminar el registro del ' + new Date(selectedItem?.fecha).toLocaleDateString() + '?';
    }

    if (confirmAction.type === 'eliminar-asignacion') {
        return '¿Eliminar la asignacion de ' + (selectedItem?.nombreEmpleado || '') + '?';
    }

    return '¿' + (selectedItem?.activo ? 'Desactivar' : 'Activar') + ' a ' + (selectedItem?.nombre || '') + '?';
}

export default function AppShell({ controller }) {
    const { session, ui, stats, globalResults, isMobile, formModalTypes, getLastSyncText, viewState, actions } = controller;

    if (session.loading) {
        return (
            <div className="global-loading">
                <div className="loading-spinner" />
                <p className="global-loading-text">{T(ui.language).loading}</p>
            </div>
        );
    }

    if (!session.user) {
        return <LoginScreen onLogin={actions.handleLogin} />;
    }

    if (isMobile && !session.isAdmin) {
        return <MobileView state={viewState} onRefresh={actions.refreshData} onOpenModal={actions.openModal} />;
    }

    if (session.accessDenied) {
        return (
            <div className="login-screen">
                <div className="login-box" style={{ borderColor: 'var(--accent-red)' }}>
                    <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>🚫</span>
                    <h1 style={{ color: 'var(--accent-red)', marginBottom: '16px' }}>{T(ui.language).accessDenied}</h1>
                    <p style={{ marginBottom: '8px' }}>{T(ui.language).accessDeniedMsg}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '32px' }}>{T(ui.language).accessDeniedSub}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>{session.user.email}</p>
                    <button className="button button-secondary" onClick={actions.handleLogout} style={{ width: '100%' }}>
                        {T(ui.language).tryOtherAccount}
                    </button>
                </div>
            </div>
        );
    }

    const labels = {
        dashboard: T(ui.language).dashboard,
        inventario: T(ui.language).inventory,
        equipos: T(ui.language).equipment,
        asignaciones: T(ui.language).assignments,
        historial: T(ui.language).history,
    };

    return (
        <div key={'app-' + ui.language} className="app-container">
            <header className="header">
                <div className="header-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src="https://sanlucar.com/wp-content/uploads/2023/03/SanLucar_LOGO_final.svg" alt="Sanlúcar" style={{ height: '32px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} onError={(event) => { event.target.style.display = 'none'; }} />
                        <h1>{T(ui.language).appTitle}</h1>
                        <span style={{ fontSize: '12px', padding: '4px 8px', background: 'rgba(88,166,255,.15)', color: 'var(--accent-blue)', borderRadius: '6px', fontFamily: 'IBM Plex Mono,monospace', fontWeight: '600' }}>v{CONFIG.version}</span>
                    </div>
                    <div className="user-badges">
                        <span className={'user-badge ' + (session.isAdmin ? 'admin' : 'technician')}>
                            {session.isAdmin ? '🛡️ Admin' : '🔧 Técnico'}: {session.user.name}
                        </span>
                    </div>
                </div>

                <div style={{ flex: 1, maxWidth: '400px', position: 'relative', margin: '0 16px' }}>
                    <input
                        type="text"
                        className="search-bar"
                        placeholder={T(ui.language).globalSearch}
                        value={ui.globalSearch}
                        onChange={(event) => actions.setGlobalSearch(event.target.value)}
                        onBlur={() => setTimeout(actions.hideGlobalResults, 200)}
                        style={{ width: '100%', paddingRight: '44px' }}
                    />
                    <button
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}
                        onClick={() => startBarcodeScanner((code) => actions.setGlobalSearch(code))}
                    >
                        📷
                    </button>
                    {ui.showGlobalResults && globalResults.length > 0 && (
                        <div className="user-search-dropdown" style={{ top: '100%', zIndex: 9999 }}>
                            {globalResults.map((result, index) => (
                                <div key={result.type + '-' + index} className="user-search-item" onMouseDown={() => actions.selectGlobalResult(result)}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '16px' }}>{result.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{result.label}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono,monospace' }}>{result.sub}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="header-stats">
                    <div className="stat-item">
                        <div className="stat-label">{T(ui.language).products}</div>
                        <div className="stat-value blue">{stats.totalProductos}</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-label">{T(ui.language).units}</div>
                        <div className="stat-value green">{stats.totalUnidades}</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-label">{T(ui.language).lowStock}</div>
                        <div className="stat-value orange">{stats.stockBajo}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                        {ui.lastSync && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{getLastSyncText()}</span>}
                        <button onClick={() => actions.syncData(true)} disabled={ui.syncing} style={{ background: ui.syncing ? 'var(--bg-secondary)' : 'var(--accent-blue)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: ui.syncing ? 'wait' : 'pointer', fontSize: '14px', fontWeight: '600' }}>
                            {ui.syncing ? T(ui.language).syncing : T(ui.language).sync}
                        </button>
                    </div>
                    <select value={ui.language} onChange={(event) => actions.setLanguage(event.target.value)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'IBM Plex Mono,monospace', outline: 'none' }}>
                        <option value="es">🇪🇸 Español</option>
                        <option value="en">🇬🇧 English</option>
                    </select>
                    <button className="button button-secondary" onClick={actions.handleLogout}>
                        {T(ui.language).logout}
                    </button>
                </div>
            </header>

            <nav className="nav-tabs">
                {['dashboard', 'inventario', 'equipos', 'asignaciones', 'historial'].map((tab) => {
                    const pendingCount = tab === 'equipos' ? (viewState.activos || []).filter((item) => item.estado === 'Pendiente').length : 0;
                    return (
                        <button key={tab} className={'tab-button ' + (ui.activeTab === tab ? 'active' : '')} onClick={() => actions.handleTabChange(tab)}>
                            {labels[tab]}
                            {pendingCount > 0 ? <span style={{ background: 'var(--accent-orange)', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '700', marginLeft: '4px' }}>{pendingCount}</span> : null}
                        </button>
                    );
                })}
                <button className={'tab-button ' + (ui.activeTab === 'admin' ? 'active' : '')} onClick={() => actions.handleTabChange('admin')} style={{ background: ui.activeTab === 'admin' ? 'var(--accent-purple)' : '', borderColor: 'var(--accent-purple)', borderWidth: '1px', borderStyle: 'solid' }}>
                    {T(ui.language).admin}
                </button>
            </nav>

            <div className="content-section">{renderActiveTab(controller)}</div>

            {ui.modalType && !ui.showConfirm && formModalTypes.includes(ui.modalType) ? (
                <FormModal state={viewState} modalType={ui.modalType} selectedItem={ui.selectedItem} onClose={actions.closeModal} onRefresh={actions.refreshData} />
            ) : null}

            {ui.showConfirm ? (
                <ConfirmModal message={getConfirmMessage(ui.confirmAction, ui.selectedItem)} onConfirm={actions.confirmAction} onCancel={actions.closeModal} loading={false} />
            ) : null}
        </div>
    );
}
