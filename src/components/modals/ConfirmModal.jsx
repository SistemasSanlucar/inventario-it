import React, { useEffect, useRef, useState } from 'react';

const e = React.createElement;

        function ConfirmModal({ message, onConfirm, onCancel, loading }) {
            return e('div', { className: 'modal-overlay', onClick: ev => { if (ev.target === ev.currentTarget) onCancel(); } },
                e('div', { className: 'modal', style: { maxWidth: '500px' }, onClick: ev => ev.stopPropagation() },
                    e('div', { className: 'modal-header' }, e('h2', { className: 'modal-title' }, 'Confirmar Accion'), e('button', { className: 'modal-close', onClick: onCancel }, '×')),
                    e('div', { className: 'modal-body' },
                        e('div', { className: 'confirm-modal-icon' }, '⚠️'),
                        e('p', { style: { fontSize: '16px', color: 'var(--text-primary)', marginBottom: '24px', textAlign: 'center' } }, message),
                        e('div', { style: { background: 'rgba(239,68,68,.1)', padding: '12px', borderRadius: '8px', fontSize: '14px', color: 'var(--accent-red)', textAlign: 'center' } }, 'Esta accion es permanente y no se puede deshacer')
                    ),
                    e('div', { className: 'modal-footer' },
                        e('button', { type: 'button', className: 'button button-secondary', onClick: onCancel }, 'Cancelar'),
                        e('button', { className: 'button button-danger', onClick: onConfirm, disabled: loading }, loading ? e('span', { className: 'loading-spinner' }) : null, loading ? ' Eliminando...' : '🗑️ Si, Eliminar')
                    )
                )
            );
        }

        // ============================================================
        // MOBILE VIEW — Interfaz simplificada para técnicos en móvil

export default ConfirmModal;