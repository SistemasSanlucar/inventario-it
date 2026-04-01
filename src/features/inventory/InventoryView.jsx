import React, { useEffect, useRef, useState } from 'react';
import { T } from '../../lib/i18n';
import { startBarcodeScanner } from '../../services/scanner/scannerService';

const e = React.createElement;

        function InventoryView({ state, onRefresh, onOpenModal, initialFilter }) {
            const [viewMode, setViewMode] = React.useState('zonas');
            const [search, setSearch] = React.useState('');
            const [filterCategory, setFilterCategory] = React.useState('all');
            const [filterEstado, setFilterEstado] = React.useState('all');
            const [selectedZona, setSelectedZona] = React.useState(null);
            const [selectedSede, setSelectedSede] = React.useState('all');

            React.useEffect(function() {
                if (!initialFilter) return;
                if (initialFilter.tipo === 'stockBajo') { setFilterEstado('stockBajo'); setViewMode('lista'); }
                if (initialFilter.tipo === 'sinStock')  { setFilterEstado('sinStock');  setViewMode('lista'); }
            }, []);

            const categories = [...new Set((state.inventory||[]).map(i => i.categoria))].filter(Boolean);

            const zonas = {};
            (state.inventory || []).forEach(function(item) {
                const loc = item.ubicacion || 'Sin ubicacion';
                if (!zonas[loc]) zonas[loc] = [];
                zonas[loc].push(item);
            });

            const sedes = [...new Set(Object.keys(zonas).map(function(z) {
                return z.includes(' - ') ? z.split(' - ')[0].trim() : 'General';
            }))];

            const zonasFiltradas = Object.keys(zonas).filter(function(z) {
                if (selectedSede === 'all') return true;
                const sede = z.includes(' - ') ? z.split(' - ')[0].trim() : 'General';
                return sede === selectedSede;
            }).filter(function(z) { return z !== 'Sin ubicacion'; });

            const zonaStats = function(zona) {
                const items = zonas[zona] || [];
                const sinStock = items.filter(function(i) { return i.stock === 0; }).length;
                const stockBajo = items.filter(function(i) { return i.stock > 0 && i.stock <= i.stockMinimo; }).length;
                const unidades = items.reduce(function(s, i) { return s + (i.stock || 0); }, 0);
                const semaforo = sinStock > 0 ? '#ef4444' : stockBajo > 0 ? '#f97316' : '#3fb950';
                return { total: items.length, sinStock, stockBajo, unidades, semaforo };
            };

            const filtered = (state.inventory || []).filter(function(item) {
                const q = search.toLowerCase();
                const matchesSearch = !q || item.nombre.toLowerCase().includes(q) || (item.categoria||'').toLowerCase().includes(q) || (item.barcode||'').includes(q);
                const matchesCat = filterCategory === 'all' || item.categoria === filterCategory;
                let matchesEst = true;
                if (filterEstado === 'stockBajo') matchesEst = item.stock > 0 && item.stock <= item.stockMinimo;
                else if (filterEstado === 'sinStock') matchesEst = item.stock === 0;
                const matchesZona = !selectedZona || item.ubicacion === selectedZona;
                return matchesSearch && matchesCat && matchesEst && matchesZona;
            }).sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });

            const productCard = function(item) {
                const sinStock = item.stock === 0;
                const bajo = item.stock > 0 && item.stock <= item.stockMinimo;
                const col = sinStock ? '#ef4444' : bajo ? '#f97316' : '#3fb950';
                const pct = Math.min(100, item.stockMinimo > 0 ? Math.round(item.stock / item.stockMinimo * 100) : 100);
                return e('div', { key: item.id, style: { background:'var(--bg-secondary)', border:'1px solid '+col+'33', borderRadius:'12px', padding:'14px', transition:'all .2s', borderLeft:'3px solid '+col },
                    onMouseEnter: ev => { ev.currentTarget.style.transform='translateY(-2px)'; ev.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,.2)'; },
                    onMouseLeave: ev => { ev.currentTarget.style.transform=''; ev.currentTarget.style.boxShadow=''; }
                },
                    e('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' } },
                        e('div', { style:{ flex:1, minWidth:0 } },
                            e('div', { style:{ fontWeight:'700', fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'2px' } }, item.nombre),
                            e('div', { style:{ fontSize:'11px', color:'var(--text-secondary)' } }, item.categoria)
                        ),
                        e('div', { style:{ textAlign:'right', flexShrink:0 } },
                            e('div', { style:{ fontSize:'20px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color:col, lineHeight:1 } }, item.stock),
                            e('div', { style:{ fontSize:'9px', color:'var(--text-secondary)', textTransform:'uppercase' } }, 'uds')
                        )
                    ),
                    e('div', { style:{ height:'3px', background:'var(--bg-primary)', borderRadius:'2px', overflow:'hidden', marginBottom:'10px' } },
                        e('div', { style:{ height:'100%', width:pct+'%', background:col, borderRadius:'2px', transition:'width .8s ease' } })
                    ),
                    sinStock && e('div', { style:{ fontSize:'10px', fontWeight:'800', color:'#ef4444', marginBottom:'8px', textAlign:'center', background:'rgba(239,68,68,.1)', padding:'2px', borderRadius:'4px' } }, '🔴 AGOTADO'),
                    e('div', { style:{ display:'flex', gap:'4px' } },
                        e('button', { style:{ flex:1, padding:'6px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:'6px', color:'#ef4444', cursor:sinStock?'not-allowed':'pointer', fontSize:'12px', fontWeight:'700', opacity:sinStock?0.4:1 },
                            disabled:sinStock, onClick:()=>onOpenModal('salida',item) }, '📤'),
                        e('button', { style:{ flex:1, padding:'6px', background:'rgba(63,185,80,.1)', border:'1px solid rgba(63,185,80,.2)', borderRadius:'6px', color:'#3fb950', cursor:'pointer', fontSize:'12px', fontWeight:'700' },
                            onClick:()=>onOpenModal('entrada',item) }, '📥'),
                        e('button', { style:{ padding:'6px 8px', background:'var(--bg-tertiary)', border:'1px solid var(--border)', borderRadius:'6px', color:'var(--text-secondary)', cursor:'pointer', fontSize:'12px' },
                            onClick:()=>onOpenModal('editar',item) }, '✏️'),
                        e('button', { style:{ padding:'6px 8px', background:'var(--bg-tertiary)', border:'1px solid var(--border)', borderRadius:'6px', color:'var(--text-secondary)', cursor:'pointer', fontSize:'12px' },
                            onClick:()=>onOpenModal('eliminar-producto',item) }, '🗑️')
                    )
                );
            };

            const zonaCard = function(zona) {
                const st = zonaStats(zona);
                const label = zona.includes(' - ') ? zona.split(' - ').slice(1).join(' - ') : zona;
                return e('div', { key:zona, onClick:()=>{ setSelectedZona(zona); setViewMode('lista'); },
                    style:{ background:'var(--bg-secondary)', border:'2px solid '+st.semaforo+'33', borderRadius:'16px', padding:'20px', cursor:'pointer', transition:'all .2s', position:'relative', overflow:'hidden' },
                    onMouseEnter: ev=>{ ev.currentTarget.style.transform='translateY(-4px)'; ev.currentTarget.style.boxShadow='0 12px 32px rgba(0,0,0,.25)'; ev.currentTarget.style.borderColor=st.semaforo+'88'; },
                    onMouseLeave: ev=>{ ev.currentTarget.style.transform=''; ev.currentTarget.style.boxShadow=''; ev.currentTarget.style.borderColor=st.semaforo+'33'; }
                },
                    e('div', { style:{ position:'absolute', top:0, left:0, right:0, height:'3px', background:'linear-gradient(90deg,'+st.semaforo+','+st.semaforo+'44)' } }),
                    e('div', { style:{ fontSize:'36px', marginBottom:'10px' } }, '🗄️'),
                    e('div', { style:{ fontWeight:'800', fontSize:'15px', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, label),
                    e('div', { style:{ fontSize:'11px', color:'var(--text-secondary)', marginBottom:'12px' } }, zona),
                    e('div', { style:{ display:'flex', gap:'8px', marginBottom:'10px' } },
                        e('div', { style:{ flex:1, textAlign:'center', background:'var(--bg-primary)', borderRadius:'8px', padding:'6px' } },
                            e('div', { style:{ fontSize:'18px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color:'#58a6ff' } }, st.total),
                            e('div', { style:{ fontSize:'9px', color:'var(--text-secondary)', textTransform:'uppercase' } }, 'Refs')
                        ),
                        e('div', { style:{ flex:1, textAlign:'center', background:'var(--bg-primary)', borderRadius:'8px', padding:'6px' } },
                            e('div', { style:{ fontSize:'18px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color:'#3fb950' } }, st.unidades),
                            e('div', { style:{ fontSize:'9px', color:'var(--text-secondary)', textTransform:'uppercase' } }, 'Uds')
                        ),
                        (st.sinStock + st.stockBajo) > 0 && e('div', { style:{ flex:1, textAlign:'center', background:st.semaforo+'18', borderRadius:'8px', padding:'6px', border:'1px solid '+st.semaforo+'33' } },
                            e('div', { style:{ fontSize:'18px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color:st.semaforo } }, st.sinStock + st.stockBajo),
                            e('div', { style:{ fontSize:'9px', color:st.semaforo, textTransform:'uppercase', fontWeight:'700' } }, 'Alerta')
                        )
                    ),
                    e('div', { style:{ height:'4px', background:'var(--bg-primary)', borderRadius:'2px', overflow:'hidden' } },
                        e('div', { style:{ height:'100%', width:Math.min(st.total*8,100)+'%', background:st.semaforo, borderRadius:'2px' } })
                    ),
                    e('div', { style:{ textAlign:'right', fontSize:'10px', color:'var(--text-secondary)', marginTop:'5px', fontWeight:'700' } }, '→ Ver contenido')
                );
            };

            return e('div', { style:{ display:'flex', flexDirection:'column', gap:'16px' } },

                e('div', { style:{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:'16px', padding:'16px 20px', display:'flex', flexDirection:'column', gap:'12px' } },
                    e('div', { style:{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' } },
                        e('div', { style:{ flex:1, position:'relative', minWidth:'200px' } },
                            e('span', { style:{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'16px', pointerEvents:'none' } }, '🔍'),
                            e('input', { type:'text', className:'search-bar', placeholder:'Buscar productos...', value:search,
                                onChange: ev=>{ setSearch(ev.target.value); if(ev.target.value) setViewMode('lista'); },
                                style:{ paddingLeft:'38px', width:'100%' } })
                        ),
                        e('button', { className:'button button-primary', style:{ padding:'12px 16px' },
                            onClick:()=>startBarcodeScanner(function(code){ setSearch(code); setViewMode('lista'); }) }, '📷'),
                        e('button', { className:'button button-success', onClick:()=>onOpenModal('entrada',null) }, '+ Producto'),
                        e('button', { className:'button button-secondary', onClick:()=>exportToCSV(state.inventory,'inventario') }, '⬇️'),
                        e('div', { style:{ display:'flex', gap:'3px', background:'var(--bg-primary)', borderRadius:'8px', padding:'3px' } },
                            e('button', { onClick:()=>{ setViewMode('zonas'); setSelectedZona(null); setSearch(''); setFilterEstado('all'); },
                                style:{ padding:'6px 14px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'700',
                                    background: viewMode==='zonas' ? 'var(--accent-purple)' : 'transparent',
                                    color: viewMode==='zonas' ? 'white' : 'var(--text-secondary)' } }, '🗄️ Zonas'),
                            e('button', { onClick:()=>setViewMode('lista'),
                                style:{ padding:'6px 14px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'700',
                                    background: viewMode==='lista' ? 'var(--accent-blue)' : 'transparent',
                                    color: viewMode==='lista' ? 'white' : 'var(--text-secondary)' } }, T().list)
                        )
                    ),
                    viewMode === 'zonas' && sedes.length > 1 && e('div', { style:{ display:'flex', gap:'6px', flexWrap:'wrap' } },
                        [['all','🌍 Todas']].concat(sedes.map(s=>[s,s])).map(function(item) {
                            return e('button', { key:item[0], onClick:()=>setSelectedSede(item[0]), style:{
                                padding:'5px 14px', borderRadius:'20px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'700',
                                background: selectedSede===item[0] ? 'var(--accent-purple)' : 'var(--bg-primary)',
                                color: selectedSede===item[0] ? 'white' : 'var(--text-secondary)'
                            } }, item[1]);
                        })
                    ),
                    viewMode === 'lista' && e('div', { style:{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' } },
                        e('select', { className:'filter-select', value:filterCategory, onChange:ev=>setFilterCategory(ev.target.value) },
                            e('option',{value:'all'},'Todas las categorías'),
                            categories.map(cat=>e('option',{key:cat,value:cat},cat))
                        ),
                        e('select', { className:'filter-select', value:filterEstado, onChange:ev=>setFilterEstado(ev.target.value) },
                            e('option',{value:'all'},'Todos los estados'),
                            e('option',{value:'stockBajo'},'⚠️ Stock Bajo'),
                            e('option',{value:'sinStock'},'🔴 Sin Stock')
                        ),
                        selectedZona && e('div', { style:{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(168,85,247,.1)', border:'1px solid rgba(168,85,247,.3)', borderRadius:'8px', padding:'5px 12px' } },
                            e('span', { style:{ fontSize:'13px', fontWeight:'700', color:'var(--accent-purple)' } }, '🗄️ ' + selectedZona),
                            e('button', { onClick:()=>setSelectedZona(null), style:{ background:'none', border:'none', color:'var(--accent-purple)', cursor:'pointer', fontWeight:'800', fontSize:'14px' } }, '✕')
                        ),
                        e('span', { style:{ fontSize:'13px', color:'var(--text-secondary)', fontWeight:'600' } }, filtered.length + ' producto(s)')
                    )
                ),

                viewMode === 'zonas' && (
                    zonasFiltradas.length === 0 ?
                        e('div', { style:{ textAlign:'center', padding:'60px', background:'var(--bg-secondary)', borderRadius:'16px' } },
                            e('div', { style:{ fontSize:'56px', marginBottom:'16px' } }, '🗄️'),
                            e('div', { style:{ fontSize:'18px', fontWeight:'700', marginBottom:'8px' } }, 'Sin ubicaciones configuradas'),
                            e('div', { style:{ fontSize:'14px', color:'var(--text-secondary)' } }, 'Asigna ubicaciones a los productos para verlos agrupados')
                        ) :
                        e('div', { style:{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'16px' } },
                            zonasFiltradas.map(zonaCard)
                        )
                ),

                viewMode === 'lista' && (
                    filtered.length === 0 ?
                        e('div', { style:{ textAlign:'center', padding:'60px', background:'var(--bg-secondary)', borderRadius:'16px' } },
                            e('div', { style:{ fontSize:'48px', marginBottom:'12px' } }, '🔍'),
                            e('div', { style:{ fontWeight:'700', fontSize:'16px' } }, 'Sin resultados')
                        ) :
                        e('div', { style:{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'12px' } },
                            filtered.map(productCard)
                        )
                )
            );
        }

export default InventoryView;