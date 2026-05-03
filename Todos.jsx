// Todos component — simple, clean checklist


const CAT_PALETTE = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f43f5e'];

const DEFAULT_CATS = [
  { id: 'work',     label: 'Work',     color: '#3b82f6', custom: true },
  { id: 'personal', label: 'Personal', color: '#a855f7', custom: true },
  { id: 'health',   label: 'Health',   color: '#22c55e', custom: true },
];

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

function formatDoneDate(iso) {
  if (!iso) return 'done';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'done today';
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  if (d.getFullYear() === now.getFullYear()) return `done ${mo} ${d.getDate()}`;
  return `done ${mo} ${d.getDate()}, ${d.getFullYear()}`;
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

function TaskModal({ allCats, onAddCat, onSave, onClose }) {
  const [text, setText]           = React.useState('');
  const [cat, setCat]             = React.useState(null);
  const [dueDate, setDueDate]     = React.useState(null);
  const [addingCat, setAddingCat] = React.useState(false);
  const [newCatName, setNewCatName]   = React.useState('');
  const [newCatColor, setNewCatColor] = React.useState(CAT_PALETTE[0]);
  const inputRef  = React.useRef();
  const newCatRef = React.useRef();

  React.useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  function saveNewCat() {
    const label = newCatName.trim();
    if (!label) return;
    const id = 'custom_' + uid();
    const usedColors = allCats.map(c => c.color);
    const color = newCatColor || CAT_PALETTE.find(p => !usedColors.includes(p)) || CAT_PALETTE[0];
    onAddCat({ id, label, color, custom: true });
    setCat(id);
    setNewCatName('');
    setNewCatColor(CAT_PALETTE[0]);
    setAddingCat(false);
  }

  const dueFmt = formatDueDate(dueDate);
  const pillSt = duePillStyle(dueFmt);

  const labelStyle = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8, display: 'block',
  };

  return (
    <BottomSheet onClose={onClose} maxHeight="85vh">
      {dismiss => (<>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>New task</span>
          <button onClick={dismiss} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--fg-muted)', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && text.trim() && onSave({ text: text.trim(), category: cat, dueDate })}
            placeholder="What needs to be done?"
            style={{ width: '100%', padding: '10px 12px', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)',
              fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
          <div>
            <span style={labelStyle}>Category</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {allCats.map(c => (
                <button key={c.id} onClick={() => setCat(cat === c.id ? null : c.id)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                  cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                  background: cat === c.id ? c.color : 'transparent',
                  color: cat === c.id ? '#fff' : 'var(--fg-muted)',
                  borderColor: cat === c.id ? c.color : 'var(--border)',
                }}>{c.label}</button>
              ))}
              {!addingCat && (
                <button onClick={() => { setAddingCat(true); setTimeout(() => newCatRef.current?.focus(), 50); }} style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                  cursor: 'pointer', border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--fg-muted)', opacity: 0.5,
                }}>+ add</button>
              )}
            </div>
            {addingCat && (
              <div style={{ marginTop: 10, background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input ref={newCatRef} value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveNewCat(); if (e.key === 'Escape') setAddingCat(false); }}
                  placeholder="Category name…"
                  style={{ background: 'none', border: 'none', outline: 'none', fontSize: 16, color: 'var(--fg)', fontFamily: 'inherit' }} />
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
          </div>
          <div>
            <span style={labelStyle}>Due date</span>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center',
              padding: dueDate ? '8px 8px 8px 14px' : '8px 14px',
              borderRadius: 20, gap: 6, cursor: 'pointer', ...pillSt }}>
              <span style={{ fontSize: 12, fontWeight: 500, pointerEvents: 'none' }}>
                {dueFmt ? dueFmt.label : 'No date'}
              </span>
              {dueDate && (
                <button onClick={e => { e.stopPropagation(); setDueDate(null); }} style={{
                  position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.12)', border: 'none',
                  borderRadius: 4, width: 18, height: 18, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'inherit', padding: 0, flexShrink: 0,
                }}>×</button>
              )}
              <input type="date" value={dueDate || ''} onChange={e => setDueDate(e.target.value || null)}
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
            </div>
          </div>
          <button
            onClick={() => text.trim() && onSave({ text: text.trim(), category: cat, dueDate })}
            style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'var(--fg)',
              color: 'var(--bg)', border: 'none', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', opacity: text.trim() ? 1 : 0.4 }}>
            Add task
          </button>
        </div>
      </>)}
    </BottomSheet>
  );
}

