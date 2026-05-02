// Todos component — simple, clean checklist

const CATEGORIES = [
  { id: 'work',     label: 'Work',     color: '#3b82f6' },
  { id: 'personal', label: 'Personal', color: '#a855f7' },
  { id: 'health',   label: 'Health',   color: '#22c55e' },
  { id: 'finance',  label: 'Finance',  color: '#f59e0b' },
  { id: 'other',    label: 'Other',    color: '#ec4899' },
];

function catColor(id) {
  return CATEGORIES.find(c => c.id === id)?.color ?? null;
}

function nextCat(id) {
  const idx = CATEGORIES.findIndex(c => c.id === id);
  if (idx === -1) return CATEGORIES[0].id;
  if (idx === CATEGORIES.length - 1) return null;
  return CATEGORIES[idx + 1].id;
}

function formatDueDate(iso) {
  if (!iso) return null;
  const due = new Date(iso + 'T00:00:00');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const diff = Math.round((due - now) / 86400000);
  if (diff < 0) {
    const n = Math.abs(diff);
    const label = n < 7 ? `${n}d overdue` : n < 30 ? `${Math.floor(n / 7)}w overdue` : `${Math.floor(n / 30)}mo overdue`;
    return { label, overdue: true, today: false, soon: false };
  }
  if (diff === 0) return { label: 'today',    overdue: false, today: true,  soon: false };
  if (diff === 1) return { label: 'tomorrow', overdue: false, today: false, soon: true  };
  if (diff < 7)  return { label: `${diff}d left`,              overdue: false, today: false, soon: false };
  if (diff < 30) return { label: `${Math.floor(diff / 7)}w left`,  overdue: false, today: false, soon: false };
  return         { label: `${Math.floor(diff / 30)}mo left`,   overdue: false, today: false, soon: false };
}

function duePillStyle(fmt) {
  if (!fmt)        return { background: 'transparent', color: 'var(--fg-muted)', border: '1.5px solid var(--border)' };
  if (fmt.overdue) return { background: '#ef4444', color: '#fff', border: 'none' };
  if (fmt.today)   return { background: '#f59e0b', color: '#fff', border: 'none' };
  if (fmt.soon)    return { background: '#3b82f6', color: '#fff', border: 'none' };
  return           { background: 'var(--surface)', color: 'var(--fg-muted)', border: '1.5px solid var(--border)' };
}

const BUCKETS = [
  { id: 'overdue',  label: 'Overdue',    color: '#ef4444' },
  { id: 'today',    label: 'Today',      color: '#f59e0b' },
  { id: 'tomorrow', label: 'Tomorrow',   color: '#3b82f6' },
  { id: 'week',     label: 'This week',  color: null },
  { id: 'later',    label: 'Later',      color: null },
  { id: 'someday',  label: 'Someday',    color: null },
];

function getBucket(iso) {
  if (!iso) return 'someday';
  const due = new Date(iso + 'T00:00:00');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const diff = Math.round((due - now) / 86400000);
  if (diff < 0)  return 'overdue';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff < 7)  return 'week';
  return 'later';
}

