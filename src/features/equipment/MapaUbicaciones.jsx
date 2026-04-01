import React, { useEffect, useRef, useState } from 'react';

const e = React.createElement;

        function MapaUbicaciones({ state, setSearch, setView }) {
            const sedes = {};
            (state.activos || []).forEach(function(a) {
                const ub = a.ubicacion || 'Sin ubicación';
                const sede = ub.includes(' - ') ? ub.split(' - ')[0] : ub;
                const zona = ub.includes(' - ') ? ub.split(' - ').slice(1).join(' - ') : 'General';
                if (!sedes[sede]) sedes[sede] = {};
                if (!sedes[sede][zona]) sedes[sede][zona] = [];
                sedes[sede][zona].push(a);
            });
            const sedeKeys = Object.keys(sedes).sort();
            const [activeSede, setActiveSede] = useState(sedeKeys[0] || '');
            const [mapaHover, setMapaHover] = useState(null);

            const estadoColor = { 'Almacen':'#3fb950','Asignado':'#58a6ff','Pendiente':'#f97316','Transito':'#fbbf24','Reparacion':'#a855f7','Extraviado':'#ef4444','Robado':'#dc2626','Baja':'#6b7280' };
            const zonaStatus = function(items) {
                if (items.some(a => a.estado === 'Extraviado' || a.estado === 'Robado')) return '#ef4444';
                if (items.some(a => a.estado === 'Pendiente')) return '#f97316';
                if (items.some(a => a.estado === 'Reparacion')) return '#a855f7';
                return '#3fb950';
            };

            if (sedeKeys.length === 0) return e('div', { style: { textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' } },
                e('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '🗺️'),
                e('div', { style: { fontWeight: '700', fontSize: '16px' } }, 'Sin equipos con ubicación asignada'),
                e('div', { style: { fontSize: '13px', marginTop: '8px' } }, 'Asigna ubicaciones a los equipos para verlos en el mapa')
            );

            const zonas = sedes[activeSede] || {};
            const zonaKeys = Object.keys(zonas).sort();

            return e('div', { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
                sedeKeys.length > 1 && e('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                    sedeKeys.map(function(sede) {
                        const total = Object.values(sedes[sede]).flat().length;
                        const isActive = activeSede === sede;
                        return e('button', { key: sede, onClick: function() { setActiveSede(sede); },
                            style: { padding: '10px 18px', borderRadius: '12px', border: '2px solid ' + (isActive ? '#58a6ff' : 'var(--border)'), background: isActive ? 'rgba(88,166,255,.12)' : 'var(--bg-secondary)', color: isActive ? '#58a6ff' : 'var(--text-primary)', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'all .15s' } },
                            '🏢 ', sede, e('span', { style: { marginLeft: '6px', fontSize: '11px', opacity: 0.7 } }, total + ' eq.')
                        );
                    })
                ),
                zonaKeys.length === 0 ? e('div', { style: { textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' } }, 'No hay zonas para esta sede') :
                e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' } },
                    zonaKeys.map(function(zona) {
                        const items = zonas[zona];
                        const color = zonaStatus(items);
                        const byEstado = {};
                        items.forEach(function(a) { byEstado[a.estado] = (byEstado[a.estado]||0) + 1; });
                        const isHovered = mapaHover === zona;
                        return e('div', { key: zona,
                            onMouseEnter: function() { setMapaHover(zona); },
                            onMouseLeave: function() { setMapaHover(null); },
                            onClick: function() { setSearch(activeSede + ' - ' + zona); setView('lista'); },
                            style: { background: 'var(--bg-secondary)', border: '2px solid ' + color + (isHovered ? '99' : '33'), borderRadius: '16px', padding: '18px', cursor: 'pointer', transition: 'all .2s ease', transform: isHovered ? 'translateY(-4px)' : '', boxShadow: isHovered ? '0 12px 32px ' + color + '22' : 'none', position: 'relative', overflow: 'hidden' }
                        },
                            e('div', { style: { position: 'absolute', top: '-15px', right: '-15px', width: '60px', height: '60px', borderRadius: '50%', background: color + '15', filter: 'blur(15px)' } }),
                            e('div', { style: { fontSize: '32px', marginBottom: '8px' } }, '🗄️'),
                            e('div', { style: { fontWeight: '800', fontSize: '13px', marginBottom: '4px', lineHeight: '1.3' } }, zona),
                            e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' } }, items.length + ' equipo' + (items.length !== 1 ? 's' : '')),
                            e('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' } },
                                Object.entries(byEstado).map(function(entry) {
                                    var est = entry[0], cnt = entry[1];
                                    var col = estadoColor[est] || '#6b7280';
                                    var pct = Math.round(cnt / items.length * 100);
                                    return e('div', { key: est, style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                                        e('div', { style: { width: '6px', height: '6px', borderRadius: '50%', background: col, flexShrink: 0 } }),
                                        e('div', { style: { flex: 1, height: '4px', background: 'var(--bg-primary)', borderRadius: '2px', overflow: 'hidden' } },
                                            e('div', { style: { height: '100%', width: pct + '%', background: col, borderRadius: '2px' } })
                                        ),
                                        e('span', { style: { fontSize: '10px', color: 'var(--text-secondary)', minWidth: '16px', textAlign: 'right' } }, cnt)
                                    );
                                })
                            ),
                            e('div', { style: { fontSize: '10px', color: color, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' } },
                                e('div', { style: { width: '6px', height: '6px', borderRadius: '50%', background: color } }),
                                color === '#3fb950' ? 'Todo OK' : color === '#f97316' ? 'Pendientes' : color === '#ef4444' ? 'Incidencia' : 'Revisar'
                            )
                        );
                    })
                ),
                e('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid var(--border)' } },
                    Object.entries(estadoColor).map(function(entry) {
                        var est = entry[0], col = entry[1];
                        var cnt = (state.activos || []).filter(function(a) { return a.ubicacion && a.ubicacion.startsWith(activeSede) && a.estado === est; }).length;
                        if (cnt === 0) return null;
                        return e('div', { key: est, style: { display: 'flex', alignItems: 'center', gap: '5px' } },
                            e('div', { style: { width: '8px', height: '8px', borderRadius: '50%', background: col } }),
                            e('span', { style: { fontSize: '11px', color: 'var(--text-secondary)' } }, est + ' (' + cnt + ')')
                        );
                    }).filter(Boolean)
                )
            );
        }

export default MapaUbicaciones;