// Bookmarks component — context-aware with smart URL inference + quick-paste

const BOOKMARK_TYPES = {
  music:   { label: 'Music',   icon: '♪', fields: ['artist','genre','year'] },
  movie:   { label: 'Movie',   icon: '▶', fields: ['director','year','genre'] },
  book:    { label: 'Book',    icon: '◻', fields: ['author','genre','year'] },
  article: { label: 'Article', icon: '§', fields: ['source','author'] },
  place:   { label: 'Place',   icon: '◈', fields: ['location','cuisine','hours'] },
  recipe:  { label: 'Recipe',  icon: '✦', fields: ['cuisine','time','servings'] },
  product: { label: 'Product', icon: '◇', fields: ['brand','price','category'] },
};

const STATUS_OPTIONS = ['want to try', 'in progress', 'done'];
const STATUS_LABELS  = { 'want to try': 'Want', 'in progress': 'Doing', 'done': 'Done' };

// ── URL type inference ────────────────────────────────────────────────────────
const TYPE_RULES = [
  // Music
  { pattern: /spotify\.com|music\.apple\.com|soundcloud\.com|bandcamp\.com|last\.fm|tidal\.com|deezer\.com/, type: 'music' },
  // Movie / TV
  { pattern: /imdb\.com|letterboxd\.com|themoviedb\.org|netflix\.com|hulu\.com|hbo\.com|disneyplus\.com|trakt\.tv/, type: 'movie' },
  // Book
  { pattern: /goodreads\.com|books\.google\.com|openlibrary\.org|audible\.com|librarything\.com/, type: 'book' },
  // Place
  { pattern: /maps\.google\.com|yelp\.com|tripadvisor\.com|foursquare\.com|opentable\.com|maps\.apple\.com/, type: 'place' },
  // Recipe
  { pattern: /allrecipes\.com|food\.com|seriouseats\.com|bonappetit\.com|epicurious\.com|cooking\.nytimes\.com|tasty\.co/, type: 'recipe' },
  // Product
  { pattern: /amazon\.com|etsy\.com|shopify\.com|ebay\.com|bestbuy\.com|walmart\.com|shop\./, type: 'product' },
  // YouTube — could be music or movie, default movie
  { pattern: /youtube\.com|youtu\.be|vimeo\.com/, type: 'movie' },
];

function inferType(url) {
  if (!url) return 'article';
  try {
    const u = url.toLowerCase();
    for (const rule of TYPE_RULES) {
      if (rule.pattern.test(u)) return rule.type;
    }
  } catch (e) {}
  return 'article';
}

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch (e) {
    return url;
  }
}

// ── Smart title extraction from URL ──────────────────────────────────────────
function extractSmartMeta(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname;
    const params = u.searchParams;

    // YouTube — video title from ?v= or /shorts/
    if (/youtube\.com|youtu\.be/.test(host)) {
      const videoId = params.get('v') || path.split('/').pop();
      return { fetchUrl: `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, parseOembed: true };
    }

    // Spotify — extract from path: /track/id, /album/id, /artist/id, /playlist/id
    if (/spotify\.com/.test(host)) {
      return { fetchUrl: `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, parseOembed: true };
    }

    // Vimeo
    if (/vimeo\.com/.test(host)) {
      return { fetchUrl: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, parseOembed: true };
    }

    // SoundCloud
    if (/soundcloud\.com/.test(host)) {
      return { fetchUrl: `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`, parseOembed: true };
    }

  } catch (e) {}
  return null;
}

async function fetchSmartTitle(url) {
  const smart = extractSmartMeta(url);

  // Try oEmbed first (no proxy needed, CORS-friendly)
  if (smart?.parseOembed) {
    try {
      const res = await fetch(smart.fetchUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data.title) return { title: data.title, coverUrl: data.thumbnail_url || '' };
      }
    } catch (e) {}
  }

  // Fallback: allorigins proxy for page <title>
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy, { signal: AbortSignal.timeout(6000) });
    const data = await res.json();
    const match = data.contents?.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (match) {
      // Clean up common title suffixes
      let title = match[1].trim()
        .replace(/\s*[|\-–—]\s*(YouTube|Spotify|Netflix|IMDb|Goodreads|Amazon|Letterboxd).*$/i, '')
        .slice(0, 120);
      return { title, coverUrl: '' };
    }
  } catch (e) {}

  return null;
}

function emptyBookmark(type = 'article', url = '') {
  return {
    id: uid(), type, title: '', url, coverUrl: '',
    tags: '', notes: '', status: 'want to try',
    meta: {}, createdAt: new Date().toISOString(),
  };
}

