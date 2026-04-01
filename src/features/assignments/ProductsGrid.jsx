import React, { useEffect, useRef, useState } from 'react';

const e = React.createElement;

        function ProductsGrid({ inventory, selectedProducts, onAdd }) {
            const [prodSearch, setProdSearch] = useState('');
            const available = inventory.filter(function(item) {
                return item.stock > 0 && !selectedProducts.find(function(p) { return p.barcode === item.barcode; });
            });
            // Con búsqueda activa muestra todos los resultados; sin búsqueda limita a 60
            // para no saturar el DOM del iPad con listas muy largas
            const filtered = prodSearch.trim()
                ? available.filter(function(item) { return item.nombre.toLowerCase().includes(prodSearch.toLowerCase()) || item.categoria.toLowerCase().includes(prodSearch.toLowerCase()); })
                : available.slice(0, 60);
            const hiddenCount = !prodSearch.trim() && available.length > 60 ? available.length - 60 : 0;
            return e('div', { style: { marginBottom: '16px' } },
                e('input', { type: 'text', className: 'form-input', placeholder: '🔍 Buscar producto por nombre (cables, ratones, auriculares...)', value: prodSearch, onChange: function(ev) { setProdSearch(ev.target.value); }, style: { marginBottom: '8px', fontSize: '14px' } }),
                e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' } }, 'Stock disponible — toca para añadir'),
                e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', maxHeight: '220px', overflowY: 'auto', padding: '4px' } },
                    filtered.length === 0
                        ? e('div', { style: { color: 'var(--text-secondary)', fontSize: '13px', padding: '12px', gridColumn: '1/-1' } }, prodSearch ? 'No se encontró "' + prodSearch + '"' : 'No hay más productos con stock disponible')
                        : filtered.map(function(item) {
                            return e('div', {
                                key: item.barcode,
                                onClick: function() { onAdd(item.barcode); },
                                style: { background: 'var(--bg-primary)', border: '2px solid var(--border)', borderRadius: '8px', padding: '10px', cursor: 'pointer', transition: 'all .15s', userSelect: 'none' },
                                onMouseEnter: function(ev) { ev.currentTarget.style.borderColor = 'var(--accent-green)'; ev.currentTarget.style.transform = 'translateY(-2px)'; },
                                onMouseLeave: function(ev) { ev.currentTarget.style.borderColor = 'var(--border)'; ev.currentTarget.style.transform = ''; }
                            },
                                e('div', { style: { fontWeight: '600', fontSize: '13px', marginBottom: '4px', lineHeight: '1.3' } }, item.nombre),
                                e('div', { style: { fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' } }, item.categoria),
                                e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                                    e('span', { style: { fontSize: '11px', color: 'var(--accent-green)', fontWeight: '600' } }, '✓ ' + item.stock + ' uds'),
                                    e('span', { style: { fontSize: '18px', color: 'var(--accent-green)' } }, '+')
                                )
                            );
                        })
                ),
                hiddenCount > 0 ? e('div', { style: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', textAlign: 'center' } }, 'Busca para ver los ' + hiddenCount + ' productos restantes') : null
            );
        }


export default ProductsGrid;