// Routines component — daily/weekly repeating habits

const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-first display order

function emptyRoutine() {
  return {
    id: uid(), title: '', days: [0,1,2,3,4,5,6],
    timeOfDay: 'anytime', weekly: false,
    completions: {},
  };
}

function hasCompletionInWeek(completions, monday) {
  if (!completions) return false;
  const sun = new Date(monday); sun.setDate(sun.getDate() + 7);
  return Object.keys(completions).some(k => {
    const d = new Date(k + 'T00:00:00');
    return d >= monday && d < sun;
  });
}

function RoutineModal({ routine, onSave, onClose }) {
  const [form, setForm] = React.useState(routine);

  function toggleDay(d) {
    setForm(f => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d].sort(),
    }));
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)',
    fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 4, display: 'block',
  };

  const TIME_OPTIONS = ['morning', 'afternoon', 'evening', 'anytime'];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200,
      display: 'flex', alignItems: 'flex-end',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg)', borderRadius: '20px 20px 0 0', width: '100%',
        maxHeight: '85vh', overflowY: 'auto', padding: '0 0 40px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }}></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>{form.title ? 'Edit routine' : 'New routine'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--fg-muted)', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Routine name</label>
            <input style={inputStyle} value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Morning stretch…" />
          </div>

          {/* Frequency */}
          <div>
            <span style={labelStyle}>Frequency</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['daily', 'Daily'], ['weekly', 'Weekly — any day']].map(([val, label]) => {
                const active = val === 'weekly' ? !!form.weekly : !form.weekly;
                return (
                  <button key={val} onClick={() => setForm(f => ({ ...f, weekly: val === 'weekly' }))} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', border: '1px solid', textTransform: 'none',
                    background: active ? 'var(--fg)' : 'transparent',
                    color: active ? 'var(--bg)' : 'var(--fg-muted)',
                    borderColor: active ? 'var(--fg)' : 'var(--border)',
                    transition: 'all 0.15s',
                  }}>{label}</button>
                );
              })}
            </div>
          </div>

          {/* Day picker — hidden for weekly */}
          {!form.weekly && <div>
            <span style={labelStyle}>Repeat on</span>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
              {WEEK_ORDER.map(i => (
                <button key={i} onClick={() => toggleDay(i)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid',
                  background: form.days.includes(i) ? 'var(--fg)' : 'transparent',
                  color: form.days.includes(i) ? 'var(--bg)' : 'var(--fg-muted)',
                  borderColor: form.days.includes(i) ? 'var(--fg)' : 'var(--border)',
                  transition: 'all 0.15s',
                }}>
                  {DAY_NAMES[i]}
                </button>
              ))}
            </div>
          </div>}

          {/* Time of day */}
          <div>
            <span style={labelStyle}>Time of day</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {TIME_OPTIONS.map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, timeOfDay: t }))} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid', textTransform: 'capitalize',
                  background: form.timeOfDay === t ? 'var(--fg)' : 'transparent',
                  color: form.timeOfDay === t ? 'var(--bg)' : 'var(--fg-muted)',
                  borderColor: form.timeOfDay === t ? 'var(--fg)' : 'var(--border)',
                  transition: 'all 0.15s',
                }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => form.title.trim() && onSave(form)} style={{
            width: '100%', padding: '14px', borderRadius: 12, background: 'var(--fg)',
            color: 'var(--bg)', border: 'none', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', marginTop: 4,
            opacity: form.title.trim() ? 1 : 0.4,
          }}>
            Save routine
          </button>
        </div>
      </div>
    </div>
  );
}

