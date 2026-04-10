import { useState } from 'react'
import { CONFIG } from '../../config'
import { CHANGELOG, entryIcon } from '../../config/changelog'
import type { ChangelogVersion } from '../../config/changelog'

export default function AboutView() {
  const currentVersion = CHANGELOG[0]
  const historyVersions = CHANGELOG.slice(1)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (v: string) => setExpanded((prev) => {
    const next = new Set(prev)
    next.has(v) ? next.delete(v) : next.add(v)
    return next
  })

  const typeLabel: Record<string, string> = { feature: 'Nueva funcionalidad', improvement: 'Mejora', bug: 'Bug corregido' }
  const typeColor: Record<string, string> = { feature: '#a855f7', improvement: '#58a6ff', bug: '#3fb950' }

  const changeList = (ver: ChangelogVersion) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {ver.changes.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '15px', flexShrink: 0, lineHeight: 1.4 }}>{entryIcon(c.type)}</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{c.text}</span>
            <span style={{ fontSize: '10px', color: typeColor[c.type] || '#8b949e', marginLeft: '8px', fontWeight: 700, textTransform: 'uppercase' }}>{typeLabel[c.type]}</span>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px' }}>

      {/* ── Section 1: Manual ── */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
        <a
          href="./manual_tecnico_stockcontrol.html"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', padding: '16px 32px', background: 'var(--accent-blue)', color: 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 700, textDecoration: 'none', transition: 'all .2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(88,166,255,.3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
        >
          Abrir Manual de Usuario
        </a>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.5 }}>
          Guia completa de uso para tecnicos IT — casos de uso, modulos y herramientas
        </div>
      </div>

      {/* ── Section 2: Current version ── */}
      {currentVersion && (
        <div style={{ background: 'var(--bg-secondary)', border: '2px solid var(--accent-purple)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '24px 32px', background: 'rgba(168,85,247,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span style={{ padding: '8px 20px', background: 'var(--accent-purple)', color: 'white', borderRadius: '10px', fontSize: '20px', fontWeight: 800, fontFamily: 'IBM Plex Mono,monospace', letterSpacing: '0.5px' }}>
                v{currentVersion.version}
              </span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>Version actual</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{currentVersion.date}</div>
              </div>
            </div>
            {changeList(currentVersion)}
          </div>
        </div>
      )}

      {/* ── Section 3: History ── */}
      {historyVersions.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '15px', color: 'var(--text-secondary)' }}>
            Historial de versiones
          </div>
          {historyVersions.map((ver) => {
            const isOpen = expanded.has(ver.version)
            return (
              <div key={ver.version} style={{ borderBottom: '1px solid var(--border)' }}>
                <button
                  onClick={() => toggle(ver.version)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-primary)', transition: 'background .15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ padding: '3px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', fontWeight: 700, fontFamily: 'IBM Plex Mono,monospace' }}>v{ver.version}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ver.date}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{ver.changes.length} cambio(s)</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 24px 16px' }}>
                    {changeList(ver)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        StockControl IT v{CONFIG.version} — Departamento IT, Sanlucar Fruit S.L.U.
      </div>
    </div>
  )
}
