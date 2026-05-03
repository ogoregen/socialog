// Home — today's digest across all three tabs

const HOME_TYPE_ICONS = {
  music: '♪', movie: '▶', book: '◻', article: '§',
  place: '◈', recipe: '✦', product: '◇', event: '◉',
};

function Home({ onNavigate }) {
  const todayKey = today();
  const todayIdx = currentDayIndex();

  const todos     = load('todos')     || [];
  const bookmarks = load('bookmarks') || [];
  const routines  = load('routines')  || [];

  const todayRoutines   = routines.filter(r => r.days.includes(todayIdx));
  const doneRoutines    = todayRoutines.filter(r => r.completions && r.completions[todayKey]);
  const pendingRoutines = todayRoutines.filter(r => !(r.completions && r.completions[todayKey]));

  const overdue        = todos.filter(t => !t.done && t.dueDate && daysDiff(t.dueDate) < 0);
  const dueToday       = todos.filter(t => !t.done && t.dueDate && daysDiff(t.dueDate) === 0);
  const upcoming       = todos.filter(t => { const d = daysDiff(t.dueDate); return !t.done && d > 0 && d <= 7; });
  const completedToday = todos.filter(t => t.done && t.doneAt && t.doneAt.slice(0, 10) === todayKey);

  const savedToday = bookmarks.filter(b => b.createdAt && b.createdAt.slice(0, 10) === todayKey);

  const hasRoutines = todayRoutines.length > 0;
  const hasTasks    = overdue.length + dueToday.length + upcoming.length + completedToday.length > 0;
  const hasSaved    = savedToday.length > 0;
  const isEmpty     = !hasRoutines && !hasTasks && !hasSaved;

  const sectionHeaderStyle = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--fg-muted)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  };

  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', borderRadius: 12, marginBottom: 6,
    background: 'var(--surface)', border: '1px solid var(--border)',
    cursor: 'pointer',
  };

  const navBtn = (label, tab) => (
    <button onClick={() => onNavigate(tab)} style={{
      background: 'none', border: 'none', fontSize: 11,
      color: 'var(--fg-muted)', cursor: 'pointer', padding: 0,
    }}>{label}</button>
  );

  return (
    <div style={{ padding: '20px 20px 60px' }}>

      {/* Date */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
        </div>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 3 }}>
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Routines */}
      {hasRoutines && (
        <div style={{ marginBottom: 32 }}>
          <div style={sectionHeaderStyle}>
            <span>Routines</span>
            {navBtn(`${doneRoutines.length} / ${todayRoutines.length} done`, 'routines')}
          </div>
          {[...pendingRoutines, ...doneRoutines].map(r => {
            const isDone = !!(r.completions && r.completions[todayKey]);
            return (
              <div key={r.id} onClick={() => onNavigate('routines')} style={{ ...rowStyle, opacity: isDone ? 0.5 : 1 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isDone ? '#22c55e' : 'var(--border)'}`,
                  background: isDone ? '#22c55e' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isDone && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{r.title}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tasks */}
      {hasTasks && (
        <div style={{ marginBottom: 32 }}>
          <div style={sectionHeaderStyle}>
            <span>Tasks</span>
            {navBtn('View all', 'todos')}
          </div>
          {[...overdue, ...dueToday, ...upcoming, ...completedToday].map(t => {
            const diff = daysDiff(t.dueDate);
            const isOverdue  = !t.done && diff < 0;
            const isUpcoming = !t.done && diff > 0;
            const dueLabel = isOverdue ? 'Overdue'
              : isUpcoming && diff === 1 ? 'Tomorrow'
              : isUpcoming ? new Date(t.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : null;
            const labelColor = isOverdue ? '#ef4444' : 'var(--fg-muted)';
            return (
              <div key={t.id} onClick={() => onNavigate('todos')} style={{ ...rowStyle, opacity: t.done ? 0.5 : 1 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${t.done ? '#22c55e' : isOverdue ? '#ef4444' : 'var(--border)'}`,
                  background: t.done ? '#22c55e' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {t.done && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: t.done ? 'line-through' : 'none' }}>
                  {t.text}
                </span>
                {dueLabel && (
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: isOverdue ? '#ef4444' : 'transparent', border: isOverdue ? 'none' : '1px solid var(--border)', color: isOverdue ? '#fff' : 'var(--fg-muted)', fontWeight: 600, flexShrink: 0 }}>
                    {dueLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Saved today */}
      {hasSaved && (
        <div style={{ marginBottom: 32 }}>
          <div style={sectionHeaderStyle}>
            <span>Saved today</span>
            {navBtn('View all', 'bookmarks')}
          </div>
          {savedToday.map(b => (
            <div key={b.id} onClick={() => onNavigate('bookmarks')} style={rowStyle}>
              <span style={{ fontSize: 15, flexShrink: 0, opacity: 0.5 }}>
                {HOME_TYPE_ICONS[b.type] || '★'}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.title || b.url}
              </span>
            </div>
          ))}
        </div>
      )}

      {isEmpty && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--fg-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.2 }}>◈</div>
          <div style={{ fontSize: 13, opacity: 0.5 }}>Nothing logged yet today</div>
        </div>
      )}

    </div>
  );
}

Object.assign(window, { Home });
