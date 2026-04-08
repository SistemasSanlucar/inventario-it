import { createContext, useContext, useReducer, useRef, type ReactNode, type Dispatch } from 'react'
import { GraphAPIClient } from '../services/GraphAPIClient'
import { DataManager } from '../services/DataManager'
import type { AppState, LoadAllDataResult } from '../types'

// -- Actions --

type AppAction =
  | { type: 'SET_DATA'; payload: Partial<LoadAllDataResult> & { lastSync?: Date } }
  | { type: 'MERGE'; payload: Partial<AppState> }
  | { type: 'SET_TAB'; payload: string }
  | { type: 'SET_TAB_FILTER'; payload: { tab: string; filter?: any } }
  | { type: 'OPEN_MODAL'; payload: { modalType: string; selectedItem?: any } }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_CONFIRM'; payload: { type: string; item: any } | null }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_LANG'; payload: string }
  | { type: 'SET_GLOBAL_SEARCH'; payload: string }
  | { type: 'SET_SHOW_GLOBAL_RESULTS'; payload: boolean }
  | { type: 'SET_DEEP_LINK'; payload: any }
  | { type: 'SET_STOCK_MINIMO'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET' }

export const initialAppState: AppState = {
  inventory: [],
  technicians: [],
  history: [],
  assignments: [],
  activos: [],
  catalogo: {},
  catalogoTipos: {},
  catalogoAccesorios: {},
  ubicaciones: [],
  ubicacionesAll: [],
  adminsAll: [],
  sociedades: [],
  proveedores: [],
  lastSync: null,
  syncing: false,
  activeTab: 'dashboard',
  modalType: null,
  selectedItem: null,
  showConfirm: false,
  confirmAction: null,
  stockMinimoDefault: parseInt(localStorage.getItem('stockMinimoDefault') || '2'),
  tabFilter: null,
  lang: localStorage.getItem('inv_lang') || 'es',
  globalSearch: '',
  showGlobalResults: false,
  deepLinkEquipo: null,
  loading: true,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_DATA':
      return {
        ...state,
        ...action.payload,
        lastSync: action.payload.lastSync || new Date(),
      }
    case 'MERGE':
      return { ...state, ...action.payload }
    case 'SET_TAB':
      return { ...state, activeTab: action.payload, tabFilter: null }
    case 'SET_TAB_FILTER':
      return { ...state, activeTab: action.payload.tab, tabFilter: action.payload.filter || null }
    case 'OPEN_MODAL':
      return { ...state, modalType: action.payload.modalType, selectedItem: action.payload.selectedItem || null }
    case 'CLOSE_MODAL':
      return { ...state, modalType: null, selectedItem: null, showConfirm: false, confirmAction: null }
    case 'SET_CONFIRM':
      return {
        ...state,
        showConfirm: action.payload !== null,
        confirmAction: action.payload,
        modalType: null,
        selectedItem: action.payload?.item || null,
      }
    case 'SET_SYNCING':
      return { ...state, syncing: action.payload }
    case 'SET_LANG':
      return { ...state, lang: action.payload }
    case 'SET_GLOBAL_SEARCH':
      return { ...state, globalSearch: action.payload, showGlobalResults: action.payload.length >= 2 }
    case 'SET_SHOW_GLOBAL_RESULTS':
      return { ...state, showGlobalResults: action.payload }
    case 'SET_DEEP_LINK':
      return { ...state, activeTab: 'equipos', deepLinkEquipo: action.payload, tabFilter: null }
    case 'SET_STOCK_MINIMO':
      localStorage.setItem('stockMinimoDefault', String(action.payload))
      return { ...state, stockMinimoDefault: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'RESET':
      return { ...initialAppState, loading: false }
    default:
      return state
  }
}

// -- Context --

interface AppContextValue {
  state: AppState
  dispatch: Dispatch<AppAction>
  dataManagerRef: React.MutableRefObject<DataManager | null>
  graphClientRef: React.MutableRefObject<GraphAPIClient | null>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialAppState)
  const dataManagerRef = useRef<DataManager | null>(null)
  const graphClientRef = useRef<GraphAPIClient | null>(null)

  return (
    <AppContext.Provider value={{ state, dispatch, dataManagerRef, graphClientRef }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
