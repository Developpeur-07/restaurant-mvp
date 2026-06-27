import { useState } from 'react'

export default function HeaderActions({ actions, theme }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>

      {/* Bouton burger — visible seulement sous 700px */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="header-burger"
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 12px',
          cursor: 'pointer',
          fontSize: '1.1rem',
          color: '#fff',
          display: 'none',
        }}
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Actions en ligne — visibles seulement au-dessus de 1098px */}
      <div className="header-actions-row" style={{ display: 'flex', gap: '8px' }}>
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            style={{
              background: action.bg || 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: '600',
              whiteSpace: 'nowrap',
            }}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Menu déroulant mobile/tablette */}
      {open && (
        <div
          className="header-burger-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            background: theme?.cardBackground || '#fff',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '180px',
            zIndex: 100,
          }}
        >
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); setOpen(false) }}
              style={{
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 12px',
                color: theme?.textPrimary || '#1a1a1a',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600',
                textAlign: 'left',
                width: '100%',
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme?.pageBackground || '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 700px) {
          .header-burger { display: flex !important; }
          .header-actions-row { display: none !important; }
        }
        @media (min-width: 1099px) {
          .header-burger { display: none !important; }
          .header-burger-menu { display: none !important; }
        }
      `}</style>
    </div>
  )
}