function calcStreak(routine, isWeekly, completedThisWeek) {
  let streak = 0;
  if (isWeekly) {
    const d = new Date();
    if (!completedThisWeek) d.setDate(d.getDate() - 7);
    for (let i = 0; i < 52; i++) {
      const mon = getMondayOf(d);
      if (hasCompletionInWeek(routine.completions, mon)) { streak++; d.setDate(d.getDate() - 7); }
      else break;
    }
  } else {
    const d = new Date();
    while (streak <= 365) {
      const key = d.toISOString().slice(0, 10);
      const dayIdx = d.getDay();
      if (!routine.days.includes(dayIdx)) { d.setDate(d.getDate() - 1); continue; }
      if (routine.completions && routine.completions[key]) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
  }
  return streak;
}

function RoutineRow({ routine, onToggleToday, onEdit, onDelete }) {
  const todayKey = today();
  const todayDayIdx = currentDayIndex();
  const thisMonday = getMondayOf(new Date());

  const isWeekly = routine.weekly;
  const completedThisWeek = isWeekly && hasCompletionInWeek(routine.completions, thisMonday);
  const completedToday = !isWeekly && !!(routine.completions && routine.completions[todayKey]);
  const isScheduledToday = isWeekly ? true : routine.days.includes(todayDayIdx);
  const isDone = isWeekly ? completedThisWeek : completedToday;

  const streak = React.useMemo(
    () => calcStreak(routine, isWeekly, completedThisWeek),
    [routine.completions, isWeekly, completedThisWeek]
  );
  const TIME_ICONS = { morning: '◎', afternoon: '◑', evening: '●', anytime: '○' };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '18px 0', borderBottom: '1px solid var(--border)',
      opacity: (!isScheduledToday && !isDone) ? 0.3 : 1,
    }}>
      {/* Check circle */}
      <button onClick={() => isScheduledToday && onToggleToday(routine.id)} style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        border: '1.5px solid', cursor: isScheduledToday ? 'pointer' : 'default',
        background: isDone ? 'var(--fg)' : 'transparent',
        borderColor: isDone ? 'var(--fg)' : 'var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}>
        {isDone && <span style={{ color: 'var(--bg)', fontSize: 14 }}>✓</span>}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>{routine.title}</div>
        {isWeekly ? (
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
            weekly · any day · {TIME_ICONS[routine.timeOfDay]} {routine.timeOfDay}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {WEEK_ORDER.map(i => (
              <span key={i} style={{
                width: 18, height: 18, borderRadius: 4, fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: routine.days.includes(i)
                  ? (i === todayDayIdx ? 'var(--fg)' : 'var(--border)')
                  : 'transparent',
                color: routine.days.includes(i)
                  ? (i === todayDayIdx ? 'var(--bg)' : 'var(--fg-muted)')
                  : 'var(--border)',
              }}>{DAY_NAMES[i].slice(0,1)}</span>
            ))}
            <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--fg-muted)' }}>
              {TIME_ICONS[routine.timeOfDay]} {routine.timeOfDay}
            </span>
          </div>
        )}
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{streak}</div>
          <div style={{ fontSize: 9, color: 'var(--fg-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>streak</div>
        </div>
      )}

      {/* Edit / delete */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <button onClick={() => onEdit(routine)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--fg-muted)', cursor: 'pointer', padding: '2px 4px' }}>Edit</button>
        <button onClick={() => onDelete(routine.id)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--fg-muted)', cursor: 'pointer', padding: '2px 4px' }}>Del</button>
      </div>
    </div>
  );
}

