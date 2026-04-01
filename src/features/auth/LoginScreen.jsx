import React, { useEffect, useRef, useState } from 'react';
import { IS_FILE_PROTOCOL } from '../../lib/config';
import { T } from '../../lib/i18n';
import { showToast } from '../../components/feedback/toast';

const e = React.createElement;

        function LoginScreen({ onLogin }) {
            const [loading, setLoading] = useState(false);
            const handleLogin = async () => {
                if (IS_FILE_PROTOCOL) {
                    showToast(T().loginLocalFileDesc, 'warning');
                    return;
                }
                setLoading(true);
                try { await onLogin(); } catch(err) { showToast('Error al iniciar sesion', 'error'); } finally { setLoading(false); }
            };
            return e('div', { className: 'login-screen' },
                e('div', { className: 'login-box' },
                    e('div', { style: { marginBottom: '24px', display: 'flex', justifyContent: 'center' } },
                        e('img', { src: 'https://sanlucar.com/wp-content/uploads/2023/03/SanLucar_LOGO_final.svg', alt: 'Sanlúcar Fruit', style: { height: '64px', width: 'auto', objectFit: 'contain' },
                            onError: function(ev) { ev.target.style.display = 'none'; }
                        })
                    ),
                    e('h1', null, T().appTitle),
                    e('p', { style: { fontSize: '14px', color: 'var(--accent-purple)', fontWeight: '600', marginBottom: '12px' } }, 'Sanlucar Fruit · IT'),
                    e('p', null, T().loginDesc),
                    IS_FILE_PROTOCOL ? e('div', { className: 'info-banner orange', style: { textAlign: 'left', marginTop: '16px', marginBottom: '8px' } },
                        e('div', { style: { fontWeight: '700', marginBottom: '6px' } }, T().loginLocalFileTitle),
                        e('div', null, T().loginLocalFileDesc),
                        e('div', { style: { marginTop: '8px' } }, T().loginLocalFileHint)
                    ) : null,
                    e('button', { className: 'button button-primary', onClick: handleLogin, disabled: loading, style: { width: '100%', marginTop: '16px' } },
                        loading ? e('span', { className: 'loading-spinner' }) : null, loading ? ' ' + T().loginIng : ' ' + T().login),
                    e('p', { style: { fontSize: '12px', marginTop: '24px' } }, T().loginNote)
                )
            );
        }


export default LoginScreen;