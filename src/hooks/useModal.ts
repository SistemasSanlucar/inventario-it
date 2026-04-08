import { useCallback } from 'react'
import { useAppContext } from '../context/AppContext'

const CONFIRM_TYPES = ['eliminar-producto', 'eliminar-historial', 'toggle-tecnico', 'eliminar-asignacion']

export function useModal() {
  const { state, dispatch, dataManagerRef } = useAppContext()
  const { modalType, selectedItem, showConfirm, confirmAction } = state

  const openModal = useCallback(
    (type: string, item?: any) => {
      if (CONFIRM_TYPES.includes(type)) {
        dispatch({ type: 'SET_CONFIRM', payload: { type, item } })
      } else {
        dispatch({ type: 'OPEN_MODAL', payload: { modalType: type, selectedItem: item } })
      }
    },
    [dispatch]
  )

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' })
  }, [dispatch])

  return {
    modalType,
    selectedItem,
    showConfirm,
    confirmAction,
    openModal,
    closeModal,
    dataManagerRef,
  }
}
