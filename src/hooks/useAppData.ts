import { useCallback } from 'react'
import { useAppContext } from '../context/AppContext'
import { cache } from '../services/CacheManager'
import { ErrorLog } from '../services/ErrorLog'
import { showToast } from './useToast'

export function useAppData() {
  const { state, dispatch, dataManagerRef } = useAppContext()

  const refreshData = useCallback(
    async (scope?: string[]) => {
      const dm = dataManagerRef.current
      if (!dm) return
      try {
        if (!scope) {
          const data = await dm.loadAllData()
          dispatch({ type: 'SET_DATA', payload: data })
        } else {
          let partial: Record<string, any> = {}
          if (scope.includes('inventory')) Object.assign(partial, await dm.refreshInventory())
          if (scope.includes('activos')) Object.assign(partial, await dm.refreshActivos())
          if (scope.includes('asignaciones')) Object.assign(partial, await dm.refreshAsignaciones())
          if (scope.includes('historial')) Object.assign(partial, await dm.refreshHistorial())
          if (scope.includes('catalogo')) Object.assign(partial, await dm.refreshCatalogo())
          if (Object.keys(partial).length > 0) dispatch({ type: 'MERGE', payload: partial })
        }
      } catch (e: any) {
        ErrorLog.error('App.refresh', e.message || 'Error refreshing')
      }
    },
    [dataManagerRef, dispatch]
  )

  const syncData = useCallback(
    async (showMsg?: boolean) => {
      const dm = dataManagerRef.current
      if (!dm || state.syncing) return
      dispatch({ type: 'SET_SYNCING', payload: true })
      try {
        cache.clear()
        const data = await dm.loadAllData()
        dispatch({ type: 'SET_DATA', payload: { ...data } })
        dispatch({ type: 'SET_SYNCING', payload: false })
        if (showMsg) showToast('Sincronizado correctamente', 'success')
      } catch (e: any) {
        ErrorLog.error('App.sync', e.message || 'Sync error')
        dispatch({ type: 'SET_SYNCING', payload: false })
      }
    },
    [dataManagerRef, state.syncing, dispatch]
  )

  return { refreshData, syncData }
}
