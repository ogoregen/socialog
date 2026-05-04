// ── Profile page (stats) ─────────────────────────────────────────────────────
function ProfilePage({ onBack }) {
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

  const bookmarks = load('bookmarks') || [];
  const todos     = load('todos')     || [];
  const routines  = load('routines')  || [];

  const totalSaved = bookmarks.length;
  const totalDone  = todos.filter(t => t.done).length;
  const activeRoutines = routines.length;

  // Current streak + best streak
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
      if (streak === 0 || offset === 0) streak = cur;
    } else if (offset > 0) {
      cur = 0;
    }
  }

  const rowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '14px 0', borderBottom: '1px solid var(--border)',
  };
  const sectionLabel = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6,
  };

  return ReactDOM.createPortal(
    <div ref={panelRef} style={{
      position: 'fixed', inset: 0, zIndex: 190,
      background: 'var(--bg)', overflowY: 'auto',
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 8px' }}>
        <button onClick={dismiss} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--fg-muted)', fontSize: 20, lineHeight: 1, padding: 4,
        }}>←</button>
        <span style={{ fontSize: 17, fontWeight: 700 }}>Profile</span>
      </div>

      <div style={{ padding: '16px 20px 60px' }}>
        <div style={sectionLabel}>Stats</div>

        <div style={rowStyle}>
          <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Archive saved</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{totalSaved}</span>
        </div>
        <div style={rowStyle}>
          <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Tasks completed</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{totalDone}</span>
        </div>
        {activeRoutines > 0 && <>
          <div style={rowStyle}>
            <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Active routines</span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{activeRoutines}</span>
          </div>
          <div style={rowStyle}>
            <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Current streak</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: streak > 0 ? '#22c55e' : 'var(--fg)' }}>
              {streak} {streak === 1 ? 'day' : 'days'}
            </span>
          </div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Best streak</span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{best} {best === 1 ? 'day' : 'days'}</span>
          </div>
        </>}
      </div>
    </div>,
    document.body
  );
}

Object.assign(window, { ProfilePage });
