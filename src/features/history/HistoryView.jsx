import React, { useEffect, useRef, useState } from 'react';
import { T } from '../../lib/i18n';

const e = React.createElement;

        function HistoryView({ state, onOpenModal, initialFilter }) {
            const [search, setSearch] = useState('');
            const [filterType, setFilterType] = useState('all');
            const [filterDateFrom, setFilterDateFrom] = useState('');
            const [filterDateTo, setFilterDateTo] = useState('');
            const [sortCol, setSortCol] = useState('fecha');
            const [sortDir, setSortDir] = useState('desc');

            useEffect(function() {
                if (!initialFilter) return;
                if (initialFilter.tipo === 'hoy') {
                    const hoy = new Date().toISOString().split('T')[0];
                    setFilterDateFrom(hoy);
                    setFilterDateTo(hoy);
                }
            }, []);

            const toggleSort = function(col) {
                if (sortCol === col) { setSortDir(function(d) { return d === 'asc' ? 'desc' : 'asc'; }); }
                else { setSortCol(col); setSortDir('asc'); }
            };
            const sortIcon = function(col) {
                if (sortCol !== col) return e('span', { style: { color: 'var(--text-secondary)', marginLeft: '4px', opacity: 0.4 } }, '⇅');
                return e('span', { style: { color: 'var(--accent-blue)', marginLeft: '4px' } }, sortDir === 'asc' ? '↑' : '↓');
            };
            const thSort = function(label, col, width) {
                return e('th', { style: { width: width || 'auto', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }, onClick: function() { toggleSort(col); } },
                    label, sortIcon(col)
                );
            };

            const filtered = state.history.filter(entry => {
                const matchesSearch = entry.producto.toLowerCase().includes(search.toLowerCase()) || entry.usuario.toLowerCase().includes(search.toLowerCase()) || (entry.ticket && entry.ticket.toLowerCase().includes(search.toLowerCase()));
                const matchesType = filterType === 'all' || entry.tipo === filterType;
                let matchesDate = true;
                if (filterDateFrom || filterDateTo) { const d = new Date(entry.fecha); if (filterDateFrom) matchesDate = d >= new Date(filterDateFrom); if (filterDateTo && matchesDate) matchesDate = d <= new Date(filterDateTo + 'T23:59:59'); }
                return matchesSearch && matchesType && matchesDate;
            }).sort(function(a, b) {
                let av, bv;
                if (sortCol === 'fecha') { av = new Date(a.fecha); bv = new Date(b.fecha); }
                else if (sortCol === 'tipo') { av = a.tipo; bv = b.tipo; }
                else if (sortCol === 'producto') { av = a.producto; bv = b.producto; }
                else if (sortCol === 'cantidad') { av = a.cantidad; bv = b.cantidad; }
                else if (sortCol === 'usuario') { av = a.usuario; bv = b.usuario; }
                else if (sortCol === 'tecnico') { av = a.tecnico; bv = b.tecnico; }
                else { av = a.fecha; bv = b.fecha; }
                if (av < bv) return sortDir === 'asc' ? -1 : 1;
                if (av > bv) return sortDir === 'asc' ? 1 : -1;
                return 0;
            });

            return e('div', null,
                e('div', { className: 'toolbar' },
                    e('div', { className: 'toolbar-left' },
                        e('input', { type: 'text', className: 'search-bar', placeholder: 'Buscar en historial...', value: search, onChange: ev => setSearch(ev.target.value) }),
                        e('select', { className: 'filter-select', value: filterType, onChange: ev => setFilterType(ev.target.value) }, e('option', { value: 'all' }, 'Todos los tipos'), e('option', { value: 'Entrada' }, 'Entradas'), e('option', { value: 'Salida' }, 'Salidas'), e('option', { value: 'Devolucion' }, 'Devoluciones'), e('option', { value: 'Asignacion' }, 'Asignaciones'), e('option', { value: 'Prestamo' }, 'Prestamos')),
                        e('input', { type: 'date', className: 'filter-select', value: filterDateFrom, onChange: ev => setFilterDateFrom(ev.target.value) }),
                        e('input', { type: 'date', className: 'filter-select', value: filterDateTo, onChange: ev => setFilterDateTo(ev.target.value) }),
                        e('span', { className: 'results-count' }, e('strong', null, filtered.length), ' registros')
                    ),
                    e('div', { className: 'toolbar-right' },
                        e('button', { className: 'button button-secondary', onClick: () => { setSearch(''); setFilterType('all'); setFilterDateFrom(''); setFilterDateTo(''); } }, 'Limpiar'),
                        e('button', { className: 'button button-success', onClick: () => exportToCSV(filtered, 'historial') }, 'Exportar')
                    )
                ),
                filtered.length > 0 ?
                    e('table', { className: 'history-table' },
                        e('thead', null, e('tr', null,
                            thSort('Fecha', 'fecha', '140px'),
                            thSort('Tipo', 'tipo', '100px'),
                            thSort('Producto', 'producto'),
                            thSort('Cant.', 'cantidad', '60px'),
                            e('th', { style: { width: '120px' } }, 'Ticket'),
                            thSort('Usuario', 'usuario'),
                            thSort('Técnico', 'tecnico'),
                            e('th', { style: { width: '80px' } }, 'Firma'),
                            e('th', { style: { width: '50px' } }, '')
                        )),
                        e('tbody', null, filtered.map(entry =>
                            e('tr', { key: entry.id },
                                e('td', { style: { fontFamily: 'IBM Plex Mono,monospace', fontSize: '12px' } }, new Date(entry.fecha).toLocaleString('es-ES')),
                                e('td', null, e('span', { className: 'movement-badge ' + entry.tipo }, entry.tipo)),
                                e('td', { style: { fontWeight: '500' } }, entry.producto),
                                e('td', { style: { fontFamily: 'IBM Plex Mono,monospace' } }, entry.cantidad),
                                e('td', { style: { color: 'var(--accent-blue)', fontSize: '12px' } }, entry.ticket || '-'),
                                e('td', { style: { fontSize: '13px' } }, entry.usuario),
                                e('td', { style: { color: 'var(--accent-green)', fontSize: '12px' } }, entry.tecnico),
                                e('td', null, entry.firma ? e('img', { src: entry.firma, alt: 'Firma', className: 'signature-preview' }) : e('span', { style: { color: 'var(--text-secondary)', fontSize: '12px' } }, '-')),
                                e('td', null, state.isAdmin ? e('div', { className: 'action-icon danger', onClick: () => onOpenModal('eliminar-historial', entry), title: 'Eliminar' }, '🗑️') : null)
                            )
                        ))
                    ) :
                    e('div', { className: 'empty-state' }, e('div', { className: 'empty-state-icon' }, '📋'), e('div', { className: 'empty-state-title' }, 'No se encontraron movimientos'))
            );
        }


export default HistoryView;