// ── Quick paste bar ───────────────────────────────────────────────────────────
function QuickAdd({ onAdd }) {
  const [url, setUrl]         = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const savingRef = React.useRef(false); // guard against double-save
  const inputRef  = React.useRef();

  async function doSave(raw) {
    if (savingRef.current) return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;

    savingRef.current = true;
    setLoading(true);
    setUrl('');

    const type   = inferType(normalized);
    const domain = extractDomain(normalized);
    const result = await fetchSmartTitle(normalized);

    const bm = emptyBookmark(type, normalized);
    bm.title    = result?.title    || domain;
    bm.coverUrl = result?.coverUrl || '';
    bm.meta.source = domain;

    onAdd(bm);
    setLoading(false);
    savingRef.current = false;
    inputRef.current?.focus();
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').trim();
    if (/^https?:\/\//i.test(pasted) || /^[\w-]+\.\w{2,}\//.test(pasted)) {
      e.preventDefault();
      doSave(pasted);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    doSave(url);
  }

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex', gap: 8, alignItems: 'center',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '10px 14px',
    }}>
      <span style={{ color: 'var(--fg-muted)', fontSize: 14, flexShrink: 0 }}>⊕</span>
      <input
        ref={inputRef}
        value={url}
        onChange={e => setUrl(e.target.value)}
        onPaste={handlePaste}
        placeholder="Paste a link to save it…"
        style={{
          flex: 1, background: 'none', border: 'none', outline: 'none',
          fontSize: 14, color: 'var(--fg)', fontFamily: 'inherit',
        }}
      />
      {loading
        ? <span style={{ fontSize: 12, color: 'var(--fg-muted)', flexShrink: 0 }}>saving…</span>
        : url && (
          <button type="submit" style={{
            background: 'var(--fg)', color: 'var(--bg)', border: 'none',
            borderRadius: 7, padding: '4px 10px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', flexShrink: 0,
          }}>Save</button>
        )
      }
    </form>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function BookmarkModal({ bm, onSave, onClose }) {
  const [form, setForm] = React.useState(bm);
  const typeInfo = BOOKMARK_TYPES[form.type];

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }
  function setMeta(field, val) { setForm(f => ({ ...f, meta: { ...f.meta, [field]: val } })); }

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)',
    fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 4, display: 'block',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200,
      display: 'flex', alignItems: 'flex-end',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg)', borderRadius: '20px 20px 0 0', width: '100%',
        maxHeight: '90vh', overflowY: 'auto', padding: '0 0 40px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }}></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Edit bookmark</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--fg-muted)', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Type picker */}
          <div>
            <span style={labelStyle}>Type</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(BOOKMARK_TYPES).map(([key, t]) => (
                <button key={key} onClick={() => set('type', key)} style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: '1px solid',
                  background: form.type === key ? 'var(--fg)' : 'transparent',
                  color: form.type === key ? 'var(--bg)' : 'var(--fg)',
                  borderColor: form.type === key ? 'var(--fg)' : 'var(--border)',
                  transition: 'all 0.15s',
                }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Title</label>
            <input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Title…" />
          </div>

          <div>
            <label style={labelStyle}>URL</label>
            <input style={inputStyle} value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://…" />
          </div>

          <div>
            <label style={labelStyle}>Cover image URL</label>
            <input style={inputStyle} value={form.coverUrl} onChange={e => set('coverUrl', e.target.value)} placeholder="https://image.jpg" />
          </div>

          {BOOKMARK_TYPES[form.type]?.fields.map(field => (
            <div key={field}>
              <label style={labelStyle}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
              <input style={inputStyle} value={form.meta[field] || ''} onChange={e => setMeta(field, e.target.value)} placeholder={field + '…'} />
            </div>
          ))}

          <div>
            <span style={labelStyle}>Status</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => set('status', s)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: '1px solid', flex: 1,
                  background: form.status === s ? 'var(--fg)' : 'transparent',
                  color: form.status === s ? 'var(--bg)' : 'var(--fg)',
                  borderColor: form.status === s ? 'var(--fg)' : 'var(--border)',
                  transition: 'all 0.15s',
                }}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Tags (comma-separated)</label>
            <input style={inputStyle} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="tag1, tag2…" />
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Your thoughts…" />
          </div>

          <button onClick={() => onSave(form)} style={{
            width: '100%', padding: '14px', borderRadius: 12, background: 'var(--fg)',
            color: 'var(--bg)', border: 'none', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', marginTop: 4,
          }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Card (list only) ──────────────────────────────────────────────────────────
function BookmarkCard({ bm, onEdit, onDelete }) {
  const typeInfo = BOOKMARK_TYPES[bm.type] || BOOKMARK_TYPES.article;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0', borderBottom: '1px solid var(--border)',
    }}>
      {/* Icon or tiny cover */}
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
        background: 'var(--surface)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: 'var(--fg-muted)',
      }}>
        {bm.coverUrl
          ? <img src={bm.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : typeInfo.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {bm.url ? (
          <a href={bm.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg)', textDecoration: 'none' }}>
            <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bm.title || '(untitled)'}
            </div>
          </a>
        ) : (
          <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {bm.title || '(untitled)'}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
          {typeInfo.label} · {bm.meta?.source || bm.meta?.artist || bm.meta?.author || formatDate(bm.createdAt)}
        </div>
      </div>

      <span style={{
        fontSize: 10, padding: '2px 7px', borderRadius: 20, flexShrink: 0,
        background: bm.status === 'done' ? 'var(--fg)' : 'var(--surface)',
        color: bm.status === 'done' ? 'var(--bg)' : 'var(--fg-muted)',
        border: '1px solid var(--border)', fontWeight: 600,
      }}>
        {STATUS_LABELS[bm.status]}
      </span>

      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button onClick={() => onEdit(bm)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--fg-muted)', cursor: 'pointer', padding: '2px 4px' }}>Edit</button>
        <button onClick={() => onDelete(bm.id)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--fg-muted)', cursor: 'pointer', padding: '2px 4px' }}>×</button>
      </div>
    </div>
  );
}

// ── Main Bookmarks view ───────────────────────────────────────────────────────
function Bookmarks() {
  const [items, setItems]       = React.useState(() => load('bookmarks') || []);
  const [modal, setModal]       = React.useState(null);
  const [filter, setFilter]     = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [search, setSearch]     = React.useState('');


  // Listen for new event from header + button
  React.useEffect(() => {
    function handler(e) {
      if (e.detail === 'bookmarks') setModal(emptyBookmark());
    }
    window.addEventListener('socialog:new', handler);
    return () => window.removeEventListener('socialog:new', handler);
  }, []);

  React.useEffect(() => { save('bookmarks', items); }, [items]);

  function handleAdd(bm) {
    setItems(prev => [bm, ...prev]);
  }

  function handleSave(bm) {
    setItems(prev => {
      const idx = prev.findIndex(b => b.id === bm.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = bm; return next; }
      return [bm, ...prev];
    });
    setModal(null);
  }

  function handleDelete(id) {
    setItems(prev => prev.filter(b => b.id !== id));
  }

  const filtered = items.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false;
    if (typeFilter !== 'all' && b.type !== typeFilter) return false;
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) &&
        !(b.notes || '').toLowerCase().includes(search.toLowerCase()) &&
        !(b.tags || '').toLowerCase().includes(search.toLowerCase()) &&
        !(b.url || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Quick-add bar */}
      <div style={{ padding: '12px 16px 0' }}>
        <QuickAdd onAdd={handleAdd} />
      </div>

      {/* Search */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '8px 14px' }}>
          <span style={{ color: 'var(--fg-muted)', fontSize: 14 }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 13, color: 'var(--fg)', fontFamily: 'inherit' }} />

        </div>
      </div>

      {/* Type filter pills */}
      <div style={{ padding: '10px 16px 0', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[['all','All'], ...Object.entries(BOOKMARK_TYPES).map(([k,t]) => [k, t.label])].map(([key, label]) => (
          <button key={key} onClick={() => setTypeFilter(key)} style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap', flexShrink: 0,
            background: typeFilter === key ? 'var(--fg)' : 'transparent',
            color: typeFilter === key ? 'var(--bg)' : 'var(--fg)',
            borderColor: typeFilter === key ? 'var(--fg)' : 'var(--border)',
            transition: 'all 0.15s',
          }}>
            {key !== 'all' ? BOOKMARK_TYPES[key]?.icon + ' ' : ''}{label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div style={{ padding: '8px 16px 4px', display: 'flex', gap: 6 }}>
        {[['all','All'], ['want to try','Want'], ['in progress','Doing'], ['done','Done']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            cursor: 'pointer', border: '1px solid',
            background: filter === key ? 'var(--fg)' : 'transparent',
            color: filter === key ? 'var(--bg)' : 'var(--fg-muted)',
            borderColor: filter === key ? 'var(--fg)' : 'var(--border)',
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* Cards */}
      <div style={{ padding: '0 16px' }}>
        {filtered.map(bm => (
          <BookmarkCard key={bm.id} bm={bm} onEdit={b => setModal(b)} onDelete={handleDelete} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--fg-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>⊕</div>
          <div style={{ fontSize: 14 }}>Paste a link above to save it</div>
        </div>
      )}

      {modal && <BookmarkModal bm={modal} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
}

Object.assign(window, { Bookmarks });
