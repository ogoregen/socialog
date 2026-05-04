function ProfilePanel({ onClose }) {
  const panelRef   = React.useRef(null);
  const backdropRef = React.useRef(null);

  React.useLayoutEffect(() => {
    const bd = backdropRef.current;
    const p  = panelRef.current;
    if (!bd || !p) return;
    bd.style.opacity   = '0';
    p.style.transform  = 'translateX(100%)';
    const id = requestAnimationFrame(() => {
      bd.style.transition = 'opacity 0.25s ease';
      bd.style.opacity    = '1';
      p.style.transition  = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)';
      p.style.transform   = 'translateX(0)';
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function dismiss() {
    const bd = backdropRef.current;
    const p  = panelRef.current;
    if (bd) { bd.style.transition = 'opacity 0.25s ease'; bd.style.opacity = '0'; }
    if (!p) { onClose(); return; }
    p.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)';
    requestAnimationFrame(() => {
      p.style.transform = 'translateX(100%)';
      function onEnd(e) {
        if (e.propertyName === 'transform') { p.removeEventListener('transitionend', onEnd); onClose(); }
      }
      p.addEventListener('transitionend', onEnd);
    });
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const bookmarks = load('bookmarks') || [];
  const todos     = load('todos')     || [];
  const routines  = load('routines')  || [];

  const totalSaved     = bookmarks.length;
  const totalDone      = todos.filter(t => t.done).length;
  const activeRoutines = routines.length;

  // Current + best streak (same logic as StreakGrid but also tracks best)
  const now = new Date();
  let streak = 0, best = 0, cur = 0;
  for (let offset = 0; offset <= 365; offset++) {
    const d   = new Date(now); d.setDate(now.getDate() - offset);
    const ds  = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    const scheduled = routines.filter(r => r.days.includes(dow));
    if (!scheduled.length) continue;
    const done = scheduled.filter(r => r.completions && r.completions[ds]).length;
    if (done > 0) {
      cur++;
      if (cur > best) best = cur;
      if (offset === 0 || streak === cur - 1) streak = cur;
    } else {
      if (offset > 0) cur = 0;
    }
  }

  const statRowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '13px 0', borderBottom: '1px solid var(--border)',
  };
  const labelStyle  = { fontSize: 14, color: 'var(--fg-muted)' };
  const valueStyle  = { fontSize: 16, fontWeight: 600 };

  return ReactDOM.createPortal(
    <div
      ref={backdropRef}
      onClick={e => e.target === e.currentTarget && dismiss()}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.35)', display: 'flex', justifyContent: 'flex-end' }}>
      <div
        ref={panelRef}
        style={{
          width: '82%', maxWidth: 360, height: '100%',
          background: 'var(--bg)', overflowY: 'auto', overscrollBehavior: 'none',
          display: 'flex', flexDirection: 'column',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 4px' }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>Profile</span>
          <button onClick={dismiss} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
            color: 'var(--fg-muted)', lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        {/* Stats */}
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 4 }}>Stats</div>
          <div style={statRowStyle}>
            <span style={labelStyle}>Archive saved</span>
            <span style={valueStyle}>{totalSaved}</span>
          </div>
          <div style={statRowStyle}>
            <span style={labelStyle}>Tasks completed</span>
            <span style={valueStyle}>{totalDone}</span>
          </div>
          {activeRoutines > 0 && <>
            <div style={statRowStyle}>
              <span style={labelStyle}>Active routines</span>
              <span style={valueStyle}>{activeRoutines}</span>
            </div>
            <div style={statRowStyle}>
              <span style={labelStyle}>Current streak</span>
              <span style={{ ...valueStyle, color: streak > 0 ? '#22c55e' : 'var(--fg)' }}>{streak} {streak === 1 ? 'day' : 'days'}</span>
            </div>
            <div style={{ ...statRowStyle, borderBottom: 'none' }}>
              <span style={labelStyle}>Best streak</span>
              <span style={valueStyle}>{best} {best === 1 ? 'day' : 'days'}</span>
            </div>
          </>}
        </div>

      </div>
    </div>,
    document.body
  );
}

Object.assign(window, { ProfilePanel });
