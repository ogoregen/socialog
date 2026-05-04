// Home — today's digest across all three tabs

const HOME_TYPE_ICONS = {
  music: '♪', movie: '▶', book: '◻', article: '§',
  place: '◈', recipe: '✦', other: '◇', event: '◉',
};

// ── Monthly habit streak grid ─────────────────────────────────────────────────
function StreakGrid({ routines }) {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const todayDate = now.getDate();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first: shift Sun(0)→6, Mon(1)→0, …, Sat(6)→5
  const rawFirst       = new Date(year, month, 1).getDay();
  const firstDayOfWeek = (rawFirst + 6) % 7;
  const monthLabel     = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Compute current streak: consecutive past days (excl. days with no routines) with ≥1 done
  let streak = 0;
  for (let offset = 0; offset <= 365; offset++) {
    const d = new Date(now); d.setDate(now.getDate() - offset);
    const ds  = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    const scheduled = routines.filter(r => r.days.includes(dow));
    if (!scheduled.length) continue;
    const completed = scheduled.filter(r => r.completions && r.completions[ds]).length;
    if (completed > 0) streak++;
    else if (offset > 0) break; // today being incomplete doesn't break the streak
  }

  function cellColor(day) {
    if (!day) return 'transparent';
    if (day > todayDate) return 'var(--border)';
    const mm  = String(month + 1).padStart(2, '0');
    const dd  = String(day).padStart(2, '0');
    const ds  = `${year}-${mm}-${dd}`;
    const dow = new Date(year, month, day).getDay();
    const scheduled = routines.filter(r => r.days.includes(dow));
    if (!scheduled.length) return 'var(--border)';
    const ratio = scheduled.filter(r => r.completions && r.completions[ds]).length / scheduled.length;
    if (ratio === 0)   return 'var(--border)';
    if (ratio < 0.34)  return 'rgba(34,197,94,0.28)';
    if (ratio < 0.67)  return 'rgba(34,197,94,0.55)';
    if (ratio < 1)     return 'rgba(34,197,94,0.8)';
    return '#22c55e';
  }

  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const cells = Array(firstDayOfWeek).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        {streak > 0
          ? <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>{streak} day streak</span>
          : <span />}
        <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{monthLabel}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {DAY_LABELS.map((l, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 8, fontWeight: 600, color: 'var(--fg-muted)', paddingBottom: 2, letterSpacing: '0.06em' }}>
            {l}
          </div>
        ))}
        {cells.map((day, i) => {
          const isToday = day === todayDate;
          return (
            <div key={i} style={{
              aspectRatio: '1',
              borderRadius: 3,
              background: cellColor(day),
              boxShadow: isToday ? '0 0 0 1.5px var(--fg)' : 'none',
            }} />
          );
        })}
      </div>
    </div>
  );
}

// ── Main Home view ────────────────────────────────────────────────────────────
function Home({ onNavigate, onOpenDrawer }) {
  const todayKey = today();
  const todayIdx = currentDayIndex();

  const [intention, setIntention] = React.useState(() => {
    try {
      const raw = localStorage.getItem('socialog_intention');
      if (!raw) return '';
      const saved = JSON.parse(raw);
      return saved.date === todayKey ? saved.text : '';
    } catch { return ''; }
  });

  function handleIntention(e) {
    const text = e.target.value;
    setIntention(text);
    localStorage.setItem('socialog_intention', JSON.stringify({ date: todayKey, text }));
  }

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
  const isEmpty     = !routines.length && !hasTasks && !hasSaved;

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

      {/* Date + drawer button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={onOpenDrawer} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontSize: 20, color: 'var(--fg-muted)', flexShrink: 0, lineHeight: 1,
        }}>☰</button>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 3 }}>
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Daily intention */}
      <input
        type="text"
        value={intention}
        onChange={handleIntention}
        placeholder="What matters today?"
        maxLength={120}
        style={{
          display: 'block', width: '100%', boxSizing: 'border-box',
          background: 'none', border: 'none', outline: 'none',
          borderBottom: intention ? '1px solid var(--border)' : '1px dashed var(--border)',
          padding: '4px 0 10px',
          fontSize: 17, fontFamily: 'inherit',
          fontWeight: intention ? 500 : 400,
          color: intention ? 'var(--fg)' : 'var(--fg-muted)',
          letterSpacing: '-0.01em',
          marginBottom: 28,
        }}
      />

      {/* Streak grid — always shown if user has any routines */}
      {routines.length > 0 && <StreakGrid routines={routines} />}

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
              <div key={r.id} data-tap="" onClick={() => onNavigate('routines')} style={{ ...rowStyle, opacity: isDone ? 0.5 : 1 }}>
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
            return (
              <div key={t.id} data-tap="" onClick={() => onNavigate('todos')} style={{ ...rowStyle, opacity: t.done ? 0.5 : 1 }}>
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
            <div key={b.id} data-tap="" onClick={() => onNavigate('bookmarks')} style={rowStyle}>
              <span style={{ fontSize: 15, flexShrink: 0, opacity: 0.5, width: 20, textAlign: 'center', display: 'inline-block' }}>
                {HOME_TYPE_ICONS[b.type] || '▣'}
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