function Routines() {
  const [items, setItems] = React.useState(() => load('routines') || []);
  const [modal, setModal] = React.useState(null);

  React.useEffect(() => { save('routines', items); }, [items]);

  function handleSave(r) {
    setItems(prev => {
      const idx = prev.findIndex(x => x.id === r.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = r; return next; }
      return [r, ...prev];
    });
    setModal(null);
  }

  function handleToggleToday(id) {
    const key = today();
    setItems(prev => prev.map(r => {
      if (r.id !== id) return r;
      const completions = { ...(r.completions || {}) };
      if (completions[key]) { delete completions[key]; }
      else { completions[key] = true; }
      return { ...r, completions };
    }));
  }

  function handleDelete(id) { setItems(prev => prev.filter(r => r.id !== id)); }

  const todayDayIdx = currentDayIndex();
  const thisMonday  = getMondayOf(new Date());
  const todayKey    = today();
  const todayRoutines = items.filter(r => r.weekly || r.days.includes(todayDayIdx));
  const otherRoutines = items.filter(r => !r.weekly && !r.days.includes(todayDayIdx));

  const dailyRoutines  = todayRoutines.filter(r => !r.weekly);
  const weeklyRoutines = todayRoutines.filter(r => r.weekly);
  const doneDaily  = dailyRoutines.filter(r => r.completions && r.completions[todayKey]).length;
  const doneWeekly = weeklyRoutines.filter(r => hasCompletionInWeek(r.completions, thisMonday)).length;
  const doneToday  = doneDaily + doneWeekly;

  return (
    <div style={{ padding: '20px 20px 60px' }}>
      {/* Add bar */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '10px 12px', marginBottom: 24,
      }}>
        <span style={{ color: 'var(--fg-muted)', fontSize: 14, flexShrink: 0 }}>○</span>
        <span style={{ flex: 1, fontSize: 14, lineHeight: 1, color: 'var(--fg-muted)', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setModal(emptyRoutine())}>Add a routine…</span>
        <button onClick={() => setModal(emptyRoutine())} style={{
          background: 'var(--fg)', color: 'var(--bg)', border: 'none',
          borderRadius: 8, width: 30, height: 30, fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>+</button>
      </div>

      {/* Today summary */}
      {todayRoutines.length > 0 && (
        <div style={{ marginBottom: 28, padding: '0 2px' }}>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', opacity: 0.5, marginBottom: 16 }}>
            {DAY_NAMES[todayDayIdx]}, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {dailyRoutines.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <svg width="52" height="52" viewBox="0 0 52 52" style={{ flexShrink: 0 }}>
                  <circle cx="26" cy="26" r="22" fill="none" stroke="var(--border)" strokeWidth="2.5" />
                  <circle cx="26" cy="26" r="22" fill="none" stroke="var(--fg)" strokeWidth="2.5"
                    strokeDasharray={`${(doneDaily / dailyRoutines.length) * 138.2} 138.2`}
                    strokeLinecap="round" transform="rotate(-90 26 26)" style={{ transition: 'stroke-dasharray 0.4s', opacity: 0.7 }}
                  />
                  <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="400" fill="var(--fg)" opacity="0.6">
                    {Math.round((doneDaily / dailyRoutines.length) * 100)}%
                  </text>
                </svg>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1 }}>{doneDaily}/{dailyRoutines.length}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', opacity: 0.6, marginTop: 4 }}>today</div>
                </div>
              </div>
            )}
            {weeklyRoutines.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <svg width="52" height="52" viewBox="0 0 52 52" style={{ flexShrink: 0 }}>
                  <circle cx="26" cy="26" r="22" fill="none" stroke="var(--border)" strokeWidth="2.5" />
                  <circle cx="26" cy="26" r="22" fill="none" stroke="var(--fg)" strokeWidth="2.5"
                    strokeDasharray={`${(doneWeekly / weeklyRoutines.length) * 138.2} 138.2`}
                    strokeLinecap="round" transform="rotate(-90 26 26)" style={{ transition: 'stroke-dasharray 0.4s', opacity: 0.7 }}
                  />
                  <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="400" fill="var(--fg)" opacity="0.6">
                    {Math.round((doneWeekly / weeklyRoutines.length) * 100)}%
                  </text>
                </svg>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1 }}>{doneWeekly}/{weeklyRoutines.length}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', opacity: 0.6, marginTop: 4 }}>this week</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--fg-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.2 }}>○</div>
          <div style={{ fontSize: 13, opacity: 0.5 }}>No routines yet</div>
        </div>
      )}

      {/* Today's routines */}
      {todayRoutines.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {todayRoutines.map(r => (
            <RoutineRow key={r.id} routine={r} onToggleToday={handleToggleToday} onEdit={r => setModal(r)} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Other routines */}
      {otherRoutines.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', opacity: 0.5, marginBottom: 8, paddingLeft: 2 }}>other days</div>
          {otherRoutines.map(r => (
            <RoutineRow key={r.id} routine={r} onToggleToday={handleToggleToday} onEdit={r => setModal(r)} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {modal && <RoutineModal routine={modal} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
}

Object.assign(window, { Routines });