function Todos() {
  const [items, setItems]           = React.useState(() => load('todos') || []);
  const [customCats, setCustomCats] = React.useState(() => load('categories') || DEFAULT_CATS);
  const [modal, setModal]         = React.useState(false);
  const [catFilter, setCatFilter] = React.useState(null);

  const allCats = customCats;

  React.useEffect(() => { save('todos', items); }, [items]);
  React.useEffect(() => { save('categories', customCats); }, [customCats]);

  function addCustomCat(cat) {
    setCustomCats(prev => [...prev, cat]);
  }

  function deleteCustomCat(id) {
    setCustomCats(prev => prev.filter(c => c.id !== id));
  }

  function handleAddTask({ text, category, dueDate }) {
    setItems(prev => [{ id: uid(), text, done: false, category, dueDate, createdAt: new Date().toISOString() }, ...prev]);
    setModal(false);
    showToast('Task added');
  }

  function toggleDone(id) {
    setItems(prev => prev.map(t => {
      if (t.id !== id) return t;
      return t.done
        ? { ...t, done: false, doneAt: null }
        : { ...t, done: true,  doneAt: new Date().toISOString() };
    }));
  }

  function cycleCategory(id) {
    setItems(prev => prev.map(t => t.id === id ? { ...t, category: nextCat(t.category, allCats) } : t));
  }

  function setDueDate(id, date) {
    setItems(prev => prev.map(t => t.id === id ? { ...t, dueDate: date || null } : t));
  }

  function deleteItem(id) {
    const idx     = items.findIndex(t => t.id === id);
    const deleted = items[idx];
    setItems(prev => prev.filter(t => t.id !== id));
    showToast('Task deleted', 4000, {
      label: 'Undo',
      fn: () => setItems(prev => { const next = [...prev]; next.splice(Math.min(idx, next.length), 0, deleted); return next; }),
    });
  }

  function clearDone() {
    setItems(prev => prev.filter(t => !t.done));
    showToast('Done tasks cleared');
  }

  const active = items.filter(t => !t.done);
  const done   = items.filter(t => t.done);

  const shownActive = catFilter ? active.filter(t => t.category === catFilter) : active;
  const shownDone   = catFilter ? done.filter(t => t.category === catFilter) : done;

  return (
    <div style={{ padding: '20px 20px 60px' }}>
      {/* Add bar */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '10px 12px', marginBottom: 20,
      }}>
        <span style={{ color: 'var(--fg-muted)', fontSize: 14, flexShrink: 0, width: 16, textAlign: 'center', display: 'inline-block' }}>✓</span>
        <span onClick={() => setModal(true)} style={{ flex: 1, fontSize: 14, color: 'var(--fg-muted)', cursor: 'pointer', userSelect: 'none' }}>
          Add a task…
        </span>
        <button onClick={() => setModal(true)} style={{
          background: 'var(--fg)', color: 'var(--bg)', border: 'none',
          borderRadius: 8, width: 30, height: 30, fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>+</button>
      </div>

      {/* Category filter pills */}
      {allCats.length > 0 && (
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 20, flexWrap: 'nowrap' }}>
        {[null, ...allCats].map(c => {
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

      {modal && <TaskModal allCats={allCats} onAddCat={addCustomCat} onSave={handleAddTask} onClose={() => setModal(false)} />}
    </div>
  );
}

function TodoRow({ item, allCats, onToggle, onDelete, onCycleCategory, onSetDueDate }) {
  const color    = catColor(item.category, allCats);
  const dueFmt   = formatDueDate(item.dueDate);
  const pillStyle = duePillStyle(dueFmt);

  return (
    <div
      data-tap=""
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', marginBottom: 8,
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
        opacity: item.done ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
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
        {item.done ? (
          <span style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap', opacity: 0.6 }}>
            {formatDoneDate(item.doneAt)}
          </span>
        ) : (
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
        )}

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
