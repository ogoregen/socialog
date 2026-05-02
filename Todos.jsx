// Todos component — simple, clean checklist

function Todos() {
  const [items, setItems] = React.useState(() => load('todos') || []);
  const [input, setInput] = React.useState('');
  const inputRef = React.useRef();

  React.useEffect(() => { save('todos', items); }, [items]);

  function addTodo() {
    const text = input.trim();
    if (!text) return;
    setItems(prev => [{ id: uid(), text, done: false, createdAt: new Date().toISOString() }, ...prev]);
    setInput('');
    inputRef.current?.focus();
  }

  function toggleDone(id) {
    setItems(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function deleteItem(id) {
    setItems(prev => prev.filter(t => t.id !== id));
  }

  function clearDone() {
    setItems(prev => prev.filter(t => !t.done));
  }

  const active = items.filter(t => !t.done);
  const done   = items.filter(t => t.done);

  return (
    <div style={{ padding: '16px 16px 40px' }}>
      {/* Add input */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '10px 14px', marginBottom: 20,
      }}>
        <span style={{ color: 'var(--fg-muted)', fontSize: 14, flexShrink: 0 }}>□</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="Add a task…"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 15, color: 'var(--fg)', fontFamily: 'inherit',
          }}
        />
        <button onClick={addTodo} style={{
          background: 'var(--fg)', color: 'var(--bg)', border: 'none',
          borderRadius: 8, width: 30, height: 30, fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>+</button>
      </div>

      {/* Active tasks */}
      {active.length === 0 && done.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>✓</div>
          <div style={{ fontSize: 14 }}>Nothing to do — add a task above</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {active.map(t => (
          <TodoRow key={t.id} item={t} onToggle={toggleDone} onDelete={deleteItem} />
        ))}
      </div>

      {/* Done section */}
      {done.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
              Done ({done.length})
            </span>
            <button onClick={clearDone} style={{
              background: 'none', border: 'none', fontSize: 12,
              color: 'var(--fg-muted)', cursor: 'pointer',
            }}>Clear all</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {done.map(t => (
              <TodoRow key={t.id} item={t} onToggle={toggleDone} onDelete={deleteItem} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TodoRow({ item, onToggle, onDelete }) {
  const [pressed, setPressed] = React.useState(false);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 4px', borderBottom: '1px solid var(--border)',
        opacity: item.done ? 0.45 : 1, transition: 'opacity 0.2s',
        transform: pressed ? 'scale(0.98)' : 'scale(1)', transition: 'transform 0.1s, opacity 0.2s',
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id)}
        style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          border: '1.5px solid', cursor: 'pointer',
          background: item.done ? 'var(--fg)' : 'transparent',
          borderColor: item.done ? 'var(--fg)' : 'var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {item.done && <span style={{ color: 'var(--bg)', fontSize: 13, lineHeight: 1 }}>✓</span>}
      </button>

      {/* Text */}
      <span style={{
        flex: 1, fontSize: 15, lineHeight: 1.4, color: 'var(--fg)',
        textDecoration: item.done ? 'line-through' : 'none',
        wordBreak: 'break-word',
      }}>
        {item.text}
      </span>

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
