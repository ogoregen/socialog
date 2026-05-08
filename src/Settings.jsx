function SettingsPage({ theme, onThemeChange, onBack }) {
  const panelRef = React.useRef(null);

  React.useLayoutEffect(() => {
    const p = panelRef.current;
    if (!p) return;
    p.style.transform = 'translateX(100%)';
    const id = requestAnimationFrame(() => {
      p.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)';
      p.style.transform  = 'translateX(0)';
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function dismiss() {
    const p = panelRef.current;
    if (!p) { onBack(); return; }
    p.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)';
    p.style.transform  = 'translateX(100%)';
    function onEnd(ev) {
      if (ev.propertyName === 'transform') { p.removeEventListener('transitionend', onEnd); onBack(); }
    }
    p.addEventListener('transitionend', onEnd);
  }

  const sectionLabel = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--fg-muted)',
    marginBottom: 12, marginTop: 28,
  };

  const optionBtn = (label, value, current) => (
    <button
      onClick={() => onThemeChange(value)}
      style={{
        flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 500,
        border: 'none', cursor: 'pointer', borderRadius: 8,
        background: current === value ? 'var(--fg)' : 'transparent',
        color: current === value ? 'var(--bg)' : 'var(--fg-muted)',
        transition: 'background 0.15s, color 0.15s',
      }}
    >{label}</button>
  );

  return ReactDOM.createPortal(
    <div ref={panelRef} style={{
      position: 'fixed', inset: 0, zIndex: 190,
      background: 'var(--bg)', overflowY: 'auto',
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 4px' }}>
        <button onClick={dismiss} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--fg-muted)', fontSize: 20, lineHeight: 1, padding: 4,
        }}>←</button>
        <span style={{ fontSize: 17, fontWeight: 700 }}>Settings</span>
      </div>

      <div style={{ padding: '0 20px 80px' }}>

        <div style={sectionLabel}>Appearance</div>
        <div style={{
          display: 'flex', gap: 4, padding: 4,
          background: 'var(--surface)', borderRadius: 10,
          border: '1px solid var(--border)',
        }}>
          {optionBtn('Light', 'light', theme)}
          {optionBtn('Dark',  'dark',  theme)}
        </div>

      </div>
    </div>,
    document.body
  );
}

Object.assign(window, { SettingsPage });
