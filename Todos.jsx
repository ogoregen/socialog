// Todos component — simple, clean checklist


const CAT_PALETTE = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f43f5e'];

function catColor(id, cats) {
  return cats.find(c => c.id === id)?.color ?? null;
}

function nextCat(id, cats) {
  const idx = cats.findIndex(c => c.id === id);
  if (idx === -1) return cats[0]?.id ?? null;
  if (idx === cats.length - 1) return null;
  return cats[idx + 1].id;
}

function formatDueDate(iso) {
  if (!iso) return null;
  const diff = daysDiff(iso);
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
  const diff = daysDiff(iso);
  if (diff < 0)  return 'overdue';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff < 7)  return 'week';
  return 'later';
}

function Todos() {
  const [items, setItems]           = React.useState(() => load('todos') || []);
  const [customCats, setCustomCats] = React.useState(() => load('categories') || []);
  const [input, setInput]           = React.useState('');
  const [addCat, setAddCat]         = React.useState(null);
  const [addDue, setAddDue]         = React.useState(null);
  const [catFilter, setCatFilter]   = React.useState(null);
  const [addingCat, setAddingCat]   = React.useState(false);
  const [newCatName, setNewCatName] = React.useState('');
  const [newCatColor, setNewCatColor] = React.useState(CAT_PALETTE[0]);
  const inputRef = React.useRef();
  const newCatRef = React.useRef();

  const allCats = customCats;

  React.useEffect(() => { save('todos', items); }, [items]);
  React.useEffect(() => { save('categories', customCats); }, [customCats]);

  function saveNewCat() {
    const label = newCatName.trim();
    if (!label) return;
    const id = 'custom_' + uid();
    const usedColors = allCats.map(c => c.color);
    const color = newCatColor || CAT_PALETTE.find(p => !usedColors.includes(p)) || CAT_PALETTE[customCats.length % CAT_PALETTE.length];
    setCustomCats(prev => [...prev, { id, label, color, custom: true }]);
    setNewCatName('');
    setNewCatColor(CAT_PALETTE[(customCats.length + 1) % CAT_PALETTE.length]);
    setAddingCat(false);
  }

  function deleteCustomCat(id) {
    setCustomCats(prev => prev.filter(c => c.id !== id));
  }

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
    setItems(prev => prev.map(t => t.id === id ? { ...t, category: nextCat(t.category, allCats) } : t));
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

  const usedCats = allCats.filter(c => items.some(t => t.category === c.id));

  const addColor = catColor(addCat, allCats);
  const addDueFmt = formatDueDate(addDue);

  return (
    <div style={{ padding: '20px 20px 60px' }}>
      {/* Add input */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '10px 12px', marginBottom: 20,
      }}>
        {/* Row 1: icon + text + add button */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--fg-muted)', fontSize: 14, flexShrink: 0, width: 16, textAlign: 'center', display: 'inline-block' }}>✓</span>
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
          <button onClick={addTodo} style={{
            background: 'var(--fg)', color: 'var(--bg)', border: 'none',
            borderRadius: 8, width: 30, height: 30, fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>+</button>
        </div>
        {/* Row 2: category + due date */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, paddingLeft: 24 }}>
          <button onClick={() => setAddCat(nextCat(addCat, allCats))} style={{
            height: 28, borderRadius: 8, flexShrink: 0, padding: '0 10px', cursor: 'pointer',
            background: addColor || 'var(--border)', border: 'none',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'block', flexShrink: 0,
              background: addColor ? 'rgba(255,255,255,0.8)' : 'var(--fg-muted)', opacity: addColor ? 1 : 0.5 }} />
            <span style={{ fontSize: 11, color: addColor ? 'rgba(255,255,255,0.9)' : 'var(--fg-muted)',
              whiteSpace: 'nowrap', opacity: addColor ? 1 : 0.6 }}>
              {addCat ? allCats.find(c => c.id === addCat)?.label : 'category'}
            </span>
          </button>
          <div style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center',
            padding: addDue ? '4px 6px 4px 10px' : '4px 10px',
            borderRadius: 20, gap: 5, cursor: 'pointer', ...duePillStyle(addDueFmt) }}>
            <span style={{
              fontSize: 11, fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap',
            }}>{addDueFmt ? addDueFmt.label : '◷'}</span>
            {addDue && (
              <button onClick={e => { e.stopPropagation(); setAddDue(null); }} style={{
                position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.12)', border: 'none',
                borderRadius: 4, width: 18, height: 18, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'inherit', padding: 0, flexShrink: 0,
              }}>×</button>
            )}
            <input type="date" value={addDue || ''} onChange={e => setAddDue(e.target.value || null)}
              style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
          </div>
        </div>
      </div>

      {/* Category filter pills + new category */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: addingCat ? 10 : 20, flexWrap: 'nowrap' }}>
        {usedCats.length > 0 && [null, ...usedCats].map(c => {
          const isAll = c === null;
          const active = catFilter === (isAll ? null : c.id);
          const cc = isAll ? null : c.color;
          return (
            <div key={isAll ? 'all' : c.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <button onClick={() => setCatFilter(isAll ? null : c.id)} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 5,
                background: active ? (cc || 'var(--fg)') : 'transparent',
                color: active ? '#fff' : 'var(--fg-muted)',
                borderColor: active ? (cc || 'var(--fg)') : 'var(--border)',
                transition: 'all 0.15s',
                borderTopRightRadius: (!isAll && c.custom) ? 0 : 20,
                borderBottomRightRadius: (!isAll && c.custom) ? 0 : 20,
              }}>
                {!isAll && <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
                  background: active ? 'rgba(255,255,255,0.8)' : c.color,
                }} />}
                {isAll ? 'All' : c.label}
              </button>
              {!isAll && c.custom && (
                <button onClick={() => deleteCustomCat(c.id)} style={{
                  padding: '4px 7px 4px 5px', borderRadius: '0 20px 20px 0', fontSize: 11,
                  cursor: 'pointer', border: '1px solid', borderLeft: 'none',
                  background: active ? (cc || 'var(--fg)') : 'transparent',
                  color: active ? '#fff' : 'var(--fg-muted)',
                  borderColor: active ? (cc || 'var(--fg)') : 'var(--border)',
                  transition: 'all 0.15s',
                }}>×</button>
              )}
            </div>
          );
        })}
        <button onClick={() => { setAddingCat(true); setTimeout(() => newCatRef.current?.focus(), 50); }} style={{
          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
          cursor: 'pointer', border: '1px solid var(--border)', whiteSpace: 'nowrap', flexShrink: 0,
          background: 'transparent', color: 'var(--fg-muted)', opacity: 0.5,
        }}>+ category</button>
      </div>

      {/* Inline new category form */}
      {addingCat && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 20,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <input ref={newCatRef} value={newCatName} onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveNewCat(); if (e.key === 'Escape') setAddingCat(false); }}
            placeholder="Category name…"
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--fg)', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CAT_PALETTE.map(p => (
                <button key={p} onClick={() => setNewCatColor(p)} style={{
                  width: 20, height: 20, borderRadius: '50%', background: p, border: 'none', cursor: 'pointer',
                  outline: newCatColor === p ? `2px solid ${p}` : 'none', outlineOffset: 2,
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setAddingCat(false)} style={{
                background: 'var(--border)', border: 'none', borderRadius: 8, fontSize: 11,
                color: 'var(--fg-muted)', cursor: 'pointer', padding: '6px 12px',
              }}>Cancel</button>
              <button onClick={saveNewCat} style={{
                background: newCatColor, border: 'none', borderRadius: 8, fontSize: 11,
                color: '#fff', cursor: 'pointer', padding: '6px 12px', fontWeight: 600,
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Active tasks — bucketed by time */}
      {active.length === 0 && done.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--fg-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.2 }}>✓</div>
          <div style={{ fontSize: 13, opacity: 0.5 }}>Nothing to do</div>
        </div>
      )}

      {BUCKETS.map((bucket, bi) => {
        const tasks = shownActive.filter(t => getBucket(t.dueDate) === bucket.id);
        if (!tasks.length) return null;
        return (
          <div key={bucket.id} style={{ marginTop: bi === 0 ? 0 : 32 }}>
            <div style={{
              fontSize: 11, fontWeight: 500,
              color: bucket.color || 'var(--fg-muted)', opacity: bucket.color ? 1 : 0.5,
              marginBottom: 8, paddingLeft: 2,
            }}>{bucket.label}</div>
            {tasks.map(t => (
              <TodoRow key={t.id} item={t} allCats={allCats} onToggle={toggleDone} onDelete={deleteItem} onCycleCategory={cycleCategory} onSetDueDate={setDueDate} />
            ))}
          </div>
        );
      })}

      {/* Done section */}
      {shownDone.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--fg-muted)', opacity: 0.5 }}>
              done · {shownDone.length}
            </span>
            <button onClick={clearDone} style={{
              background: 'none', border: 'none', fontSize: 11,
              color: 'var(--fg-muted)', cursor: 'pointer', opacity: 0.5,
            }}>clear</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {shownDone.map(t => (
              <TodoRow key={t.id} item={t} allCats={allCats} onToggle={toggleDone} onDelete={deleteItem} onCycleCategory={cycleCategory} onSetDueDate={setDueDate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TodoRow({ item, allCats, onToggle, onDelete, onCycleCategory, onSetDueDate }) {
  const [pressed, setPressed] = React.useState(false);
  const color    = catColor(item.category, allCats);
  const dueFmt   = formatDueDate(item.dueDate);
  const pillStyle = duePillStyle(dueFmt);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', marginBottom: 8,
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
        opacity: item.done ? 0.5 : 1,
        transform: pressed ? 'scale(0.99)' : 'scale(1)',
        transition: 'transform 0.1s, opacity 0.2s',
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    >
      {/* Checkbox */}
      <button onClick={() => onToggle(item.id)} style={{
        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
        border: '1.5px solid', cursor: 'pointer',
        background: item.done ? (color || '#22c55e') : 'transparent',
        borderColor: item.done ? (color || '#22c55e') : (color || 'var(--border)'),
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

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Due date pill */}
        <div style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center',
          padding: item.dueDate ? '5px 6px 5px 10px' : '5px 10px',
          borderRadius: 20, gap: 5, cursor: 'pointer', ...pillStyle }}>
          <span style={{
            fontSize: 11, fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>{dueFmt ? dueFmt.label : '◷'}</span>
          {item.dueDate && (
            <button onClick={e => { e.stopPropagation(); onSetDueDate(item.id, null); }} style={{
              position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.12)', border: 'none',
              borderRadius: 4, width: 18, height: 18, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'inherit', padding: 0, flexShrink: 0,
            }}>×</button>
          )}
          <input type="date" value={item.dueDate || ''} onChange={e => onSetDueDate(item.id, e.target.value || null)}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
        </div>

        {/* Category */}
        <button onClick={() => onCycleCategory(item.id)} style={{
          height: 30, borderRadius: 8, flexShrink: 0, padding: '0 10px',
          background: color || 'var(--border)', border: 'none',
          cursor: 'pointer', opacity: color ? 1 : 0.35,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'block', flexShrink: 0,
            background: color ? 'rgba(255,255,255,0.8)' : 'var(--fg-muted)' }} />
          <span style={{ fontSize: 11, color: color ? 'rgba(255,255,255,0.9)' : 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
            {item.category ? allCats.find(c => c.id === item.category)?.label : 'category'}
          </span>
        </button>

        {/* Delete */}
        <button onClick={() => onDelete(item.id)} style={{
          background: 'var(--border)', border: 'none', color: 'var(--fg-muted)',
          fontSize: 14, cursor: 'pointer', flexShrink: 0, borderRadius: 8,
          width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
      </div>
    </div>
  );
}

Object.assign(window, { Todos });