function Todos() {
  const [items, setItems]         = React.useState(() => load('todos') || []);
  const [input, setInput]         = React.useState('');
  const [addCat, setAddCat]       = React.useState(null);
  const [addDue, setAddDue]       = React.useState(null);
  const [catFilter, setCatFilter] = React.useState(null);
  const inputRef = React.useRef();

  React.useEffect(() => { save('todos', items); }, [items]);

  function addTodo() {
    const text = input.trim();
    if (!text) return;
    setItems(prev => [{ id: uid(), text, done: false, category: addCat, dueDate: addDue, createdAt: new Date().toISOString() }, ...prev]);
    setInput('');
    setAddDue(null);
    inputRef.current?.focus();
  }

  function toggleDone(id) {
    setItems(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function cycleCategory(id) {
    setItems(prev => prev.map(t => t.id === id ? { ...t, category: nextCat(t.category) } : t));
  }

  function setDueDate(id, date) {
    setItems(prev => prev.map(t => t.id === id ? { ...t, dueDate: date || null } : t));
  }

  function deleteItem(id) {
    setItems(prev => prev.filter(t => t.id !== id));
  }

  function clearDone() {
    setItems(prev => prev.filter(t => !t.done));
  }

  const active = items.filter(t => !t.done);
  const done   = items.filter(t => t.done);

  const shownActive = catFilter ? active.filter(t => t.category === catFilter) : active;
  const shownDone   = catFilter ? done.filter(t => t.category === catFilter) : done;

  const usedCats = CATEGORIES.filter(c => items.some(t => t.category === c.id));

  const addColor = catColor(addCat);
  const addDueFmt = formatDueDate(addDue);

  return (
    <div style={{ padding: '16px 16px 40px' }}>
      {/* Add input */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '10px 14px', marginBottom: 12,
      }}>
        <button onClick={() => setAddCat(nextCat(addCat))} title={addCat ? CATEGORIES.find(c => c.id === addCat)?.label : 'No category'} style={{
          width: 14, height: 14, borderRadius: '50%', flexShrink: 0, padding: 0, cursor: 'pointer',
          background: addColor || 'transparent',
          border: `2px solid ${addColor || 'var(--border)'}`,
        }} />
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="Add a task…"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 14, color: 'var(--fg)', fontFamily: 'inherit',
          }}
        />
        {/* Due date picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              fontSize: 11, display: 'block', padding: '1px 0', pointerEvents: 'none',
              color: 'var(--fg-muted)', opacity: addDue ? 1 : 0.4, whiteSpace: 'nowrap',
            }}>{addDueFmt ? addDueFmt.label : '◷'}</span>
            <input type="date" value={addDue || ''} onChange={e => setAddDue(e.target.value || null)}
              style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
          </div>
          {addDue && (
            <button onClick={() => setAddDue(null)} style={{
              background: 'none', border: 'none', fontSize: 12, color: 'var(--fg-muted)',
              cursor: 'pointer', padding: 0, opacity: 0.6, lineHeight: 1,
            }}>×</button>
          )}
        </div>
        <button onClick={addTodo} style={{
          background: 'var(--fg)', color: 'var(--bg)', border: 'none',
          borderRadius: 8, width: 30, height: 30, fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>+</button>
      </div>

      {/* Category filter pills */}
      {usedCats.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 12 }}>
          {[null, ...usedCats].map(c => {
            const isAll = c === null;
            const active = catFilter === (isAll ? null : c.id);
            const cc = isAll ? null : c.color;
            return (
              <button key={isAll ? 'all' : c.id} onClick={() => setCatFilter(isAll ? null : c.id)} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5,
                background: active ? (cc || 'var(--fg)') : 'transparent',
                color: active ? '#fff' : 'var(--fg)',
                borderColor: active ? (cc || 'var(--fg)') : 'var(--border)',
                transition: 'all 0.15s',
              }}>
                {!isAll && <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
                  background: active ? 'rgba(255,255,255,0.8)' : c.color,
                }} />}
                {isAll ? 'All' : c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Active tasks — bucketed by time */}
      {active.length === 0 && done.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--fg-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>✓</div>
          <div style={{ fontSize: 14 }}>Nothing to do — add a task above</div>
        </div>
      )}

      {BUCKETS.map((bucket, bi) => {
        const tasks = shownActive.filter(t => getBucket(t.dueDate) === bucket.id);
        if (!tasks.length) return null;
        return (
          <div key={bucket.id} style={{ marginTop: bi === 0 ? 0 : 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: bucket.color || 'var(--fg-muted)', marginBottom: 2, paddingBottom: 4,
              borderBottom: '1px solid var(--border)',
            }}>{bucket.label}</div>
            {tasks.map(t => (
              <TodoRow key={t.id} item={t} onToggle={toggleDone} onDelete={deleteItem} onCycleCategory={cycleCategory} onSetDueDate={setDueDate} />
            ))}
          </div>
        );
      })}

      {/* Done section */}
      {shownDone.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
              Done ({shownDone.length})
            </span>
            <button onClick={clearDone} style={{
              background: 'none', border: 'none', fontSize: 12,
              color: 'var(--fg-muted)', cursor: 'pointer',
            }}>Clear all</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {shownDone.map(t => (
              <TodoRow key={t.id} item={t} onToggle={toggleDone} onDelete={deleteItem} onCycleCategory={cycleCategory} onSetDueDate={setDueDate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TodoRow({ item, onToggle, onDelete, onCycleCategory, onSetDueDate }) {
  const [pressed, setPressed] = React.useState(false);
  const color    = catColor(item.category);
  const dueFmt   = formatDueDate(item.dueDate);
  const pillStyle = duePillStyle(dueFmt);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 4px 12px 8px',
        borderBottom: '1px solid var(--border)',
        borderLeft: `3px solid ${color || 'transparent'}`,
        opacity: item.done ? 0.45 : 1,
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        transition: 'transform 0.1s, opacity 0.2s',
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    >
      {/* Checkbox */}
      <button onClick={() => onToggle(item.id)} style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        border: '1.5px solid', cursor: 'pointer',
        background: item.done ? (color || 'var(--fg)') : 'transparent',
        borderColor: item.done ? (color || 'var(--fg)') : (color || 'var(--border)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {item.done && <span style={{ color: '#fff', fontSize: 13, lineHeight: 1 }}>✓</span>}
      </button>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, lineHeight: 1.4, color: 'var(--fg)',
          textDecoration: item.done ? 'line-through' : 'none',
          wordBreak: 'break-word',
        }}>{item.text}</div>
      </div>

      {/* Due date pill — tap to pick, × to clear */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <span style={{
            display: 'block', padding: '3px 8px', borderRadius: 20,
            fontSize: 11, fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap',
            ...pillStyle,
          }}>{dueFmt ? dueFmt.label : '◷'}</span>
          <input type="date" value={item.dueDate || ''} onChange={e => onSetDueDate(item.id, e.target.value || null)}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
        </div>
        {item.dueDate && (
          <button onClick={e => { e.stopPropagation(); onSetDueDate(item.id, null); }} style={{
            background: 'none', border: 'none', fontSize: 11, color: 'var(--fg-muted)',
            cursor: 'pointer', padding: 0, opacity: 0.5, lineHeight: 1,
          }}>×</button>
        )}
      </div>

      {/* Category dot */}
      <button onClick={() => onCycleCategory(item.id)} style={{
        width: 10, height: 10, borderRadius: '50%', flexShrink: 0, padding: 0,
        background: color || 'transparent',
        border: `1.5px solid ${color || 'var(--border)'}`,
        cursor: 'pointer', opacity: color ? 1 : 0.35,
      }} />

      {/* Delete */}
      <button onClick={() => onDelete(item.id)} style={{
        background: 'none', border: 'none', color: 'var(--fg-muted)',
        fontSize: 16, cursor: 'pointer', padding: '0 4px', opacity: 0.5,
        flexShrink: 0,
      }}>×</button>
    </div>
  );
}

Object.assign(window, { Todos });
