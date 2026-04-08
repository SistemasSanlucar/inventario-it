import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { initializeMSAL, getAccessToken, login as msalLogin, logout as msalLogout, getMsalInstance } from '../services/auth'
import { GraphAPIClient } from '../services/GraphAPIClient'
import { DataManager } from '../services/DataManager'
import { showToast } from '../hooks/useToast'
import { T } from '../i18n'
import type { AuthState, LoadAllDataResult } from '../types'

interface AuthContextValue extends AuthState {
  login: () => Promise<void>
  logout: () => Promise<void>
  initializeAuth: () => Promise<{
    data: LoadAllDataResult
    isAdmin: boolean
    isTechnician: boolean
    graphClient: GraphAPIClient
    dataManager: DataManager
  } | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAdmin: false,
    isTechnician: false,
    accessDenied: false,
    loading: true,
  })

  const initializeAuth = useCallback(async () => {
    try {
      const msalReady = await initializeMSAL()
      if (!msalReady) throw new Error('MSAL init failed')

      const accounts = getMsalInstance().getAllAccounts()
      if (accounts.length === 0) {
        setState((s) => ({ ...s, loading: false }))
        return null
      }

      const token = await getAccessToken()
      if (!token) {
        setState((s) => ({ ...s, loading: false }))
        return null
      }

      const graphClient = new GraphAPIClient(token)
      const dataManager = new DataManager(graphClient)
      const currentUser = await graphClient.getCurrentUser()
      const data = await dataManager.loadAllData()

      const isAdmin = data.adminsAll.some(
        (a) => a.email && a.email.toLowerCase() === currentUser.mail.toLowerCase() && a.activo
      )
      const isTechnician = data.technicians.some(
        (t) => t.email && t.email.toLowerCase() === currentUser.mail.toLowerCase() && t.activo
      )

      if (!isAdmin && !isTechnician) {
        setState({
          user: { name: currentUser.displayName, email: currentUser.mail },
          isAdmin: false,
          isTechnician: false,
          accessDenied: true,
          loading: false,
        })
        return null
      }

      setState({
        user: { name: currentUser.displayName, email: currentUser.mail },
        isAdmin,
        isTechnician,
        accessDenied: false,
        loading: false,
      })

      showToast(T().welcome + ', ' + currentUser.displayName, 'success')
      return { data, isAdmin, isTechnician, graphClient, dataManager }
    } catch (error) {
      console.error('Error inicializando app:', error)
      showToast('Error cargando la aplicacion', 'error')
      setState((s) => ({ ...s, loading: false }))
      return null
    }
  }, [])

  const login = useCallback(async () => {
    await msalLogin()
  }, [])

  const logout = useCallback(async () => {
    await msalLogout()
    setState({
      user: null,
      isAdmin: false,
      isTechnician: false,
      accessDenied: false,
      loading: false,
    })
    showToast('Sesion cerrada correctamente', 'success')
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, initializeAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
