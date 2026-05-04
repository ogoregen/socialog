function ProfilePage({ onBack }) {
  const panelRef  = React.useRef(null);
  const importRef = React.useRef(null);
  const nameRef = React.useRef(null);

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

  function saveName() {
    const val = nameRef.current?.value.trim() || '';
    save('profile', { ...(load('profile') || {}), name: val });
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const bookmarks = load('bookmarks') || [];
  const todos     = load('todos')     || [];
  const routines  = load('routines')  || [];

  // Join date: earliest createdAt across all stores
  const allDates = [...bookmarks, ...todos, ...routines]
    .map(x => x.createdAt).filter(Boolean).sort();
  const joinDate = allDates[0]
    ? new Date(allDates[0]).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  // Stats
  const totalSaved = bookmarks.length;
  const totalDone  = todos.filter(t => t.done).length;
  const activeRoutines = routines.length;

  // Streak (same logic as StreakGrid)
  const now = new Date();
  let streak = 0, best = 0, cur = 0;
  for (let offset = 0; offset <= 365; offset++) {
    const d   = new Date(now); d.setDate(now.getDate() - offset);
    const ds  = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    const scheduled = routines.filter(r => r.days.includes(dow));
    if (!scheduled.length) continue;
    const done = scheduled.filter(r => r.completions && r.completions[ds]).length;
    if (done > 0) { cur++; if (cur > best) best = cur; if (streak === 0 || offset === 0) streak = cur; }
    else if (offset > 0) cur = 0;
  }

  // Most active day of week (routine completions + task doneAt)
  const rawCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun=0
  routines.forEach(r =>
    Object.keys(r.completions || {}).forEach(ds =>
      rawCounts[new Date(ds + 'T12:00:00').getDay()]++
    )
  );
  todos.filter(t => t.done && t.doneAt).forEach(t =>
    rawCounts[new Date(t.doneAt.slice(0, 10) + 'T12:00:00').getDay()]++
  );
  // Reorder Mon-first
  const MON = [1, 2, 3, 4, 5, 6, 0];
  const dayCounts  = MON.map(i => rawCounts[i]);
  const dayMax     = Math.max(...dayCounts);
  const hasActivity = dayMax > 0;
  const activeDay  = hasActivity ? dayCounts.indexOf(dayMax) : -1;
  const DAY_SHORT  = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const DAY_FULL   = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

  // Archive breakdown by type
  const typeCounts = {};
  bookmarks.forEach(b => { typeCounts[b.type] = (typeCounts[b.type] || 0) + 1; });
  const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  // ── Export / Import ───────────────────────────────────────────────────────
  function exportData() {
    const blob = new Blob([JSON.stringify({
      version: 1, exportedAt: new Date().toISOString(),
      bookmarks, todos, routines, profile: load('profile') || {},
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `socialog-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.bookmarks) save('bookmarks', data.bookmarks);
        if (data.todos)     save('todos',     data.todos);
        if (data.routines)  save('routines',  data.routines);
        if (data.profile)   save('profile',   data.profile);
        window.location.reload();
      } catch { showToast('Invalid backup file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const sectionLabel = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--fg-muted)',
    marginBottom: 4, marginTop: 28,
  };
  const row = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '13px 0', borderBottom: '1px solid var(--border)',
  };
  const actionBtn = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
    padding: '13px 0', borderBottom: '1px solid var(--border)',
    color: 'var(--fg)', fontSize: 14, textAlign: 'left',
  };

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
        <span style={{ fontSize: 17, fontWeight: 700 }}>Profile</span>
      </div>

      <div style={{ padding: '0 20px 80px' }}>

        {/* Name */}
        <div style={{ marginTop: 24, marginBottom: 4 }}>
          <input
            ref={nameRef}
            defaultValue={(load('profile') || {}).name || ''}
            onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && e.target.blur()}
            placeholder="Your name"
            style={{
              fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em',
              background: 'none', border: 'none', outline: 'none',
              width: '100%', color: 'var(--fg)', fontFamily: 'inherit',
            }}
          />
          {joinDate && (
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
              Since {joinDate}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={sectionLabel}>Stats</div>
        <div style={row}>
          <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Archive saved</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{totalSaved}</span>
        </div>
        {typeEntries.length > 0 && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
              {typeEntries.map(([type, count]) => (
                <span key={type} style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                  {count} {type}{count !== 1 ? 's' : ''}
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={row}>
          <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Tasks completed</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{totalDone}</span>
        </div>
        {activeRoutines > 0 && <>
          <div style={row}>
            <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Active routines</span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{activeRoutines}</span>
          </div>
          <div style={row}>
            <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Current streak</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: streak > 0 ? '#22c55e' : 'var(--fg)' }}>
              {streak} {streak === 1 ? 'day' : 'days'}
            </span>
          </div>
          <div style={{ ...row, borderBottom: 'none' }}>
            <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Best streak</span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{best} {best === 1 ? 'day' : 'days'}</span>
          </div>
        </>}

        {/* Most active day */}
        {hasActivity && (
          <>
            <div style={sectionLabel}>Most active</div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 64, marginBottom: 8 }}>
              {dayCounts.map((count, i) => {
                const h   = Math.max(4, (count / dayMax) * 52);
                const top = i === activeDay;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ width: '100%', height: h, borderRadius: 4, background: top ? '#22c55e' : 'var(--border)', transition: 'height 0.4s ease' }} />
                    <div style={{ fontSize: 9, fontWeight: top ? 700 : 400, color: top ? '#22c55e' : 'var(--fg-muted)' }}>{DAY_SHORT[i]}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Most active on {DAY_FULL[activeDay]}</div>
          </>
        )}

        {/* Data */}
        <div style={sectionLabel}>Data</div>
        <button style={actionBtn} onClick={exportData}>
          <span>Export backup</span>
          <span style={{ color: 'var(--fg-muted)', fontSize: 16 }}>↓</span>
        </button>
        <button style={{ ...actionBtn, borderBottom: 'none' }} onClick={() => importRef.current?.click()}>
          <span>Import backup</span>
          <span style={{ color: 'var(--fg-muted)', fontSize: 16 }}>↑</span>
        </button>
        <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />

      </div>
    </div>,
    document.body
  );
}

Object.assign(window, { ProfilePage });
