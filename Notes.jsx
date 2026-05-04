// Notes component — freeform writing with auto-save

function emptyNote() {
  return {
    id: uid(), title: '', body: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function NoteEditor({ note, onSave, onClose, onDelete }) {
  const [form, setForm] = React.useState(note);
  const autoRef = React.useRef();

  // Auto-save every 600ms after last change
  React.useEffect(() => {
    clearTimeout(autoRef.current);
    autoRef.current = setTimeout(() => {
      onSave({ ...form, updatedAt: new Date().toISOString() });
    }, 600);
    return () => clearTimeout(autoRef.current);
  }, [form.title, form.body]);

  // Back button closes editor, not the whole Notes page
  React.useEffect(() => {
    let closedByBack = false;
    pushBackHandler(() => { closedByBack = true; onClose(); });
    return () => { if (!closedByBack) popBackHandler(); };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 200,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', fontSize: 22,
          color: 'var(--fg-muted)', cursor: 'pointer', padding: 0, lineHeight: 1,
        }}>←</button>
        <span style={{ fontSize: 12, color: 'var(--fg-muted)', flex: 1 }}>
          {form.updatedAt ? 'Saved ' + formatDate(form.updatedAt) : ''}
        </span>
        <button onClick={() => { onDelete(note.id); onClose(); }} style={{
          background: 'none', border: 'none', fontSize: 13,
          color: 'var(--fg-muted)', cursor: 'pointer', padding: '4px 8px',
        }}>Delete</button>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 60px' }}>
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Title"
          style={{
            width: '100%', border: 'none', outline: 'none', background: 'none',
            fontSize: 22, fontWeight: 700, color: 'var(--fg)', fontFamily: 'inherit',
            marginBottom: 14, padding: 0, boxSizing: 'border-box',
          }}
        />
        <textarea
          value={form.body}
          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          placeholder="Start writing…"
          style={{
            width: '100%', border: 'none', outline: 'none', background: 'none',
            fontSize: 15, color: 'var(--fg)', fontFamily: 'inherit',
            lineHeight: 1.7, resize: 'none', minHeight: '60vh',
            padding: 0, boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}

function NoteCard({ note, onClick }) {
  const preview = note.body.slice(0, 100);
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px', cursor: 'pointer',
      transition: 'background 0.15s',
    }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {note.title || 'Untitled note'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {preview || 'No content'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 8 }}>
        {formatDate(note.updatedAt || note.createdAt)}
      </div>
    </div>
  );
}

function Notes() {
  const [items, setItems] = React.useState(() => load('notes') || []);
  const [editing, setEditing] = React.useState(null);
  const [search, setSearch] = React.useState('');

  function openNew() {
    const n = emptyNote();
    setItems(prev => [n, ...prev]);
    setEditing(n);
  }

  React.useEffect(() => {
    function handler(e) { if (e.detail === 'notes') openNew(); }
    window.addEventListener('socialog:new', handler);
    return () => window.removeEventListener('socialog:new', handler);
  }, []);

  React.useEffect(() => { save('notes', items); }, [items]);

  function handleSave(note) {
    setItems(prev => {
      const idx = prev.findIndex(n => n.id === note.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = note; return next; }
      return [note, ...prev];
    });
  }

  function handleDelete(id) {
    setItems(prev => prev.filter(n => n.id !== id));
  }

  const filtered = items.filter(n =>
    !search ||
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.body.toLowerCase().includes(search.toLowerCase())
  );

  if (editing) {
    // Get the live version from items
    const live = items.find(n => n.id === editing.id) || editing;
    return (
      <NoteEditor
        note={live}
        onSave={handleSave}
        onClose={() => setEditing(null)}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '10px 14px', marginBottom: 16,
      }}>
        <span style={{ color: 'var(--fg-muted)', fontSize: 15 }}>⌕</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search notes…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 14, color: 'var(--fg)', fontFamily: 'inherit' }} />
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>§</div>
          <div style={{ fontSize: 14 }}>No notes yet</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(n => (
          <NoteCard key={n.id} note={n} onClick={() => setEditing(n)} />
        ))}
      </div>
    </div>
  );
}

function NotesPage({ onBack }) {
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

  return ReactDOM.createPortal(
    <div ref={panelRef} style={{
      position: 'fixed', inset: 0, zIndex: 190,
      background: 'var(--bg)', overflowY: 'auto',
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 4px' }}>
        <button onClick={dismiss} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--fg-muted)', fontSize: 20, lineHeight: 1, padding: 4,
        }}>←</button>
        <span style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Notes</span>
        <button onClick={() => window.dispatchEvent(new CustomEvent('socialog:new', { detail: 'notes' }))}
          style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--fg-muted)', fontSize: 24, lineHeight: 1, padding: 4 }}>+</button>
      </div>
      <Notes />
    </div>,
    document.body
  );
}

Object.assign(window, { Notes, NotesPage });
