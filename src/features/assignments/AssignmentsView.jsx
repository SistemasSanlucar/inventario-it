import React, { useEffect, useRef, useState } from 'react';
import { T } from '../../lib/i18n';
import { exportAssignmentToPDF } from '../../services/export/exportService';

const e = React.createElement;

        function AssignmentsView({ state, onOpenModal, onRefresh, initialFilter }) {
            const [search, setSearch] = useState('');
            const [filterDept, setFilterDept] = useState('all');
            const [filterEstado, setFilterEstado] = useState('all');
            const [filterTipo, setFilterTipo] = useState('all');
            const [viewMode, setViewMode] = useState('cards');
            const [expandedId, setExpandedId] = useState(null);

            useEffect(function() {
                if (!initialFilter) return;
                if (initialFilter.tipo === 'prestamo') setFilterTipo('prestamo');
                if (initialFilter.estado === 'Activo') setFilterEstado('Activo');
                if (initialFilter.estado === 'vencido') { setFilterTipo('prestamo'); setFilterEstado('vencido'); }
            }, []);

            const hoy = new Date(); hoy.setHours(0,0,0,0);

            const filtered = (state.assignments || []).filter(function(a) {
                const q = search.toLowerCase();
                const matchesSearch = !q || a.nombreEmpleado.toLowerCase().includes(q) || (a.emailEmpleado||'').toLowerCase().includes(q) || (a.puesto||'').toLowerCase().includes(q) || (a.departamento||'').toLowerCase().includes(q);
                const matchesDept = filterDept === 'all' || a.departamento === filterDept;
                let matchesEstado = true;
                if (filterEstado === 'vencido') {
                    const fa = new Date(a.fechaAsignacion); fa.setHours(0,0,0,0);
                    matchesEstado = a.esPrestamo && a.estado === 'Activo' && fa < hoy;
                } else {
                    matchesEstado = filterEstado === 'all' || a.estado === filterEstado;
                }
                const matchesTipo = filterTipo === 'all' || (filterTipo === 'prestamo' && a.esPrestamo) || (filterTipo === 'asignacion' && !a.esPrestamo);
                return matchesSearch && matchesDept && matchesEstado && matchesTipo;
            }).sort(function(a, b) { return new Date(b.fechaAsignacion) - new Date(a.fechaAsignacion); });

            const departamentos = [...new Set((state.assignments || []).map(a => a.departamento))].filter(Boolean);
            const prestamosActivos = (state.assignments || []).filter(a => a.esPrestamo && a.estado === 'Activo');
            const vencidos = prestamosActivos.filter(function(a) { const f = new Date(a.fechaAsignacion); f.setHours(0,0,0,0); return f < hoy; });

            // ── Helpers ───────────────────────────────────────────────────────
            const avatarColors = ['#58a6ff','#3fb950','#a855f7','#fbbf24','#f97316','#ef4444','#06b6d4','#84cc16'];
            const avatarColor = function(name) {
                var hash = 0;
                for (var i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
                return avatarColors[Math.abs(hash) % avatarColors.length];
            };
            const initials = function(name) {
                return name.split(' ').map(function(n) { return n[0]; }).slice(0,2).join('').toUpperCase();
            };
            const diasDesde = function(fecha) {
                var d = Math.round((hoy - new Date(new Date(fecha).setHours(0,0,0,0))) / (1000*60*60*24));
                if (d === 0) return 'Hoy';
                if (d === 1) return 'Ayer';
                if (d < 30) return d + 'd';
                if (d < 365) return Math.round(d/30) + 'mes';
                return Math.round(d/365) + 'a';
            };
            const tipoIcon = function(nombre) {
                var n = (nombre||'').toLowerCase();
                if (n.includes('portátil') || n.includes('laptop') || n.includes('macbook')) return '💻';
                if (n.includes('ipad') || n.includes('tablet')) return '📱';
                if (n.includes('ratón') || n.includes('mouse')) return '🖱️';
                if (n.includes('teclado') || n.includes('keyboard')) return '⌨️';
                if (n.includes('monitor') || n.includes('pantalla')) return '🖥️';
                if (n.includes('auricular') || n.includes('headset')) return '🎧';
                if (n.includes('cable') || n.includes('adaptador')) return '🔌';
                if (n.includes('cargador')) return '🔋';
                if (n.includes('móvil') || n.includes('teléfono') || n.includes('phone')) return '📞';
                return '📦';
            };
            const materialChips = function(a) {
                var prods = [];
                try { prods = JSON.parse(a.productosAsignados || '[]'); } catch(e) {}
                if (!prods.length) return null;
                return e('div', { style:{ display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'10px' } },
                    prods.slice(0,5).map(function(p, i) {
                        return e('span', { key:i, style:{ display:'inline-flex', alignItems:'center', gap:'4px', background:'var(--bg-tertiary)', border:'1px solid var(--border)', borderRadius:'20px', padding:'4px 10px', fontSize:'11px', fontWeight:'600', color:'var(--text-secondary)' } },
                            tipoIcon(p.nombre), p.nombre
                        );
                    }),
                    prods.length > 5 && e('span', { style:{ display:'inline-flex', alignItems:'center', background:'rgba(88,166,255,.1)', border:'1px solid #58a6ff33', borderRadius:'20px', padding:'4px 10px', fontSize:'11px', fontWeight:'700', color:'#58a6ff' } }, '+' + (prods.length - 5) + ' más')
                );
            };

            // ── Card de asignación ────────────────────────────────────────────
            const assignCard = function(a) {
                const fa = new Date(a.fechaAsignacion); fa.setHours(0,0,0,0);
                const vencido = a.esPrestamo && a.estado === 'Activo' && fa < hoy;
                const isExpanded = expandedId === a.id;
                const col = avatarColor(a.nombreEmpleado);
                const estadoColor = { 'Activo':'#3fb950', 'Devuelto':'#6b7280', 'Parcial':'#fbbf24' }[a.estado] || '#6b7280';
                const dias = diasDesde(a.fechaAsignacion);
                const accentLeft = vencido ? '#ef4444' : a.esPrestamo ? '#fbbf24' : col;

                return e('div', { key: a.id,
                    style:{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:'16px', overflow:'hidden', transition:'all .2s ease', opacity: a.estado === 'Devuelto' ? 0.65 : 1,
                        boxShadow: vencido ? '0 0 0 2px #ef444433' : 'none' },
                    onMouseEnter: ev => { ev.currentTarget.style.borderColor = accentLeft + '66'; ev.currentTarget.style.transform = 'translateY(-2px)'; ev.currentTarget.style.boxShadow = vencido ? '0 8px 24px #ef444422' : '0 8px 24px rgba(0,0,0,.2)'; },
                    onMouseLeave: ev => { ev.currentTarget.style.borderColor = 'var(--border)'; ev.currentTarget.style.transform = ''; ev.currentTarget.style.boxShadow = vencido ? '0 0 0 2px #ef444433' : 'none'; }
                },
                    // Barra de color superior
                    e('div', { style:{ height:'3px', background: 'linear-gradient(90deg, ' + accentLeft + ', ' + accentLeft + '44)' } }),

                    e('div', { style:{ padding:'18px 20px' } },
                        // ── Header ──
                        e('div', { style:{ display:'flex', alignItems:'flex-start', gap:'14px', marginBottom:'2px' } },
                            // Avatar grande
                            e('div', { style:{ width:'52px', height:'52px', borderRadius:'16px', background:'linear-gradient(135deg,' + col + '33, ' + col + '18)', border:'2px solid ' + col + '55', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:'800', color:col, flexShrink:0, fontFamily:'IBM Plex Mono,monospace', boxShadow:'0 4px 12px ' + col + '22' } },
                                initials(a.nombreEmpleado)
                            ),
                            // Info
                            e('div', { style:{ flex:1, minWidth:0 } },
                                e('div', { style:{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'4px' } },
                                    e('div', { style:{ fontWeight:'800', fontSize:'15px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'200px' } }, a.nombreEmpleado),
                                    e('span', { style:{ padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:'700',
                                        background: vencido ? 'rgba(239,68,68,.15)' : a.esPrestamo ? 'rgba(251,191,36,.15)' : 'rgba(88,166,255,.12)',
                                        color: vencido ? '#ef4444' : a.esPrestamo ? '#fbbf24' : '#58a6ff',
                                        border: '1px solid ' + (vencido ? '#ef444433' : a.esPrestamo ? '#fbbf2433' : '#58a6ff33')
                                    } }, vencido ? '⚠️ VENCIDO' : a.esPrestamo ? '⏱ Préstamo' : '📋 Asignación'),
                                    e('span', { style:{ padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', background:estadoColor+'18', color:estadoColor, border:'1px solid '+estadoColor+'33' } }, a.estado)
                                ),
                                e('div', { style:{ display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center' } },
                                    a.departamento && e('span', { style:{ fontSize:'12px', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'4px' } }, '🏢 ', a.departamento),
                                    a.puesto && e('span', { style:{ fontSize:'12px', color:'var(--text-secondary)' } }, '💼 ' + a.puesto),
                                    e('span', { style:{ fontSize:'12px', color:'var(--text-secondary)' } }, '✉️ ' + a.emailEmpleado)
                                )
                            ),
                            // Meta derecha
                            e('div', { style:{ textAlign:'right', flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px' } },
                                e('div', { style:{ background: vencido ? 'rgba(239,68,68,.1)' : 'var(--bg-tertiary)', border:'1px solid ' + (vencido ? '#ef444433' : 'var(--border)'), borderRadius:'10px', padding:'6px 12px', textAlign:'center' } },
                                    e('div', { style:{ fontSize:'18px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color: vencido ? '#ef4444' : col, lineHeight:1 } }, dias),
                                    e('div', { style:{ fontSize:'9px', color:'var(--text-secondary)', fontWeight:'700', textTransform:'uppercase', marginTop:'2px' } }, 'ASIGNADO')
                                ),
                                e('div', { style:{ fontSize:'13px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color:col } },
                                    a.cantidadProductos + ' art.' 
                                ),
                                e('div', { style:{ fontSize:'10px', color:'var(--text-secondary)' } }, new Date(a.fechaAsignacion).toLocaleDateString('es-ES'))
                            )
                        ),

                        // ── Chips material ──
                        materialChips(a),

                        // ── Expansión ──
                        isExpanded && e('div', { style:{ marginTop:'14px', paddingTop:'14px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:'8px' } },
                            a.tecnicoResponsable && e('div', { style:{ display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', color:'var(--text-secondary)' } },
                                e('span', null, '🔧'),
                                e('span', { style:{ fontWeight:'600', color:'var(--text-primary)' } }, a.tecnicoResponsable)
                            ),
                            a.observaciones && e('div', { style:{ fontSize:'13px', color:'var(--text-secondary)', background:'var(--bg-primary)', padding:'10px 14px', borderRadius:'10px', lineHeight:'1.5', borderLeft:'3px solid ' + col } }, '💬 ' + a.observaciones),
                            a.firmaEmpleado && e('div', null,
                                e('div', { style:{ fontSize:'11px', color:'var(--text-secondary)', marginBottom:'6px', textTransform:'uppercase', fontWeight:'700' } }, 'Firma'),
                                e('img', { src: a.firmaEmpleado, style:{ maxWidth:'160px', maxHeight:'60px', border:'1px solid var(--border)', borderRadius:'8px', background:'white' }, alt:'Firma' })
                            )
                        ),

                        // ── Acciones ──
                        e('div', { style:{ display:'flex', gap:'8px', marginTop:'14px', paddingTop:'14px', borderTop:'1px solid var(--border)', flexWrap:'wrap' } },
                            e('button', { className:'button button-secondary', style:{ padding:'9px 14px', fontSize:'13px', flex:1, minWidth:'80px' },
                                onClick: () => setExpandedId(isExpanded ? null : a.id) }, isExpanded ? '▲ Menos' : '▼ Más'),
                            e('button', { className:'button button-secondary', style:{ padding:'9px 14px', fontSize:'13px' },
                                onClick: () => onOpenModal('ver-asignacion', a), title:'Ver detalle' }, '📄'),
                            e('button', { className:'button button-secondary', style:{ padding:'9px 14px', fontSize:'13px' },
                                onClick: () => exportAssignmentToPDF(a), title:'Descargar PDF' }, '📥'),
                            a.estado === 'Activo' && e('button', { className:'button button-warning', style:{ padding:'9px 16px', fontSize:'13px', flex:1 },
                                onClick: () => onOpenModal('devolver-material', a) }, '↩️ Devolver'),
                            state.isAdmin && e('button', { style:{ padding:'9px 14px', fontSize:'13px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', color:'#ef4444', borderRadius:'10px', cursor:'pointer', fontWeight:'700' },
                                onClick: () => onOpenModal('eliminar-asignacion', a), title:'Eliminar' }, '🗑️')
                        )
                    )
                );
            };

            return e('div', { style:{ display:'flex', flexDirection:'column', gap:'16px' } },

                // ── Barra de acción principal — prominente para iPad ──────────
                e('div', { style:{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:'10px', alignItems:'stretch' } },
                    // Buscador grande
                    e('div', { style:{ position:'relative' } },
                        e('span', { style:{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', fontSize:'18px', pointerEvents:'none' } }, '🔍'),
                        e('input', { type:'text', value:search, onChange: ev => setSearch(ev.target.value),
                            placeholder:'Buscar empleado, departamento, email...',
                            style:{ width:'100%', height:'100%', minHeight:'52px', padding:'0 16px 0 46px', background:'var(--bg-secondary)', border:'2px solid var(--border)', borderRadius:'14px', color:'var(--text-primary)', fontSize:'15px', outline:'none', transition:'border-color .2s', boxSizing:'border-box' },
                            onFocus: ev => ev.target.style.borderColor = 'var(--accent-blue)',
                            onBlur:  ev => ev.target.style.borderColor = 'var(--border)'
                        })
                    ),
                    // Botones de acción grandes para iPad
                    e('button', { className:'button button-success', style:{ padding:'0 24px', fontSize:'15px', fontWeight:'800', borderRadius:'14px', minHeight:'52px', whiteSpace:'nowrap' },
                        onClick: () => onOpenModal('nueva-asignacion', null) }, T().assignMaterial),
                    e('button', { className:'button button-warning', style:{ padding:'0 20px', fontSize:'15px', fontWeight:'700', borderRadius:'14px', minHeight:'52px', whiteSpace:'nowrap' },
                        onClick: () => onOpenModal('nuevo-prestamo', null) }, '⏱️ Préstamo'),
                    e('button', { style:{ padding:'0 20px', fontSize:'15px', fontWeight:'700', borderRadius:'14px', minHeight:'52px', background:'rgba(239,68,68,.1)', border:'2px solid rgba(239,68,68,.3)', color:'#ef4444', cursor:'pointer', whiteSpace:'nowrap' },
                        onClick: () => onOpenModal('baja-empleado', null) }, T().employeeLeave)
                ),

                // ── KPIs ──────────────────────────────────────────────────────
                e('div', { style:{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'12px' } },
                    [
                        { label:'Total', value:(state.assignments||[]).length, color:'#58a6ff', icon:'📋', fn: () => { setFilterEstado('all'); setFilterTipo('all'); } },
                        { label:'Asignaciones activas', value:(state.assignments||[]).filter(a=>a.estado==='Activo'&&!a.esPrestamo).length, color:'#3fb950', icon:'✅', fn: () => { setFilterEstado('Activo'); setFilterTipo('asignacion'); } },
                        { label:'Préstamos activos', value:prestamosActivos.length, color:'#fbbf24', icon:'⏱️', fn: () => { setFilterTipo('prestamo'); setFilterEstado('Activo'); } },
                        { label:'Vencidos', value:vencidos.length, color: vencidos.length > 0 ? '#ef4444' : '#6b7280', icon: vencidos.length > 0 ? '⚠️' : '✅', fn: vencidos.length > 0 ? () => { setFilterTipo('prestamo'); setFilterEstado('vencido'); } : null },
                    ].map(function(s, i) {
                        return e('div', { key:i, onClick: s.fn || null,
                            style:{ background:'var(--bg-secondary)', border:'2px solid '+s.color+'33', borderRadius:'14px', padding:'16px 18px', display:'flex', alignItems:'center', gap:'14px', cursor: s.fn ? 'pointer' : 'default', transition:'all .2s ease' },
                            onMouseEnter: s.fn ? ev => { ev.currentTarget.style.borderColor=s.color+'77'; ev.currentTarget.style.transform='translateY(-2px)'; } : null,
                            onMouseLeave: s.fn ? ev => { ev.currentTarget.style.borderColor=s.color+'33'; ev.currentTarget.style.transform=''; } : null
                        },
                            e('div', { style:{ width:'44px', height:'44px', borderRadius:'12px', background:s.color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 } }, s.icon),
                            e('div', null,
                                e('div', { style:{ fontSize:'26px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color:s.color, lineHeight:1 } }, s.value),
                                e('div', { style:{ fontSize:'11px', color:'var(--text-secondary)', fontWeight:'700', textTransform:'uppercase', marginTop:'3px', letterSpacing:'0.5px' } }, s.label)
                            )
                        );
                    })
                ),

                // ── Alerta vencidos ───────────────────────────────────────────
                vencidos.length > 0 && e('div', { style:{ padding:'16px 20px', background:'rgba(239,68,68,.08)', border:'2px solid rgba(239,68,68,.3)', borderRadius:'14px', display:'flex', alignItems:'center', gap:'14px', cursor:'pointer', animation:'pulse 2s infinite' },
                    onClick: () => { setFilterTipo('prestamo'); setFilterEstado('vencido'); } },
                    e('div', { style:{ width:'40px', height:'40px', background:'rgba(239,68,68,.15)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 } }, '⚠️'),
                    e('div', { style:{ flex:1 } },
                        e('div', { style:{ fontWeight:'800', color:'#ef4444', fontSize:'14px' } }, vencidos.length + ' préstamo(s) vencido(s) — Material pendiente de devolución'),
                        e('div', { style:{ fontSize:'12px', color:'var(--text-secondary)', marginTop:'2px' } }, 'Haz clic para filtrar y gestionar')
                    ),
                    e('span', { style:{ color:'#ef4444', fontWeight:'800', fontSize:'18px' } }, '→')
                ),

                // ── Filtros + contador + toggle vista ─────────────────────────
                e('div', { style:{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center', background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:'12px', padding:'12px 16px' } },
                    e('select', { className:'filter-select', value:filterTipo, onChange: ev => setFilterTipo(ev.target.value) },
                        e('option', { value:'all' }, 'Todos los tipos'),
                        e('option', { value:'asignacion' }, '📋 Asignaciones'),
                        e('option', { value:'prestamo' }, '⏱ Préstamos')
                    ),
                    e('select', { className:'filter-select', value:filterEstado, onChange: ev => setFilterEstado(ev.target.value) },
                        e('option', { value:'all' }, 'Todos los estados'),
                        e('option', { value:'Activo' }, '✅ Activo'),
                        e('option', { value:'Devuelto' }, '✓ Devuelto'),
                        e('option', { value:'Parcial' }, '◑ Parcial'),
                        e('option', { value:'vencido' }, '⚠️ Vencidos')
                    ),
                    departamentos.length > 0 && e('select', { className:'filter-select', value:filterDept, onChange: ev => setFilterDept(ev.target.value) },
                        e('option', { value:'all' }, 'Todos los dptos.'),
                        departamentos.map(d => e('option', { key:d, value:d }, d))
                    ),
                    e('span', { style:{ fontSize:'13px', color:'var(--text-secondary)', fontWeight:'700', marginLeft:'4px' } }, filtered.length + ' resultado(s)'),
                    (search || filterTipo !== 'all' || filterEstado !== 'all' || filterDept !== 'all') && e('button', { onClick: () => { setSearch(''); setFilterTipo('all'); setFilterEstado('all'); setFilterDept('all'); }, style:{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', color:'#ef4444', borderRadius:'8px', padding:'5px 12px', cursor:'pointer', fontSize:'12px', fontWeight:'700' } }, '✕ Limpiar'),
                    e('div', { style:{ marginLeft:'auto', display:'flex', gap:'4px', background:'var(--bg-primary)', borderRadius:'8px', padding:'3px' } },
                        [['cards','🃏'],['table','☰']].map(function(m) {
                            return e('button', { key:m[0], onClick: () => setViewMode(m[0]), style:{ padding:'5px 12px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'14px', background: viewMode===m[0] ? 'var(--accent-blue)' : 'transparent', color: viewMode===m[0] ? 'white' : 'var(--text-secondary)', transition:'all .15s' } }, m[1]);
                        })
                    )
                ),

                // ── Contenido ─────────────────────────────────────────────────
                filtered.length === 0 ?
                    e('div', { style:{ textAlign:'center', padding:'60px 20px', background:'var(--bg-secondary)', borderRadius:'16px', border:'1px solid var(--border)' } },
                        e('div', { style:{ fontSize:'56px', marginBottom:'16px' } }, search ? '🔍' : '📋'),
                        e('div', { style:{ fontSize:'18px', fontWeight:'700', marginBottom:'8px' } }, search ? 'Sin resultados' : 'No hay asignaciones'),
                        e('div', { style:{ fontSize:'14px', color:'var(--text-secondary)', marginBottom:'24px' } }, search ? 'Prueba con otros términos' : 'Empieza asignando material a un empleado'),
                        !search && e('button', { className:'button button-success', style:{ fontSize:'15px', padding:'14px 28px' }, onClick: () => onOpenModal('nueva-asignacion', null) }, '+ Nueva Asignación')
                    ) :

                viewMode === 'cards' ?
                    e('div', { style:{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(400px, 1fr))', gap:'14px' } },
                        filtered.map(assignCard)
                    ) :

                    e('div', { style:{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:'16px', overflow:'hidden' } },
                        e('table', { className:'history-table', style:{ margin:0 } },
                            e('thead', null, e('tr', null,
                                e('th', { style:{ width:'90px' } }, 'Tipo'),
                                e('th', { style:{ width:'100px' } }, 'Fecha'),
                                e('th', null, 'Empleado'),
                                e('th', null, 'Departamento'),
                                e('th', { style:{ width:'60px', textAlign:'center' } }, 'Items'),
                                e('th', { style:{ width:'90px' } }, 'Estado'),
                                e('th', { style:{ width:'130px' } }, 'Acciones')
                            )),
                            e('tbody', null, filtered.map(function(a) {
                                const fa = new Date(a.fechaAsignacion); fa.setHours(0,0,0,0);
                                const vencido = a.esPrestamo && a.estado === 'Activo' && fa < hoy;
                                const col = avatarColor(a.nombreEmpleado);
                                const estadoColor = { 'Activo':'#3fb950', 'Devuelto':'#6b7280', 'Parcial':'#fbbf24' }[a.estado] || '#6b7280';
                                return e('tr', { key:a.id, style:{ borderLeft: '3px solid ' + (vencido ? '#ef4444' : col), background: vencido ? 'rgba(239,68,68,.04)' : 'transparent' } },
                                    e('td', null, e('span', { style:{ padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', background: vencido ? 'rgba(239,68,68,.15)' : a.esPrestamo ? 'rgba(251,191,36,.15)' : 'rgba(88,166,255,.15)', color: vencido ? '#ef4444' : a.esPrestamo ? '#fbbf24' : '#58a6ff' } }, vencido ? '⚠️ VENCIDO' : a.esPrestamo ? '⏱' : '📋')),
                                    e('td', { style:{ fontSize:'12px', fontFamily:'IBM Plex Mono,monospace', color:'var(--text-secondary)' } }, new Date(a.fechaAsignacion).toLocaleDateString('es-ES')),
                                    e('td', null, e('div', { style:{ display:'flex', alignItems:'center', gap:'8px' } },
                                        e('div', { style:{ width:'32px', height:'32px', borderRadius:'10px', background:col+'22', border:'1px solid '+col+'44', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'800', color:col, flexShrink:0 } }, initials(a.nombreEmpleado)),
                                        e('div', null, e('div', { style:{ fontWeight:'600', fontSize:'13px' } }, a.nombreEmpleado), e('div', { style:{ fontSize:'11px', color:'var(--text-secondary)' } }, a.emailEmpleado))
                                    )),
                                    e('td', { style:{ fontSize:'13px', color:'var(--text-secondary)' } }, a.departamento || '—'),
                                    e('td', { style:{ textAlign:'center', fontFamily:'IBM Plex Mono,monospace', fontWeight:'700', color:col } }, a.cantidadProductos),
                                    e('td', null, e('span', { style:{ padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', background:estadoColor+'22', color:estadoColor } }, a.estado)),
                                    e('td', null, e('div', { style:{ display:'flex', gap:'4px', justifyContent:'center' } },
                                        e('div', { className:'action-icon', onClick: () => onOpenModal('ver-asignacion', a), title:'Ver' }, '📄'),
                                        e('div', { className:'action-icon', onClick: () => exportAssignmentToPDF(a), title:'PDF' }, '📥'),
                                        a.estado === 'Activo' && e('div', { className:'action-icon', onClick: () => onOpenModal('devolver-material', a), title:'Devolver' }, '↩️'),
                                        state.isAdmin && e('div', { className:'action-icon danger', onClick: () => onOpenModal('eliminar-asignacion', a), title:'Eliminar' }, '🗑️')
                                    ))
                                );
                            }))
                        )
                    )
            );
        }




        // ==========================================
        // CONSTANTES GLOBALES
        // ==========================================
        // ==========================================
        // FORM MODAL - v1.9.0

export default AssignmentsView;