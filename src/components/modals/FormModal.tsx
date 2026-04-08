import { useState, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../hooks/useAppData'
import { showToast } from '../../hooks/useToast'
import { startBarcodeScanner } from '../../utils/scanner'
import { exportAssignmentToPDF } from '../../utils/pdf'
import { ErrorLog } from '../../services/ErrorLog'

import EntradaForm from './forms/EntradaForm'
import SalidaForm from './forms/SalidaForm'
import EditarForm from './forms/EditarForm'
import DuplicarForm from './forms/DuplicarForm'
import TecnicoForm from './forms/TecnicoForm'
import NuevaAsignacionForm from './forms/NuevaAsignacionForm'
import VerAsignacionForm from './forms/VerAsignacionForm'
import DevolverMaterialForm from './forms/DevolverMaterialForm'
import BajaEmpleadoForm from './forms/BajaEmpleadoForm'

interface FormModalProps {
  modalType: string
  selectedItem: any
  onClose: () => void
}

export default function FormModal({ modalType, selectedItem, onClose }: FormModalProps) {
  const { state, dataManagerRef } = useAppContext()
  const auth = useAuth()
  const { refreshData } = useAppData()
  const dataManager = dataManagerRef.current!

  const deriveTipo = () => {
    if (!selectedItem) return ''
    const parts = (selectedItem.nombre || '').split(' - ')
    return parts[0] || ''
  }
  const deriveModelo = () => {
    if (!selectedItem) return ''
    const parts = (selectedItem.nombre || '').split(' - ')
    return parts.slice(1).join(' - ') || ''
  }

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<any>({
    tipo: deriveTipo(),
    modelo: deriveModelo(),
    tipoNuevo: '',
    modeloNuevo: '',
    barcode: selectedItem && modalType !== 'duplicar' ? selectedItem.barcode || '' : '',
    stock: selectedItem ? String(selectedItem.stock ?? 0) : '0',
    stockMinimo: selectedItem ? String(selectedItem.stockMinimo ?? 0) : String(state.stockMinimoDefault || 2),
    numSerie: '',
    ubicacion: selectedItem ? selectedItem.ubicacion || '' : '',
    estado: selectedItem ? selectedItem.estado || 'Nuevo' : 'Nuevo',
    tier: selectedItem ? selectedItem.tier || 'Estándar' : 'Estándar',
    cantidad: '1',
    ticket: '',
    usuario: '',
    emailUsuario: '',
    nombreEmpleado: '',
    emailEmpleado: '',
    departamento: '',
    puesto: '',
    fechaIncorporacion: new Date().toISOString().split('T')[0],
    observaciones: '',
    esPrestamo: modalType === 'nuevo-prestamo',
    nombreTecnico: '',
    emailTecnico: '',
    showAddTipo: false,
    showAddModelo: false,
    modeloDetalle: '',
    fechaDevolucion: '',
  })
  const [signature, setSignature] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<any[]>([])
  const [selectedEquipos, setSelectedEquipos] = useState<any[]>([])
  const [returnSelections, setReturnSelections] = useState<Record<string, boolean>>({})
  const [savingCatalog, setSavingCatalog] = useState(false)
  const [bajaSelected, setBajaSelected] = useState<any>(null)
  const [bajaSelections, setBajaSelections] = useState<Record<string, boolean>>({})
  const overlayRef = useRef<HTMLDivElement>(null)
  const mouseDownOnOverlay = useRef(false)

  const tecnicoActual = auth.user ? auth.user.name : ''
  const isAdmin = auth.isAdmin

  const upd = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const genBarcode = () => {
    const unique = crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 10)
    upd('barcode', 'SL' + unique)
  }

  const saveTipoNuevo = async () => {
    if (!formData.tipoNuevo.trim()) return
    setSavingCatalog(true)
    try {
      await dataManager.addToCatalog(formData.tipoNuevo.trim(), '', false)
      showToast('Tipo añadido al catálogo', 'success')
      upd('tipo', formData.tipoNuevo.trim())
      upd('tipoNuevo', '')
      upd('showAddTipo', false)
      await refreshData(['catalogo'])
    } catch { showToast('Error guardando tipo', 'error') }
    finally { setSavingCatalog(false) }
  }

  const saveModeloNuevo = async () => {
    if (!formData.tipo || !formData.modeloNuevo.trim()) return
    setSavingCatalog(true)
    try {
      await dataManager.addToCatalog(formData.tipo, formData.modeloNuevo.trim(), false)
      showToast('Modelo añadido', 'success')
      upd('modelo', formData.modeloNuevo.trim())
      upd('modeloNuevo', '')
      upd('showAddModelo', false)
      await refreshData(['catalogo'])
    } catch { showToast('Error guardando modelo', 'error') }
    finally { setSavingCatalog(false) }
  }

  const quickCreateProduct = async (nombre: string) => {
    try {
      const barcode = 'SL' + crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 10)
      await dataManager.createInventoryItem({ nombre, categoria: 'Otros', barcode, stock: 0, stockMinimo: 0, ubicacion: '', estado: 'Nuevo' })
      await refreshData(['inventory'])
      const newItem = { nombre, barcode, id: barcode, categoria: 'Otros' }
      setSelectedProducts((prev) => [...prev, newItem])
      showToast(`✓ Producto "${nombre}" creado y añadido`, 'success')
      return newItem
    } catch (err: any) {
      ErrorLog.error('QuickCreate', err.message || 'Error creando producto')
      showToast('Error creando producto: ' + (err.message || ''), 'error')
      return null
    }
  }

  // Submit
  const handleSubmit = async () => {
    setLoading(true)
    try {
      const modeloFinal = formData.modeloDetalle?.trim() && /otro|vario/i.test(formData.modelo)
        ? `${formData.modelo} (${formData.modeloDetalle.trim()})`
        : formData.modelo
      const nombreProducto = formData.tipo && modeloFinal ? `${formData.tipo} - ${modeloFinal}` : formData.tipo || ''

      if (modalType === 'entrada' && !selectedItem) {
        if (!formData.tipo || !formData.modelo) { showToast('Selecciona tipo y modelo', 'error'); setLoading(false); return }
        if (!formData.ubicacion) { showToast('Selecciona una ubicación', 'error'); setLoading(false); return }
        const productoExistente = state.inventory.find((item) => item.nombre === nombreProducto)
        if (productoExistente) {
          const addCant = parseInt(formData.stock) || 1
          const newStock = productoExistente.stock + addCant
          await dataManager.updateInventoryItem(productoExistente.id, { Stock: newStock })
          await dataManager.addToHistory({ tipo: 'Entrada', producto: nombreProducto, cantidad: addCant, ticket: '', usuario: '', tecnico: tecnicoActual })
          showToast(`Stock actualizado: ${newStock} uds de ${nombreProducto}`, 'success')
          await refreshData(['inventory', 'historial'])
        } else {
          if (!formData.barcode.trim()) { showToast('El código de barras es obligatorio', 'error'); setLoading(false); return }
          const exists = await dataManager.checkBarcodeExists(formData.barcode)
          if (exists) { showToast('El código de barras ya existe', 'error'); setLoading(false); return }
          await dataManager.createInventoryItem({ nombre: nombreProducto, categoria: formData.tipo, barcode: formData.barcode, stock: parseInt(formData.stock) || 0, stockMinimo: parseInt(formData.stockMinimo) || 0, ubicacion: formData.ubicacion, estado: formData.estado, tier: formData.tier || 'Estándar' })
          if (parseInt(formData.stock) > 0) {
            await dataManager.addToHistory({ tipo: 'Entrada', producto: nombreProducto, cantidad: parseInt(formData.stock) || 1, ticket: '', usuario: '', tecnico: tecnicoActual })
          }
          showToast(`Producto creado: ${nombreProducto}`, 'success')
          await refreshData(['inventory', 'historial'])
        }
      } else if (modalType === 'entrada' && selectedItem) {
        const addCant = parseInt(formData.cantidad) || 1
        const newStock = selectedItem.stock + addCant
        await dataManager.updateInventoryItem(selectedItem.id, { Stock: newStock })
        await dataManager.addToHistory({ tipo: 'Entrada', producto: selectedItem.nombre, cantidad: addCant, ticket: formData.ticket || '', usuario: '', tecnico: tecnicoActual })
        showToast(`+${addCant} uds → Stock: ${newStock}`, 'success')
      } else if (modalType === 'salida') {
        const cant = parseInt(formData.cantidad) || 1
        if (selectedItem.stock < cant) { showToast(`Stock insuficiente (${selectedItem.stock} disponibles)`, 'error'); setLoading(false); return }
        if (!formData.usuario) { showToast('Selecciona el destinatario', 'error'); setLoading(false); return }
        await dataManager.updateInventoryItem(selectedItem.id, { Stock: selectedItem.stock - cant })
        await dataManager.addToHistory({ tipo: 'Salida', producto: selectedItem.nombre, cantidad: cant, ticket: formData.ticket || '', usuario: formData.usuario, tecnico: tecnicoActual })
        showToast(`Salida: ${cant} x ${selectedItem.nombre}`, 'success')
      } else if (modalType === 'editar') {
        if (!formData.tipo || !formData.modelo) { showToast('Selecciona tipo y modelo', 'error'); setLoading(false); return }
        if (!formData.ubicacion) { showToast('Selecciona una ubicación', 'error'); setLoading(false); return }
        await dataManager.updateInventoryItem(selectedItem.id, { Title: nombreProducto, Nombre: nombreProducto, Categoria: formData.tipo, CodigoBarras: formData.barcode, Stock: parseInt(formData.stock) || 0, StockMinimo: parseInt(formData.stockMinimo) || 0, Ubicacion: formData.ubicacion, Estado: formData.estado, Tier: formData.tier || 'Estándar' })
        showToast(`Producto actualizado: ${nombreProducto}`, 'success')
        await refreshData(['inventory'])
      } else if (modalType === 'duplicar') {
        if (!formData.barcode.trim()) { showToast('Genera un nuevo código', 'error'); setLoading(false); return }
        if (!formData.ubicacion) { showToast('Selecciona una ubicación', 'error'); setLoading(false); return }
        const dupExists = await dataManager.checkBarcodeExists(formData.barcode)
        if (dupExists) { showToast('El código ya existe', 'error'); setLoading(false); return }
        await dataManager.createInventoryItem({ nombre: nombreProducto, categoria: formData.tipo, barcode: formData.barcode, stock: parseInt(formData.stock) || 0, stockMinimo: parseInt(formData.stockMinimo) || 0, ubicacion: formData.ubicacion, estado: formData.estado, tier: formData.tier || 'Estándar' })
        showToast('Producto duplicado correctamente', 'success')
      } else if (modalType === 'tecnico') {
        if (!formData.nombreTecnico.trim() || !formData.emailTecnico.trim()) { showToast('Nombre y email son obligatorios', 'error'); setLoading(false); return }
        const codigo = 'TEC' + Date.now().toString().slice(-6)
        await dataManager.createTechnician({ nombre: formData.nombreTecnico, codigo, email: formData.emailTecnico })
        showToast(`Técnico creado. Código: ${codigo}`, 'success')
      } else if (modalType === 'nueva-asignacion' || modalType === 'nuevo-prestamo') {
        if (!formData.nombreEmpleado.trim()) { showToast('Selecciona un empleado', 'error'); setLoading(false); return }
        const totalItems = selectedProducts.length + selectedEquipos.length
        if (totalItems === 0) { showToast('Añade al menos un producto o equipo', 'error'); setLoading(false); return }
        if (!signature) { showToast('⚠️ La firma del empleado es obligatoria', 'error'); setLoading(false); return }
        const pendientes = selectedEquipos.filter((eq) => eq.pendienteEscaneo)
        if (pendientes.length > 0) { showToast(`Faltan ${pendientes.length} equipo(s) por escanear`, 'error'); setLoading(false); return }

        // Consumables: deduct stock
        for (const prod of selectedProducts) {
          const invItem = state.inventory.find((inv) => inv.id === prod.id)
          if (invItem) await dataManager.updateInventoryItem(invItem.id, { Stock: invItem.stock - 1 })
          await dataManager.addToHistory({ tipo: formData.esPrestamo ? 'Prestamo' : 'Asignacion', producto: prod.nombre, cantidad: 1, ticket: '', usuario: formData.nombreEmpleado, tecnico: tecnicoActual })
        }
        // Equipment: change state to Asignado
        for (const eq of selectedEquipos) {
          await dataManager.cambiarEstadoActivo(eq.id, 'Asignado', { asignadoA: formData.nombreEmpleado, emailAsignadoA: formData.emailEmpleado, fechaAsignacion: new Date().toISOString() })
          await dataManager.addToHistory({ tipo: formData.esPrestamo ? 'Prestamo' : 'Asignacion', producto: eq.nombre, cantidad: 1, ticket: '', usuario: formData.nombreEmpleado, tecnico: tecnicoActual, idEtiqueta: eq.idEtiqueta })
        }
        // Create assignment
        const equiposParaAsignacion = selectedEquipos.map((eq) => ({ nombre: eq.nombre, idEtiqueta: eq.idEtiqueta, esEquipo: true }))
        await dataManager.createAssignment({
          nombreEmpleado: formData.nombreEmpleado,
          emailEmpleado: formData.emailEmpleado,
          departamento: formData.departamento,
          puesto: formData.puesto,
          fechaIncorporacion: formData.fechaIncorporacion,
          productosAsignados: selectedProducts,
          equiposAsignados: equiposParaAsignacion,
          firmaEmpleado: signature || '',
          tecnicoResponsable: tecnicoActual,
          observaciones: (formData.esPrestamo && formData.fechaDevolucion ? `[Dev. prevista: ${new Date(formData.fechaDevolucion + 'T12:00:00').toLocaleDateString('es-ES')}] ` : '') + (formData.observaciones || ''),
          esPrestamo: formData.esPrestamo,
        })
        showToast(formData.esPrestamo ? 'Préstamo registrado' : 'Asignación creada', 'success')
        await refreshData(['asignaciones', 'inventory', 'activos', 'historial'])
      } else if (modalType === 'devolver-material') {
        const toReturn = (selectedItem.productosAsignados || []).filter((p: any) => returnSelections[p.barcode || p.idEtiqueta])
        if (toReturn.length === 0) { showToast('Selecciona al menos un producto', 'warning'); setLoading(false); return }
        await dataManager.returnMaterial(selectedItem.id, toReturn, selectedItem.productosAsignados || [], formData.observaciones || '', tecnicoActual, state.inventory, state.activos)
        showToast(`Devolución registrada: ${toReturn.length} producto(s)`, 'success')
        await refreshData(['asignaciones', 'inventory', 'activos', 'historial'])
      } else if (modalType === 'baja-empleado') {
        if (!bajaSelected) { showToast('Selecciona un empleado', 'error'); setLoading(false); return }
        const asignacionesActivas = (state.assignments || []).filter((a) => a.emailEmpleado.toLowerCase() === bajaSelected.emailEmpleado.toLowerCase() && a.estado === 'Activo')
        const todosItemsSubmit = asignacionesActivas.flatMap((a) => {
          let prods: any[] = []
          try { prods = JSON.parse(a.productosAsignados as any || '[]') } catch { /* empty */ }
          return prods.map((p: any) => ({ ...p, asignacionId: a.id, asignacion: a }))
        })
        const toReturn = todosItemsSubmit.filter((p: any) => bajaSelections[p.barcode || p.idEtiqueta])
        if (todosItemsSubmit.length > 0 && toReturn.length === 0) { showToast('Selecciona al menos un item', 'warning'); setLoading(false); return }

        for (const asig of asignacionesActivas) {
          const itemsDeAsig = toReturn.filter((p: any) => p.asignacionId === asig.id)
          if (itemsDeAsig.length > 0) {
            await dataManager.returnMaterial(asig.id, itemsDeAsig, asig.productosAsignados || [], formData.observaciones || (`Baja: ${bajaSelected.nombreEmpleado}`), tecnicoActual, state.inventory, state.activos)
          } else {
            const totalItemsInAsig = todosItemsSubmit.filter((p: any) => p.asignacionId === asig.id).length
            if (totalItemsInAsig === 0) {
              await dataManager.updateAssignmentStatus(asig.id, 'Devuelto')
            }
          }
        }
        showToast(`Baja procesada: ${toReturn.length} item(s) devuelto(s)`, 'success')
        await refreshData(['asignaciones', 'inventory', 'activos', 'historial'])
      }

      onClose()
    } catch (error: any) {
      console.error('Error en formulario:', error)
      showToast('Error: ' + (error.message || 'Error desconocido'), 'error')
    } finally {
      setLoading(false)
    }
  }

  // Title and submit labels
  const titles: Record<string, string> = {
    'entrada-new': '📦 Nuevo Producto',
    'entrada-add': '➕ Añadir Stock',
    salida: '📤 Registrar Salida',
    editar: '✏️ Editar Producto',
    duplicar: '🔄 Duplicar Producto',
    tecnico: '👤 Nuevo Técnico',
    'nueva-asignacion': '📋 Nueva Asignacion',
    'nuevo-prestamo': '⏱️ Prestamo de Material',
    'ver-asignacion': '📄 Documento de Asignacion',
    'devolver-material': '↩️ Devolucion de Material',
    'baja-empleado': '👋 Baja de Empleado',
  }
  const titleKey = modalType === 'entrada' ? (selectedItem ? 'entrada-add' : 'entrada-new') : modalType
  const modalTitle = titles[titleKey] || 'Formulario'
  const isViewOnly = modalType === 'ver-asignacion'

  const submitLabels: Record<string, string> = {
    'entrada-new': 'Crear Producto',
    'entrada-add': 'Añadir Stock',
    salida: 'Registrar Salida',
    editar: 'Guardar Cambios',
    duplicar: 'Duplicar Producto',
    tecnico: 'Crear Técnico',
    'nueva-asignacion': 'Crear Asignacion',
    'nuevo-prestamo': 'Registrar Prestamo',
    'devolver-material': 'Confirmar Devolucion',
    'baja-empleado': '👋 Confirmar Baja',
  }
  const submitLabel = submitLabels[titleKey] || 'Guardar'
  const submitClass = modalType === 'salida' ? 'button-warning' : modalType === 'devolver-material' ? 'button-success' : 'button-primary'

  const stateWithAdmin = { ...state, isAdmin }

  const renderBody = () => {
    if (modalType === 'entrada') {
      return (
        <EntradaForm
          selectedItem={selectedItem}
          formData={formData}
          onUpdate={upd}
          catalogo={state.catalogo}
          ubicaciones={state.ubicaciones}
          inventory={state.inventory}
          isAdmin={isAdmin}
          tecnico={tecnicoActual}
          savingCatalog={savingCatalog}
          onSaveTipo={saveTipoNuevo}
          onSaveModelo={saveModeloNuevo}
          onScan={(cb) => startBarcodeScanner(cb)}
          onGenBarcode={genBarcode}
          onSignatureChange={setSignature}
        />
      )
    }
    if (modalType === 'salida') {
      return (
        <SalidaForm
          selectedItem={selectedItem}
          formData={formData}
          onUpdate={upd}
          setFormData={setFormData}
          isAdmin={isAdmin}
          tecnico={tecnicoActual}
          dataManager={dataManager}
          onSignatureChange={setSignature}
        />
      )
    }
    if (modalType === 'editar') {
      return (
        <EditarForm
          formData={formData}
          onUpdate={upd}
          catalogo={state.catalogo}
          ubicaciones={state.ubicaciones}
          isAdmin={isAdmin}
          savingCatalog={savingCatalog}
          onSaveTipo={saveTipoNuevo}
          onSaveModelo={saveModeloNuevo}
          onScan={(cb) => startBarcodeScanner(cb)}
          onGenBarcode={genBarcode}
        />
      )
    }
    if (modalType === 'duplicar') {
      return (
        <DuplicarForm
          selectedItem={selectedItem}
          formData={formData}
          onUpdate={upd}
          catalogo={state.catalogo}
          ubicaciones={state.ubicaciones}
          isAdmin={isAdmin}
          savingCatalog={savingCatalog}
          onSaveTipo={saveTipoNuevo}
          onSaveModelo={saveModeloNuevo}
          onScan={(cb) => startBarcodeScanner(cb)}
          onGenBarcode={genBarcode}
        />
      )
    }
    if (modalType === 'tecnico') {
      return <TecnicoForm formData={formData} onUpdate={upd} />
    }
    if (modalType === 'nueva-asignacion' || modalType === 'nuevo-prestamo') {
      return (
        <NuevaAsignacionForm
          formData={formData}
          onUpdate={upd}
          setFormData={setFormData}
          state={stateWithAdmin}
          dataManager={dataManager}
          selectedProducts={selectedProducts}
          setSelectedProducts={setSelectedProducts}
          selectedEquipos={selectedEquipos}
          setSelectedEquipos={setSelectedEquipos}
          tecnico={tecnicoActual}
          onSignatureChange={setSignature}
          onQuickCreate={quickCreateProduct}
        />
      )
    }
    if (modalType === 'ver-asignacion' && selectedItem) {
      return <VerAsignacionForm selectedItem={selectedItem} />
    }
    if (modalType === 'devolver-material' && selectedItem) {
      return (
        <DevolverMaterialForm
          selectedItem={selectedItem}
          formData={formData}
          onUpdate={upd}
          isAdmin={isAdmin}
          tecnico={tecnicoActual}
          returnSelections={returnSelections}
          setReturnSelections={setReturnSelections}
        />
      )
    }
    if (modalType === 'baja-empleado') {
      return (
        <BajaEmpleadoForm
          formData={formData}
          onUpdate={upd}
          state={stateWithAdmin}
          dataManager={dataManager}
          tecnico={tecnicoActual}
          bajaSelected={bajaSelected}
          setBajaSelected={setBajaSelected}
          bajaSelections={bajaSelections}
          setBajaSelections={setBajaSelections}
        />
      )
    }
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Formulario no disponible</div>
  }

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === overlayRef.current }}
      onMouseUp={(e) => { if (mouseDownOnOverlay.current && e.target === overlayRef.current && !loading) onClose(); mouseDownOnOverlay.current = false }}
    >
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{modalTitle}</h2>
          <button className="modal-close" onClick={() => { if (!loading) onClose() }} disabled={loading}>×</button>
        </div>
        <div className="modal-body">{renderBody()}</div>
        <div className="modal-footer">
          <button type="button" className="button button-secondary" onClick={() => { if (!loading) onClose() }} disabled={loading}>Cancelar</button>
          {isViewOnly ? (
            <button type="button" className="button button-primary" onClick={() => exportAssignmentToPDF(selectedItem, showToast as any)}>📥 Descargar PDF</button>
          ) : (
            <button type="button" className={`button ${submitClass}`} onClick={handleSubmit} disabled={loading}>
              {loading && <span className="loading-spinner" />}
              {' '}
              {loading ? 'Guardando...' : submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
