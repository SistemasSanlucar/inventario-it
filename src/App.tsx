import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider, useAppContext } from './context/AppContext'
import LoginScreen from './components/auth/LoginScreen'
import AccessDenied from './components/auth/AccessDenied'
import LoadingScreen from './components/shared/LoadingScreen'
import AppLayout from './components/layout/AppLayout'
import MobileView from './components/mobile/MobileView'
import Dashboard from './components/dashboard/Dashboard'
import InventoryView from './components/inventory/InventoryView'
import EquiposView from './components/equipos/EquiposView'
import AssignmentsView from './components/assignments/AssignmentsView'
import HistoryView from './components/history/HistoryView'
import AdminPanel from './components/admin/AdminPanel'
import FormModal from './components/modals/FormModal'
import ConfirmModal from './components/modals/ConfirmModal'
import ErrorBoundary from './components/shared/ErrorBoundary'
import ChangelogModal from './components/changelog/ChangelogModal'
import { CONFIG } from './config'
import { useModal } from './hooks/useModal'
import { useAppData } from './hooks/useAppData'
import { tabFromPath } from './hooks/useTabNavigation'

function AppContent() {
  const auth = useAuth()
  const { state, dispatch, dataManagerRef, graphClientRef } = useAppContext()
  const { modalType, selectedItem, showConfirm, confirmAction, closeModal } = useModal()
  const { refreshData } = useAppData()
  const location = useLocation()
  const navigate = useNavigate()
  const [showChangelog, setShowChangelog] = useState(false)

  // Sync activeTab from URL
  useEffect(() => {
    const tab = tabFromPath(location.pathname)
    if (state.activeTab !== tab) {
      dispatch({ type: 'SET_TAB', payload: tab })
    }
  }, [location.pathname])

  const initialize = useCallback(async () => {
    const result = await auth.initializeAuth()
    if (result) {
      graphClientRef.current = result.graphClient
      dataManagerRef.current = result.dataManager
      dispatch({ type: 'SET_DATA', payload: result.data })
      dispatch({ type: 'SET_LOADING', payload: false })

      // Changelog modal on version change
      if (localStorage.getItem('inv_last_version') !== CONFIG.version) {
        setShowChangelog(true)
      }

      // Deep link: ?equipo=ID
      const urlParams = new URLSearchParams(window.location.search)
      const equipoId = urlParams.get('equipo')
      if (equipoId) {
        const activo = (result.data.activos || []).find(
          (a) => a.idEtiqueta === equipoId.toUpperCase()
        )
        if (activo) {
          dispatch({ type: 'SET_DEEP_LINK', payload: activo })
          navigate('/equipos', { replace: true })
        } else {
          navigate(location.pathname, { replace: true })
        }
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [auth, dispatch, dataManagerRef, graphClientRef, navigate, location.pathname])

  useEffect(() => {
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = useCallback(async () => {
    await auth.login()
    await initialize()
  }, [auth, initialize])

  const handleConfirm = useCallback(async () => {
    if (!confirmAction || !dataManagerRef.current) return
    const dm = dataManagerRef.current
    try {
      if (confirmAction.type === 'eliminar-producto') {
        await dm.deleteInventoryItem(confirmAction.item.id)
      } else if (confirmAction.type === 'eliminar-historial') {
        await dm.deleteHistoryItem(confirmAction.item.id)
      } else if (confirmAction.type === 'toggle-tecnico') {
        await dm.toggleTechnicianStatus(confirmAction.item.id, confirmAction.item.activo)
      } else if (confirmAction.type === 'eliminar-asignacion') {
        await dm.deleteAssignment(confirmAction.item.id)
      }
      closeModal()
      await refreshData()
    } catch (err: any) {
      console.error('Confirm action error:', err)
    }
  }, [confirmAction, dataManagerRef, closeModal, refreshData])

  const getConfirmMessage = () => {
    if (!confirmAction) return ''
    if (confirmAction.type === 'eliminar-producto') return `¿Eliminar "${selectedItem?.nombre}"?`
    if (confirmAction.type === 'eliminar-historial') return `¿Eliminar el registro del ${new Date(selectedItem?.fecha).toLocaleDateString()}?`
    if (confirmAction.type === 'eliminar-asignacion') return `¿Eliminar la asignacion de ${selectedItem?.nombreEmpleado}?`
    if (confirmAction.type === 'toggle-tecnico') return selectedItem?.activo ? '¿Desactivar este técnico?' : '¿Activar este técnico?'
    return '¿Estás seguro?'
  }

  // Loading
  if (auth.loading || state.loading) return <LoadingScreen />

  // Not logged in
  if (!auth.user) return <LoginScreen onLogin={handleLogin} />

  // Access denied
  if (auth.accessDenied) return <AccessDenied email={auth.user.email} onLogout={auth.logout} />

  // Mobile view for non-admin users on small screens
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  if (isMobile && !auth.isAdmin) {
    return (
      <>
        <MobileView />
        {modalType && !showConfirm && (
          <FormModal modalType={modalType} selectedItem={selectedItem} onClose={closeModal} />
        )}
        {showConfirm && (
          <ConfirmModal message={getConfirmMessage()} onConfirm={handleConfirm} onCancel={closeModal} />
        )}
      </>
    )
  }

  // Modals (shared across all routes)
  const modals = (
    <>
      {modalType && !showConfirm && (
        <FormModal modalType={modalType} selectedItem={selectedItem} onClose={closeModal} />
      )}
      {showConfirm && (
        <ConfirmModal message={getConfirmMessage()} onConfirm={handleConfirm} onCancel={closeModal} />
      )}
    </>
  )

  // Main app with layout + routes
  return (
    <AppLayout>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventario" element={<InventoryView />} />
          <Route path="/equipos" element={<EquiposView />} />
          <Route path="/asignaciones" element={<AssignmentsView />} />
          <Route path="/historial" element={<HistoryView />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </ErrorBoundary>
      {modals}
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </AppLayout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  )
}
