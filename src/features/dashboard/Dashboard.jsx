import React, { useEffect, useRef, useState } from 'react';
import { T } from '../../lib/i18n';

const e = React.createElement;

        function Dashboard({ state, onNavigate }) {
            const [counters, setCounters] = React.useState({ equipos: 0, asignados: 0, almacen: 0, movHoy: 0, unidades: 0 });
            const [animDone, setAnimDone] = React.useState(false);
            const [hoveredSeg, setHoveredSeg] = React.useState(null);
            const [hoveredDay, setHoveredDay] = React.useState(null);
            const [hoveredLine, setHoveredLine] = React.useState(null);
            const hoy = new Date(); hoy.setHours(0,0,0,0);

            // ── Stats ──────────────────────────────────────────────────────────
            const equiposAll = state.activos || [];
            const eq = {
                total: equiposAll.length,
                almacen: equiposAll.filter(a => a.estado === 'Almacen').length,
                asignado: equiposAll.filter(a => a.estado === 'Asignado').length,
                pendiente: equiposAll.filter(a => a.estado === 'Pendiente').length,
                transito: equiposAll.filter(a => a.estado === 'Transito').length,
                reparacion: equiposAll.filter(a => a.estado === 'Reparacion').length,
                extraviado: equiposAll.filter(a => a.estado === 'Extraviado').length,
                robado: equiposAll.filter(a => a.estado === 'Robado').length,
                baja: equiposAll.filter(a => a.estado === 'Baja').length,
            };
            const inv = {
                total: state.inventory.length,
                unidades: state.inventory.reduce((s, i) => s + (i.stock || 0), 0),
                stockBajo: state.inventory.filter(i => i.stock > 0 && i.stock <= i.stockMinimo).length,
                sinStock: state.inventory.filter(i => i.stock === 0).length,
            };
            const movHoy = state.history.filter(h => new Date(h.fecha).toDateString() === new Date().toDateString()).length;
            const prestamosVencidos = state.assignments.filter(a => a.esPrestamo && a.estado === 'Activo' && new Date(a.fechaAsignacion) < hoy);

            // ── Alertas ────────────────────────────────────────────────────────
            const alertas = [];
            if (inv.sinStock > 0)             alertas.push({ tipo:'error',   icon:'📦', msg: inv.sinStock + ' producto(s) sin stock',           nav:() => onNavigate('inventario',{ tipo:'sinStock'}) });
            if (inv.stockBajo > 0)            alertas.push({ tipo:'warning', icon:'⚠️', msg: inv.stockBajo + ' producto(s) con stock bajo',      nav:() => onNavigate('inventario',{ tipo:'stockBajo'}) });
            if (eq.pendiente > 0)             alertas.push({ tipo:'warning', icon:'🔖', msg: eq.pendiente + ' equipo(s) sin número de serie',    nav:() => onNavigate('equipos',{ estado:'Pendiente'}) });
            if (prestamosVencidos.length > 0) alertas.push({ tipo:'error',   icon:'⏰', msg: prestamosVencidos.length + ' préstamo(s) vencido(s)', nav:() => onNavigate('asignaciones',{ tipo:'prestamo', estado:'vencido'}) });
            if (eq.extraviado > 0)            alertas.push({ tipo:'error',   icon:'🔍', msg: eq.extraviado + ' equipo(s) extraviado(s)',         nav:() => onNavigate('equipos',{ estado:'Extraviado'}) });
            if (eq.transito > 0)              alertas.push({ tipo:'warning', icon:'🚚', msg: eq.transito + ' equipo(s) en tránsito',             nav:() => onNavigate('equipos',{ estado:'Transito'}) });

            // ── Health score ───────────────────────────────────────────────────
            let health = 100;
            health -= inv.sinStock * 10;
            health -= inv.stockBajo * 3;
            health -= eq.extraviado * 15;
            health -= eq.robado * 15;
            health -= prestamosVencidos.length * 5;
            health = Math.max(0, Math.min(100, health));
            const healthColor = health >= 80 ? '#3fb950' : health >= 55 ? '#fbbf24' : '#ef4444';
            const healthLabel = health >= 80 ? T().optimal : health >= 55 ? T().attention : 'Crítico';

            // ── Animated counters ──────────────────────────────────────────────
            React.useEffect(function() {
                if (animDone) return;
                const targets = { equipos: eq.total, asignados: eq.asignado, almacen: eq.almacen, movHoy, unidades: inv.unidades };
                const steps = 45, duration = 1200;
                let step = 0;
                const timer = setInterval(function() {
                    step++;
                    const ease = 1 - Math.pow(1 - step / steps, 3);
                    setCounters({ equipos: Math.round(targets.equipos * ease), asignados: Math.round(targets.asignados * ease), almacen: Math.round(targets.almacen * ease), movHoy: Math.round(targets.movHoy * ease), unidades: Math.round(targets.unidades * ease) });
                    if (step >= steps) { clearInterval(timer); setAnimDone(true); }
                }, duration / steps);
                return function() { clearInterval(timer); };
            }, []);

            // ── Donut ──────────────────────────────────────────────────────────
            const donutSegs = [
                { label:'Almacén',    value: eq.almacen,    color:'#3fb950' },
                { label:'Asignado',   value: eq.asignado,   color:'#58a6ff' },
                { label:'Pendiente',  value: eq.pendiente,  color:'#f97316' },
                { label:'Tránsito',   value: eq.transito,   color:'#fbbf24' },
                { label:'Reparación', value: eq.reparacion, color:'#a855f7' },
                { label:'Extraviado', value: eq.extraviado, color:'#ef4444' },
                { label:'Robado',     value: eq.robado,     color:'#dc2626' },
                { label:'Baja',       value: eq.baja,       color:'#6b7280' },
            ].filter(s => s.value > 0);
            const donutTotal = donutSegs.reduce((s, seg) => s + seg.value, 0) || 1;
            const r = 60, CX = 80, CY = 80, circ = 2 * Math.PI * r;
            let acc = 0;
            const donutPaths = donutSegs.map(seg => {
                const arcLen = (seg.value / donutTotal) * circ;
                const dashArray = arcLen + ' ' + (circ - arcLen);
                const dashOffset = circ * 0.25 - acc;
                acc += arcLen;
                return Object.assign({}, seg, { dashArray, dashOffset });
            });

            // ── 30-day line chart ─────────────────────────────────────────────
            const last30 = [];
            for (var di = 29; di >= 0; di--) {
                var d = new Date(); d.setDate(d.getDate() - di); d.setHours(0,0,0,0);
                var next = new Date(d); next.setDate(next.getDate() + 1);
                var entradas = state.history.filter(h => { var hd = new Date(h.fecha); return hd >= d && hd < next && h.tipo === 'Entrada'; }).length;
                var salidas  = state.history.filter(h => { var hd = new Date(h.fecha); return hd >= d && hd < next && h.tipo === 'Salida'; }).length;
                var total    = state.history.filter(h => { var hd = new Date(h.fecha); return hd >= d && hd < next; }).length;
                last30.push({ d, entradas, salidas, total, label: d.getDate() + '/' + (d.getMonth()+1), isToday: di === 0 });
            }
            const maxLine = Math.max.apply(null, last30.map(d => d.total).concat([1]));
            const lineW = 560, lineH = 90, padL = 6, padR = 6, padT = 8, padB = 4;
            const lx = i => padL + (i / 29) * (lineW - padL - padR);
            const ly = v => padT + (1 - v / maxLine) * (lineH - padT - padB);
            const totalPath = last30.map((d,i) => (i===0?'M':'L') + lx(i).toFixed(1) + ',' + ly(d.total).toFixed(1)).join(' ');
            const entPath   = last30.map((d,i) => (i===0?'M':'L') + lx(i).toFixed(1) + ',' + ly(d.entradas).toFixed(1)).join(' ');
            const salPath   = last30.map((d,i) => (i===0?'M':'L') + lx(i).toFixed(1) + ',' + ly(d.salidas).toFixed(1)).join(' ');
            const areaTotal = totalPath + ' L' + lx(29).toFixed(1) + ',' + lineH + ' L' + padL + ',' + lineH + ' Z';

            // ── Heatmap (últimas 12 semanas por día) ─────────────────────────
            const heatDays = ['L','M','X','J','V','S','D'];
            const heatWeeks = 12;
            const heatData = [];
            for (var w = heatWeeks - 1; w >= 0; w--) {
                var week = [];
                for (var dw = 0; dw < 7; dw++) {
                    var date = new Date();
                    var dayOfWeek = date.getDay();
                    var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    date.setDate(date.getDate() + mondayOffset - w * 7 + dw);
                    date.setHours(0,0,0,0);
                    var nextD = new Date(date); nextD.setDate(nextD.getDate() + 1);
                    var cnt = state.history.filter(function(h) { var hd = new Date(h.fecha); return hd >= date && hd < nextD; }).length;
                    var isFuture = date > hoy;
                    week.push({ date: new Date(date), cnt, isFuture, label: date.getDate() + '/' + (date.getMonth()+1) });
                }
                heatData.push(week);
            }
            const heatMax = Math.max.apply(null, heatData.flat().map(d => d.cnt).concat([1]));
            const heatColor = function(cnt, isFuture) {
                if (isFuture) return 'var(--bg-primary)';
                if (cnt === 0) return '#1a2130';
                const intensity = cnt / heatMax;
                if (intensity < 0.25) return '#0d4429';
                if (intensity < 0.5)  return '#1a6b3c';
                if (intensity < 0.75) return '#26a047';
                return '#3fb950';
            };

            // ── Last 7 days bars ───────────────────────────────────────────────
            const last7 = [];
            for (var di7 = 6; di7 >= 0; di7--) {
                var d7 = new Date(); d7.setDate(d7.getDate() - di7); d7.setHours(0,0,0,0);
                var next7 = new Date(d7); next7.setDate(next7.getDate() + 1);
                var cnt7 = state.history.filter(function(h) { var hd = new Date(h.fecha); return hd >= d7 && hd < next7; }).length;
                last7.push({ label: di7 === 0 ? 'Hoy' : ['D','L','M','X','J','V','S'][d7.getDay()], count: cnt7, isToday: di7 === 0 });
            }
            const maxDay = Math.max.apply(null, last7.map(d => d.count).concat([1]));

            // ── Garantías próximas ─────────────────────────────────────────────
            const garantiasProximas = equiposAll.filter(function(a) {
                if (!a.fechaGarantia) return false;
                var fg = new Date(a.fechaGarantia);
                var diff = (fg - hoy) / (1000 * 60 * 60 * 24);
                return diff >= 0 && diff <= 90;
            }).sort(function(a,b) { return new Date(a.fechaGarantia) - new Date(b.fechaGarantia); }).slice(0, 5);

            // ── Top técnicos ───────────────────────────────────────────────────
            const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
            const techAct = state.technicians.filter(t => t.activo).map(t => ({
                nombre: t.nombre.split(' ')[0],
                count: state.history.filter(h => h.tecnico === t.nombre && new Date(h.fecha) >= monthStart).length
            })).sort((a,b) => b.count - a.count).slice(0,5);
            const maxTech = Math.max.apply(null, techAct.map(t => t.count).concat([1]));

            // ── Recent history ─────────────────────────────────────────────────
            const recentH = state.history.slice().sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).slice(0,6);

            // ── Helpers ────────────────────────────────────────────────────────
            const kpi = function(label, value, color, icon, onClick, sub) {
                return e('div', {
                    onClick: onClick || null,
                    style: { background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)', border: '1px solid ' + color + '33', borderRadius: '16px', padding: '22px 18px', cursor: onClick ? 'pointer' : 'default', transition: 'all .2s ease', position: 'relative', overflow: 'hidden', flex: 1, minWidth: '130px' },
                    onMouseEnter: onClick ? ev => { ev.currentTarget.style.transform='translateY(-4px)'; ev.currentTarget.style.boxShadow='0 16px 40px '+color+'22'; ev.currentTarget.style.borderColor=color+'88'; } : null,
                    onMouseLeave: onClick ? ev => { ev.currentTarget.style.transform=''; ev.currentTarget.style.boxShadow=''; ev.currentTarget.style.borderColor=color+'33'; } : null,
                },
                    e('div', { style:{ position:'absolute', top:'-15px', right:'-15px', width:'70px', height:'70px', borderRadius:'50%', background:color+'18', filter:'blur(16px)' } }),
                    e('div', { style:{ fontSize:'26px', marginBottom:'6px' } }, icon),
                    e('div', { style:{ fontSize:'34px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color, lineHeight:1, marginBottom:'5px' } }, value),
                    e('div', { style:{ fontSize:'11px', fontWeight:'700', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'1px' } }, label),
                    sub && e('div', { style:{ fontSize:'11px', color:color+'99', marginTop:'4px', fontWeight:'600' } }, sub)
                );
            };
            const card = function(children, extraStyle) {
                return e('div', { style: Object.assign({ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:'16px', padding:'24px' }, extraStyle || {}) }, children);
            };
            const cardTitle = function(text, action) {
                return e('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' } },
                    e('div', { style:{ fontSize:'12px', fontWeight:'700', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'1px' } }, text),
                    action && e('button', { onClick: action.fn, style:{ background:'none', border:'none', color:'#58a6ff', fontSize:'12px', fontWeight:'700', cursor:'pointer' } }, action.label)
                );
            };

            return e('div', { style:{ display:'flex', flexDirection:'column', gap:'20px' } },

                // ── Header ────────────────────────────────────────────────────
                e('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'16px' } },
                    e('div', null,
                        e('h2', { style:{ fontSize:'26px', fontWeight:'800', marginBottom:'4px', background:'linear-gradient(135deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' } }, T().missionControl),
                        e('div', { style:{ fontSize:'13px', color:'var(--text-secondary)' } }, 'Última sincronización: ' + (state.lastSync ? state.lastSync.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' }) : '—'))
                    ),
                    e('div', { style:{ display:'flex', alignItems:'center', gap:'16px', background:'var(--bg-secondary)', border:'2px solid '+healthColor+'44', borderRadius:'16px', padding:'14px 20px' } },
                        e('div', { style:{ textAlign:'center' } },
                            e('div', { style:{ fontSize:'10px', fontWeight:'700', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'3px' } }, T().generalStatus),
                            e('div', { style:{ fontSize:'30px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color:healthColor, lineHeight:1 } }, health + '%'),
                            e('div', { style:{ fontSize:'11px', fontWeight:'700', color:healthColor, marginTop:'2px' } }, healthLabel)
                        ),
                        e('div', { style:{ width:'8px', height:'56px', background:'var(--bg-primary)', borderRadius:'4px', overflow:'hidden', position:'relative' } },
                            e('div', { style:{ position:'absolute', bottom:0, width:'100%', height:health+'%', background:healthColor, borderRadius:'4px', transition:'height 1.2s ease' } })
                        )
                    )
                ),

                // ── Hero KPIs ─────────────────────────────────────────────────
                e('div', { style:{ display:'flex', gap:'14px', flexWrap:'wrap' } },
                    kpi('Equipos',    counters.equipos,   '#58a6ff', '💻', () => onNavigate('equipos', {}),                   eq.total + ' etiquetados'),
                    kpi('Asignados',  counters.asignados, '#3fb950', '✅', () => onNavigate('equipos', { estado:'Asignado' }), Math.round(eq.asignado/(eq.total||1)*100)+'% del total'),
                    kpi('En Almacén', counters.almacen,   '#a855f7', '🏪', () => onNavigate('equipos', { estado:'Almacen' }), 'disponibles'),
                    kpi('Unidades',   counters.unidades,  '#fbbf24', '📦', () => onNavigate('inventario', {}),                inv.total + ' referencias'),
                    kpi('Hoy',        counters.movHoy,    alertas.length > 0 ? '#f97316' : '#3fb950', alertas.length > 0 ? '🚨' : '⚡', null, alertas.length > 0 ? alertas.length + ' alerta(s)' : 'sin alertas')
                ),

                // ── Línea 30 días + Donut ─────────────────────────────────────
                e('div', { style:{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'18px' } },

                    // Gráfico línea 30 días
                    card(e('div', null,
                        cardTitle('📈 Actividad — Últimos 30 días', { fn: () => onNavigate('historial', {}), label: 'Ver historial →' }),
                        e('div', { style:{ position:'relative' } },
                            e('svg', { width:'100%', viewBox:'0 0 ' + lineW + ' ' + lineH, preserveAspectRatio:'none', style:{ display:'block', overflow:'visible' } },
                                e('defs', null,
                                    e('linearGradient', { id:'gradTotal', x1:'0', y1:'0', x2:'0', y2:'1' },
                                        e('stop', { offset:'0%',   stopColor:'#58a6ff', stopOpacity:'0.3' }),
                                        e('stop', { offset:'100%', stopColor:'#58a6ff', stopOpacity:'0.02' })
                                    )
                                ),
                                e('path', { d:areaTotal, fill:'url(#gradTotal)' }),
                                e('path', { d:totalPath, fill:'none', stroke:'#58a6ff', strokeWidth:'2', strokeLinecap:'round', strokeLinejoin:'round' }),
                                e('path', { d:entPath,   fill:'none', stroke:'#3fb950', strokeWidth:'1.5', strokeLinecap:'round', strokeLinejoin:'round', strokeDasharray:'4 3', opacity:'0.8' }),
                                e('path', { d:salPath,   fill:'none', stroke:'#ef4444', strokeWidth:'1.5', strokeLinecap:'round', strokeLinejoin:'round', strokeDasharray:'4 3', opacity:'0.8' }),
                                // Puntos en hover
                                last30.map(function(d, i) {
                                    return e('circle', { key:i, cx:lx(i), cy:ly(d.total), r: hoveredLine === i ? 4 : 0,
                                        fill:'#58a6ff', style:{ transition:'r .1s ease', cursor:'pointer' },
                                        onMouseEnter: () => setHoveredLine(i), onMouseLeave: () => setHoveredLine(null) });
                                }),
                                // Línea de hoy
                                e('line', { x1:lx(29), y1:padT, x2:lx(29), y2:lineH, stroke:'#58a6ff', strokeWidth:'1', strokeDasharray:'3 3', opacity:'0.5' })
                            ),
                            // Tooltip
                            hoveredLine !== null && last30[hoveredLine] && e('div', { style:{ position:'absolute', top:0, left: Math.min(lx(hoveredLine) + 8, lineW - 130) + 'px', background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:'8px', padding:'8px 12px', fontSize:'12px', pointerEvents:'none', zIndex:10, whiteSpace:'nowrap' } },
                                e('div', { style:{ fontWeight:'700', marginBottom:'4px', color:'var(--text-secondary)' } }, last30[hoveredLine].label),
                                e('div', { style:{ color:'#58a6ff' } }, '📊 Total: ' + last30[hoveredLine].total),
                                e('div', { style:{ color:'#3fb950' } }, '↑ Entradas: ' + last30[hoveredLine].entradas),
                                e('div', { style:{ color:'#ef4444' } }, '↓ Salidas: ' + last30[hoveredLine].salidas)
                            )
                        ),
                        e('div', { style:{ display:'flex', gap:'16px', marginTop:'12px', paddingTop:'12px', borderTop:'1px solid var(--border)' } },
                            [['#58a6ff','Total'], ['#3fb950','Entradas'], ['#ef4444','Salidas']].map(function(item, i) {
                                return e('div', { key:i, style:{ display:'flex', alignItems:'center', gap:'6px' } },
                                    e('div', { style:{ width:'16px', height:'2px', background:item[0], borderRadius:'1px' } }),
                                    e('span', { style:{ fontSize:'11px', color:'var(--text-secondary)', fontWeight:'600' } }, item[1])
                                );
                            })
                        )
                    )),

                    // Donut equipos
                    card(e('div', null,
                        cardTitle('💻 Equipos por Estado'),
                        eq.total > 0 ? e('div', { style:{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px' } },
                            e('div', { style:{ position:'relative' } },
                                e('svg', { width:'160', height:'160', viewBox:'0 0 160 160' },
                                    e('circle', { cx:CX, cy:CY, r, fill:'none', stroke:'var(--bg-primary)', strokeWidth:'16' }),
                                    donutPaths.map(function(seg, i) {
                                        return e('circle', { key:i, cx:CX, cy:CY, r, fill:'none', stroke:seg.color,
                                            strokeWidth: hoveredSeg === i ? 22 : 16,
                                            strokeDasharray: seg.dashArray, strokeDashoffset: seg.dashOffset,
                                            style:{ transition:'stroke-width .2s ease', cursor:'pointer' },
                                            onMouseEnter: () => setHoveredSeg(i), onMouseLeave: () => setHoveredSeg(null)
                                        });
                                    })
                                ),
                                e('div', { style:{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' } },
                                    hoveredSeg !== null && donutPaths[hoveredSeg] ?
                                        e('div', null,
                                            e('div', { style:{ fontSize:'22px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color:donutPaths[hoveredSeg].color, lineHeight:1 } }, donutPaths[hoveredSeg].value),
                                            e('div', { style:{ fontSize:'9px', color:'var(--text-secondary)', fontWeight:'700', marginTop:'2px' } }, donutPaths[hoveredSeg].label.toUpperCase())
                                        ) :
                                        e('div', null,
                                            e('div', { style:{ fontSize:'26px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color:'var(--text-primary)', lineHeight:1 } }, eq.total),
                                            e('div', { style:{ fontSize:'9px', color:'var(--text-secondary)', fontWeight:'700', marginTop:'2px' } }, 'TOTAL')
                                        )
                                )
                            ),
                            e('div', { style:{ display:'flex', flexDirection:'column', gap:'5px', width:'100%' } },
                                donutPaths.map(function(seg, i) {
                                    return e('div', { key:i, style:{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', padding:'3px 6px', borderRadius:'6px', background: hoveredSeg===i ? seg.color+'18' : 'transparent', transition:'background .15s' },
                                        onMouseEnter: () => setHoveredSeg(i), onMouseLeave: () => setHoveredSeg(null) },
                                        e('div', { style:{ width:'8px', height:'8px', borderRadius:'50%', background:seg.color, flexShrink:0 } }),
                                        e('div', { style:{ fontSize:'12px', color:'var(--text-secondary)', flex:1 } }, seg.label),
                                        e('div', { style:{ fontSize:'13px', fontWeight:'700', fontFamily:'IBM Plex Mono,monospace', color:seg.color } }, seg.value)
                                    );
                                })
                            )
                        ) : e('div', { style:{ textAlign:'center', padding:'40px', color:'var(--text-secondary)' } }, 'Sin equipos registrados')
                    ))
                ),

                // ── Heatmap + Alertas + Garantías ─────────────────────────────
                e('div', { style:{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap:'18px' } },

                    // Heatmap actividad
                    card(e('div', null,
                        cardTitle('🔥 Mapa de Actividad — Últimas 12 Semanas'),
                        e('div', { style:{ overflowX:'auto' } },
                            e('div', { style:{ display:'flex', gap:'4px', marginBottom:'6px', paddingLeft:'24px' } },
                                heatDays.map(function(d, i) {
                                    return e('div', { key:i, style:{ width:'18px', fontSize:'10px', color:'var(--text-secondary)', fontWeight:'700', textAlign:'center' } }, d);
                                })
                            ),
                            e('div', { style:{ display:'flex', flexDirection:'column', gap:'3px' } },
                                heatData.map(function(week, wi) {
                                    return e('div', { key:wi, style:{ display:'flex', alignItems:'center', gap:'4px' } },
                                        e('div', { style:{ width:'20px', fontSize:'9px', color:'var(--text-secondary)', textAlign:'right', flexShrink:0 } },
                                            wi === 0 ? week[0].date.getDate()+'/'+(week[0].date.getMonth()+1) : wi % 3 === 0 ? week[0].date.getDate()+'/'+(week[0].date.getMonth()+1) : ''
                                        ),
                                        week.map(function(day, di) {
                                            var isHovered = hoveredDay && hoveredDay.wi === wi && hoveredDay.di === di;
                                            return e('div', { key:di,
                                                style:{ width:'18px', height:'18px', borderRadius:'3px', background:heatColor(day.cnt, day.isFuture), cursor: day.cnt > 0 ? 'pointer' : 'default', transition:'transform .1s ease, box-shadow .1s ease', transform: isHovered ? 'scale(1.3)' : 'scale(1)', boxShadow: isHovered ? '0 0 0 2px #3fb950' : 'none', position:'relative', zIndex: isHovered ? 10 : 1 },
                                                onMouseEnter: () => setHoveredDay({ wi, di, day }),
                                                onMouseLeave: () => setHoveredDay(null),
                                                title: day.cnt + ' movimientos el ' + day.label
                                            });
                                        })
                                    );
                                })
                            ),
                            // Leyenda
                            e('div', { style:{ display:'flex', alignItems:'center', gap:'6px', marginTop:'10px', justifyContent:'flex-end' } },
                                e('span', { style:{ fontSize:'10px', color:'var(--text-secondary)' } }, 'Menos'),
                                ['#1a2130','#0d4429','#1a6b3c','#26a047','#3fb950'].map(function(c, i) {
                                    return e('div', { key:i, style:{ width:'14px', height:'14px', borderRadius:'2px', background:c } });
                                }),
                                e('span', { style:{ fontSize:'10px', color:'var(--text-secondary)' } }, 'Más')
                            )
                        )
                    )),

                    // Alertas
                    card(e('div', null,
                        cardTitle('🚨 Alertas Activas'),
                        alertas.length === 0 ?
                            e('div', { style:{ textAlign:'center', padding:'28px 0' } },
                                e('div', { style:{ fontSize:'44px', marginBottom:'10px' } }, '✅'),
                                e('div', { style:{ color:'#3fb950', fontWeight:'700', fontSize:'15px' } }, 'Todo en orden'),
                                e('div', { style:{ color:'var(--text-secondary)', fontSize:'12px', marginTop:'4px' } }, 'No hay alertas activas')
                            ) :
                            e('div', { style:{ display:'flex', flexDirection:'column', gap:'8px' } },
                                alertas.map(function(a, i) {
                                    var col = a.tipo === 'error' ? '#ef4444' : '#f97316';
                                    return e('div', { key:i, onClick:a.nav, style:{ display:'flex', alignItems:'center', gap:'10px', padding:'11px 13px', background:col+'0d', border:'1px solid '+col+'33', borderRadius:'10px', cursor:'pointer', transition:'all .15s' },
                                        onMouseEnter: ev => { ev.currentTarget.style.transform='translateX(4px)'; ev.currentTarget.style.borderColor=col+'66'; },
                                        onMouseLeave: ev => { ev.currentTarget.style.transform=''; ev.currentTarget.style.borderColor=col+'33'; }
                                    },
                                        e('span', { style:{ fontSize:'18px' } }, a.icon),
                                        e('span', { style:{ fontSize:'13px', fontWeight:'600', color:col, flex:1 } }, a.msg),
                                        e('span', { style:{ color:'var(--text-secondary)', fontSize:'14px', fontWeight:'700' } }, '→')
                                    );
                                })
                            )
                    ), { border: '1px solid ' + (alertas.length > 0 ? '#ef444433' : '#3fb95033') }),

                    // Garantías próximas
                    card(e('div', null,
                        cardTitle('🛡️ Garantías Próximas', { fn: () => onNavigate('equipos', {}), label: 'Ver equipos →' }),
                        garantiasProximas.length === 0 ?
                            e('div', { style:{ textAlign:'center', padding:'28px 0' } },
                                e('div', { style:{ fontSize:'44px', marginBottom:'10px' } }, '✅'),
                                e('div', { style:{ color:'#3fb950', fontWeight:'700', fontSize:'14px' } }, 'Sin vencimientos próximos'),
                                e('div', { style:{ color:'var(--text-secondary)', fontSize:'12px', marginTop:'4px' } }, 'Próximos 90 días OK')
                            ) :
                            e('div', { style:{ display:'flex', flexDirection:'column', gap:'8px' } },
                                garantiasProximas.map(function(a, i) {
                                    var fg = new Date(a.fechaGarantia);
                                    var dias = Math.round((fg - hoy) / (1000*60*60*24));
                                    var col = dias <= 15 ? '#ef4444' : dias <= 30 ? '#f97316' : '#fbbf24';
                                    return e('div', { key:i, onClick: () => onNavigate('equipos', {}), style:{ padding:'10px 12px', background:col+'0d', border:'1px solid '+col+'33', borderRadius:'8px', cursor:'pointer', transition:'all .15s' },
                                        onMouseEnter: ev => { ev.currentTarget.style.borderColor=col+'66'; },
                                        onMouseLeave: ev => { ev.currentTarget.style.borderColor=col+'33'; }
                                    },
                                        e('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'3px' } },
                                            e('span', { style:{ fontSize:'12px', fontWeight:'700', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'65%' } }, a.tipo + (a.modelo ? ' · ' + a.modelo : '')),
                                            e('span', { style:{ fontSize:'12px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color:col, flexShrink:0 } }, dias === 0 ? '¡HOY!' : dias + 'd')
                                        ),
                                        e('div', { style:{ fontSize:'10px', color:'var(--text-secondary)', fontFamily:'IBM Plex Mono,monospace' } }, a.idEtiqueta)
                                    );
                                })
                            )
                    ))
                ),

                // ── Fila inferior ─────────────────────────────────────────────
                e('div', { style:{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'18px' } },

                    // Top técnicos
                    card(e('div', null,
                        cardTitle(T().topTechnicians),
                        techAct.length === 0 ?
                            e('div', { style:{ textAlign:'center', padding:'20px', color:'var(--text-secondary)', fontSize:'13px' } }, T().noActivityMonth) :
                            e('div', { style:{ display:'flex', flexDirection:'column', gap:'12px' } },
                                techAct.map(function(t, i) {
                                    var medals = ['🥇','🥈','🥉'];
                                    var barColors = ['linear-gradient(90deg,#fbbf24,#f97316)','linear-gradient(90deg,#9ca3af,#6b7280)','linear-gradient(90deg,#cd7c2f,#92400e)','linear-gradient(90deg,#58a6ff,#3b82f6)','linear-gradient(90deg,#3fb950,#16a34a)'];
                                    var labelColor = ['#fbbf24','#9ca3af','#cd7c2f','#58a6ff','#3fb950'];
                                    return e('div', { key:i, style:{ display:'flex', alignItems:'center', gap:'10px' } },
                                        e('div', { style:{ width:'26px', height:'26px', borderRadius:'50%', background:'var(--bg-primary)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', flexShrink:0 } }, i < 3 ? medals[i] : i+1),
                                        e('div', { style:{ flex:1 } },
                                            e('div', { style:{ fontSize:'13px', fontWeight:'600', marginBottom:'5px' } }, t.nombre),
                                            e('div', { style:{ height:'5px', background:'var(--bg-primary)', borderRadius:'3px', overflow:'hidden' } },
                                                e('div', { style:{ height:'100%', width:(t.count/maxTech*100)+'%', background:barColors[i], borderRadius:'3px', transition:'width 1s ease' } })
                                            )
                                        ),
                                        e('div', { style:{ fontSize:'14px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color:labelColor[i], minWidth:'28px', textAlign:'right' } }, t.count)
                                    );
                                })
                            )
                    )),

                    // Actividad reciente
                    card(e('div', null,
                        e('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' } },
                            e('div', { style:{ fontSize:'12px', fontWeight:'700', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'1px' } }, T().recentActivity),
                            e('button', { onClick: () => onNavigate('historial', {}), style:{ background:'none', border:'none', color:'#58a6ff', fontSize:'12px', fontWeight:'700', cursor:'pointer' } }, 'Ver todo →')
                        ),
                        recentH.length === 0 ?
                            e('div', { style:{ textAlign:'center', padding:'20px', color:'var(--text-secondary)', fontSize:'13px' } }, 'Sin movimientos') :
                            e('div', { style:{ display:'flex', flexDirection:'column' } },
                                recentH.map(function(mov, i) {
                                    var tCol = { 'Entrada':'#3fb950', 'Salida':'#ef4444', 'Asignacion':'#58a6ff', 'Devolucion':'#a855f7', 'Prestamo':'#fbbf24' }[mov.tipo] || 'var(--text-secondary)';
                                    var tIcon = { 'Entrada':'↑', 'Salida':'↓', 'Asignacion':'→', 'Devolucion':'←', 'Prestamo':'⏱' }[mov.tipo] || '•';
                                    return e('div', { key:i, style:{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom: i<recentH.length-1 ? '1px solid var(--border)' : 'none' } },
                                        e('div', { style:{ width:'26px', height:'26px', borderRadius:'7px', background:tCol+'1a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', color:tCol, fontWeight:'700', flexShrink:0 } }, tIcon),
                                        e('div', { style:{ flex:1, minWidth:0 } },
                                            e('div', { style:{ fontSize:'12px', fontWeight:'600', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' } }, mov.producto),
                                            e('div', { style:{ fontSize:'10px', color:'var(--text-secondary)', marginTop:'1px' } }, mov.tecnico || '—')
                                        ),
                                        e('div', { style:{ textAlign:'right', flexShrink:0 } },
                                            e('div', { style:{ fontSize:'10px', fontWeight:'700', color:tCol } }, mov.tipo),
                                            e('div', { style:{ fontSize:'10px', color:'var(--text-secondary)', marginTop:'1px' } }, new Date(mov.fecha).toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit' }))
                                        )
                                    );
                                })
                            )
                    )),

                    // Stock crítico
                    card(e('div', null,
                        e('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' } },
                            e('div', { style:{ fontSize:'12px', fontWeight:'700', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'1px' } }, T().criticalStockTitle),
                            e('button', { onClick: () => onNavigate('inventario', { tipo:'stockBajo' }), style:{ background:'none', border:'none', color:'#58a6ff', fontSize:'12px', fontWeight:'700', cursor:'pointer' } }, 'Ver todo →')
                        ),
                        inv.stockBajo === 0 && inv.sinStock === 0 ?
                            e('div', { style:{ textAlign:'center', padding:'28px 0' } },
                                e('div', { style:{ fontSize:'40px', marginBottom:'8px' } }, '✅'),
                                e('div', { style:{ color:'#3fb950', fontWeight:'700', fontSize:'14px' } }, T().stockOptimal)
                            ) :
                            e('div', { style:{ display:'flex', flexDirection:'column', gap:'9px' } },
                                state.inventory
                                    .filter(i => i.stock === 0 || i.stock <= i.stockMinimo)
                                    .sort((a,b) => (a.stock/(a.stockMinimo||1)) - (b.stock/(b.stockMinimo||1)))
                                    .slice(0,5)
                                    .map(function(item, i) {
                                        var sinStock = item.stock === 0;
                                        var pct = Math.min(100, Math.round(item.stock / (item.stockMinimo||1) * 100));
                                        var col = sinStock ? '#ef4444' : '#f97316';
                                        return e('div', { key:i, style:{ padding:'10px 12px', background:col+'0d', border:'1px solid '+col+'33', borderRadius:'8px' } },
                                            e('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' } },
                                                e('span', { style:{ fontSize:'12px', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'68%' } }, item.nombre),
                                                e('span', { style:{ fontSize:'12px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color:col, flexShrink:0 } }, sinStock ? '🔴 AGOTADO' : item.stock+'/'+item.stockMinimo)
                                            ),
                                            e('div', { style:{ height:'4px', background:'var(--bg-primary)', borderRadius:'2px', overflow:'hidden' } },
                                                e('div', { style:{ height:'100%', width:pct+'%', background:col, borderRadius:'2px', transition:'width 1s ease' } })
                                            )
                                        );
                                    })
                            )
                    )),

                    // Equipos con incidencia
                    card(e('div', null,
                        cardTitle(T().incidents, { fn: () => onNavigate('equipos', {}), label: T().viewAll }),
                        (function() {
                            var incidencias = [
                                { estado: 'Reparacion', label: 'En Reparación', color: '#a855f7', icon: '🔧' },
                                { estado: 'Extraviado', label: 'Extraviados',   color: '#f97316', icon: '🔍' },
                                { estado: 'Robado',     label: 'Robados',       color: '#ef4444', icon: '🚨' },
                            ];
                            var equiposInc = incidencias.map(function(inc) {
                                return Object.assign({}, inc, { items: equiposAll.filter(function(a) { return a.estado === inc.estado; }) });
                            }).filter(function(inc) { return inc.items.length > 0; });

                            if (equiposInc.length === 0) return e('div', { style:{ textAlign:'center', padding:'28px 0' } },
                                e('div', { style:{ fontSize:'40px', marginBottom:'8px' } }, '✅'),
                                e('div', { style:{ color:'#3fb950', fontWeight:'700', fontSize:'14px' } }, T().allOk),
                                e('div', { style:{ color:'var(--text-secondary)', fontSize:'12px', marginTop:'4px' } }, 'Sin equipos con incidencia')
                            );

                            return e('div', { style:{ display:'flex', flexDirection:'column', gap:'10px' } },
                                // Contadores por tipo
                                e('div', { style:{ display:'flex', gap:'8px', marginBottom:'4px' } },
                                    incidencias.map(function(inc) {
                                        var cnt = equiposAll.filter(function(a) { return a.estado === inc.estado; }).length;
                                        return e('div', { key: inc.estado, style:{ flex:1, textAlign:'center', background: cnt > 0 ? inc.color+'15' : 'var(--bg-tertiary)', border:'1px solid '+(cnt > 0 ? inc.color+'44' : 'var(--border)'), borderRadius:'8px', padding:'8px 4px' } },
                                            e('div', { style:{ fontSize:'18px' } }, inc.icon),
                                            e('div', { style:{ fontSize:'20px', fontWeight:'800', fontFamily:'IBM Plex Mono,monospace', color: cnt > 0 ? inc.color : 'var(--text-secondary)', lineHeight:1 } }, cnt),
                                            e('div', { style:{ fontSize:'9px', color:'var(--text-secondary)', fontWeight:'700', textTransform:'uppercase', marginTop:'2px' } }, inc.label)
                                        );
                                    })
                                ),
                                // Lista de equipos afectados
                                equiposInc.flatMap(function(inc) {
                                    return inc.items.slice(0, 3).map(function(a, i) {
                                        return e('div', { key: inc.estado + i, onClick: () => onNavigate('equipos', { estado: inc.estado }), style:{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', background:inc.color+'0d', border:'1px solid '+inc.color+'22', borderRadius:'8px', cursor:'pointer', transition:'all .15s' },
                                            onMouseEnter: ev => { ev.currentTarget.style.borderColor = inc.color + '66'; },
                                            onMouseLeave: ev => { ev.currentTarget.style.borderColor = inc.color + '22'; }
                                        },
                                            e('span', { style:{ fontSize:'16px', flexShrink:0 } }, inc.icon),
                                            e('div', { style:{ flex:1, minWidth:0 } },
                                                e('div', { style:{ fontSize:'12px', fontWeight:'700', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' } }, a.tipo + (a.modelo ? ' · ' + a.modelo : '')),
                                                e('div', { style:{ fontSize:'10px', fontFamily:'IBM Plex Mono,monospace', color:'var(--text-secondary)' } }, a.idEtiqueta)
                                            ),
                                            a.motivoIncidencia && e('div', { style:{ fontSize:'10px', color:inc.color, maxWidth:'80px', textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, a.motivoIncidencia)
                                        );
                                    });
                                })
                            );
                        })()
                    ))
                )
            );
        }




export default Dashboard;