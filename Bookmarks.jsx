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
const STATUS_COLORS  = { all: 'var(--fg)', 'want to try': '#3b82f6', 'in progress': '#f59e0b', 'done': '#22c55e' };

// ── URL type inference ────────────────────────────────────────────────────────
const TYPE_RULES = [
  // Music
  { pattern: /spotify\.com|music\.apple\.com|soundcloud\.com|bandcamp\.com|last\.fm|tidal\.com|deezer\.com/, type: 'music' },
  // Movie / TV
  { pattern: /imdb\.com|letterboxd\.com|themoviedb\.org|netflix\.com|hulu\.com|hbo\.com|disneyplus\.com|trakt\.tv/, type: 'movie' },
  // Book
  { pattern: /goodreads\.com|books\.google\.com|openlibrary\.org|audible\.com|librarything\.com/, type: 'book' },
  // Place
  { pattern: /maps\.google\.com|maps\.app\.goo\.gl|share\.google|goo\.gl\/maps|yelp\.com|tripadvisor\.com|foursquare\.com|opentable\.com|maps\.apple\.com/, type: 'place' },
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

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function parseTitleFromHtml(html) {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"'<>]+)["']/i)
               || html.match(/<meta[^>]+content=["']([^"'<>]+)["'][^>]+property=["']og:title["']/i);
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"'<>]+)["']/i)
               || html.match(/<meta[^>]+content=["']([^"'<>]+)["'][^>]+property=["']og:image["']/i);
  const coverUrl = ogImage ? decodeHtmlEntities(ogImage[1].trim()) : '';

  if (ogTitle) {
    return { title: decodeHtmlEntities(ogTitle[1].trim()).slice(0, 150), coverUrl };
  }

  const tMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (tMatch) {
    const title = decodeHtmlEntities(tMatch[1].trim())
      .replace(/\s*[|\-–—·•]\s*.{2,60}$/, '')
      .slice(0, 150);
    return { title, coverUrl };
  }
  return null;
}

// ── Smart title extraction from URL ──────────────────────────────────────────
function extractSmartMeta(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    if (/youtube\.com|youtu\.be/.test(host))
      return { fetchUrl: `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, parseOembed: true };

    if (/spotify\.com/.test(host))
      return { fetchUrl: `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, parseOembed: true };

    if (/vimeo\.com/.test(host))
      return { fetchUrl: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, parseOembed: true };

    if (/soundcloud\.com/.test(host))
      return { fetchUrl: `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`, parseOembed: true };

    if (/reddit\.com/.test(host))
      return { fetchUrl: `https://www.reddit.com/oembed?url=${encodeURIComponent(url)}`, parseOembed: true };

    if (/tiktok\.com/.test(host))
      return { fetchUrl: `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, parseOembed: true };

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

  // General proxy-based fetch for all other domains — try two proxies in sequence
  const proxyFetchers = [
    async () => {
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(7000) });
      if (!r.ok) return null;
      return (await r.json()).contents || null;
    },
    async () => {
      const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(7000) });
      if (!r.ok) return null;
      return r.text();
    },
  ];

  for (const fetcher of proxyFetchers) {
    try {
      const html = await fetcher();
      if (!html) continue;
      const parsed = parseTitleFromHtml(html);
      if (parsed?.title) return parsed;
    } catch (e) {}
  }

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
      borderRadius: 12, padding: '10px 14px', marginBottom: 16,
    }}>
      <span style={{ color: 'var(--fg-muted)', fontSize: 14, flexShrink: 0 }}>★</span>
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
      <button type="submit" disabled={loading} style={{
        background: 'var(--fg)', color: 'var(--bg)', border: 'none',
        borderRadius: 8, width: 30, height: 30, fontSize: loading ? 14 : 18, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        opacity: loading ? 0.5 : 1,
      }}>{loading ? '…' : '+'}</button>
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
                  background: form.status === s ? STATUS_COLORS[s] : 'transparent',
                  color: form.status === s ? '#fff' : 'var(--fg)',
                  borderColor: form.status === s ? STATUS_COLORS[s] : 'var(--border)',
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
        background: STATUS_COLORS[bm.status], color: '#fff',
        fontWeight: 600,
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
  const [filter, setFilter]         = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');


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
    return true;
  });

  return (
    <div style={{ padding: '16px 16px 40px' }}>
      <QuickAdd onAdd={handleAdd} />

      {/* Type filter pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 4 }}>
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
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {[['all','All'], ['want to try','Want'], ['in progress','Doing'], ['done','Done']].map(([key, label]) => {
          const active = filter === key;
          const cc = STATUS_COLORS[key];
          return (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            cursor: 'pointer', border: '1px solid',
            background: active ? cc : 'transparent',
            color: active ? '#fff' : 'var(--fg-muted)',
            borderColor: active ? cc : 'var(--border)',
            transition: 'all 0.15s',
          }}>{label}</button>
        );})}
      </div>

      {/* Cards */}
      <div>
        {filtered.map(bm => (
          <BookmarkCard key={bm.id} bm={bm} onEdit={b => setModal(b)} onDelete={handleDelete} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--fg-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>★</div>
          <div style={{ fontSize: 14 }}>Paste a link above to save it</div>
        </div>
      )}

      {modal && <BookmarkModal bm={modal} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
}

Object.assign(window, { Bookmarks });
