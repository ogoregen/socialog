// Archive — cover grid (movie/music) + list rows (everything else), ratings, log dates

const BOOKMARK_TYPES = {
  music:   { label: 'Music',   icon: '♪', fields: ['artist','genre','year'] },
  movie:   { label: 'Movie',   icon: '▶', fields: ['director','year','genre'] },
  book:    { label: 'Book',    icon: '◻', fields: ['author','genre','year'] },
  article: { label: 'Article', icon: '§', fields: ['source','author'] },
  place:   { label: 'Place',   icon: '◈', fields: ['location','cuisine','hours'] },
  recipe:  { label: 'Recipe',  icon: '✦', fields: ['cuisine','time','servings'] },
  other:   { label: 'Other',   icon: '◇', fields: ['source','category'] },
};

const STATUS_OPTIONS = ['want to try', 'in progress', 'done'];
const STATUS_LABELS  = { 'want to try': 'Want', 'in progress': 'Doing', 'done': 'Done' };
const STATUS_COLORS  = { all: 'var(--fg)', 'want to try': '#3b82f6', 'in progress': '#f59e0b', 'done': '#22c55e' };

// ── URL type inference ────────────────────────────────────────────────────────
const TYPE_RULES = [
  { pattern: /spotify\.com|music\.apple\.com|soundcloud\.com|bandcamp\.com|last\.fm|tidal\.com|deezer\.com/, type: 'music' },
  { pattern: /imdb\.com|letterboxd\.com|themoviedb\.org|netflix\.com|hulu\.com|hbo\.com|disneyplus\.com|trakt\.tv/, type: 'movie' },
  { pattern: /goodreads\.com|books\.google\.com|openlibrary\.org|audible\.com|librarything\.com/, type: 'book' },
  { pattern: /maps\.google\.com|maps\.app\.goo\.gl|share\.google|goo\.gl\/maps|yelp\.com|tripadvisor\.com|foursquare\.com|opentable\.com|maps\.apple\.com/, type: 'place' },
  { pattern: /allrecipes\.com|food\.com|seriouseats\.com|bonappetit\.com|epicurious\.com|cooking\.nytimes\.com|tasty\.co/, type: 'recipe' },
  { pattern: /amazon\.com|etsy\.com|shopify\.com|ebay\.com|bestbuy\.com|walmart\.com|shop\./, type: 'other' },
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
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
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
  if (ogTitle) return { title: decodeHtmlEntities(ogTitle[1].trim()).slice(0, 150), coverUrl };
  const tMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (tMatch) {
    const title = decodeHtmlEntities(tMatch[1].trim()).replace(/\s*[|\-–—·•]\s*.{2,60}$/, '').slice(0, 150);
    return { title, coverUrl };
  }
  return null;
}

function abortAfter(ms) {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function promiseAny(promises) {
  return new Promise((resolve, reject) => {
    let remaining = promises.length;
    const errors = [];
    if (!remaining) { reject(errors); return; }
    promises.forEach((p, i) => {
      Promise.resolve(p).then(resolve).catch(err => {
        errors[i] = err;
        if (--remaining === 0) reject(errors);
      });
    });
  });
}

function extractSmartMeta(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (/youtube\.com|youtu\.be/.test(host))   return { fetchUrl: `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, parseOembed: true };
    if (/spotify\.com/.test(host))              return { fetchUrl: `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, parseOembed: true };
    if (/vimeo\.com/.test(host))                return { fetchUrl: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, parseOembed: true };
    if (/soundcloud\.com/.test(host))           return { fetchUrl: `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`, parseOembed: true };
    if (/reddit\.com/.test(host))               return { fetchUrl: `https://www.reddit.com/oembed?url=${encodeURIComponent(url)}`, parseOembed: true };
    if (/tiktok\.com/.test(host))               return { fetchUrl: `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, parseOembed: true };
  } catch (e) {}
  return null;
}

async function fetchGoodreadsBook(url) {
  const match = url.match(/goodreads\.com\/book\/show\/\d+-([a-z0-9-]+)/i);
  if (!match) return null;
  const query = match[1].replace(/-/g, ' ').trim();
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(query)}&maxResults=1`,
      { signal: abortAfter(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items && data.items[0];
    if (!item) return null;
    const info = item.volumeInfo;
    const title    = info.title || query;
    const coverUrl = ((info.imageLinks && info.imageLinks.thumbnail) || '')
                       .replace('http:', 'https:').replace('zoom=1', 'zoom=0');
    const author   = (info.authors && info.authors[0]) || '';
    const year     = (info.publishedDate || '').slice(0, 4);
    return { title, coverUrl, meta: { author, year } };
  } catch (e) { return null; }
}

async function fetchSmartTitle(url) {
  if (/goodreads\.com/.test(url)) {
    const result = await fetchGoodreadsBook(url);
    if (result) return result;
  }
  const smart = extractSmartMeta(url);
  if (smart && smart.parseOembed) {
    try {
      const res = await fetch(smart.fetchUrl, { signal: abortAfter(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data.title) return { title: data.title, coverUrl: data.thumbnail_url || '' };
      }
    } catch (e) {}
  }
  const tryProxy = async (fetcher) => {
    const html = await fetcher();
    if (!html) throw new Error('empty');
    const parsed = parseTitleFromHtml(html);
    if (!parsed?.title) throw new Error('no title');
    return parsed;
  };
  try {
    return await promiseAny([
      tryProxy(async () => { const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: abortAfter(5000) }); return r.ok ? (await r.json()).contents || null : null; }),
      tryProxy(async () => { const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, { signal: abortAfter(5000) }); return r.ok ? r.text() : null; }),
    ]);
  } catch (e) {}
  return null;
}

function emptyBookmark(type = 'article', url = '') {
  return {
    id: uid(), type, title: '', url, coverUrl: '',
    tags: '', notes: '', status: 'want to try', rating: 0,
    meta: {}, createdAt: new Date().toISOString(),
  };
}

function formatLogDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'logged today';
  const opts = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return 'logged ' + d.toLocaleDateString('en-US', opts);
}

// ── Quick paste bar ───────────────────────────────────────────────────────────
function QuickAdd({ onPreview }) {
  const [url, setUrl]         = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const savingRef = React.useRef(false);

  async function doFetch(raw) {
    if (savingRef.current) return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
    savingRef.current = true;
    setLoading(true);
    const bm = emptyBookmark(inferType(normalized), normalized);
    bm.title = bm.meta.source = extractDomain(normalized);
    const fetchPromise = fetchSmartTitle(normalized);
    setLoading(false);
    savingRef.current = false;
    onPreview(bm, fetchPromise, () => setUrl(''));
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').trim();
    if (/^https?:\/\//i.test(pasted) || /^[\w-]+\.\w{2,}\//.test(pasted)) {
      setUrl(pasted);
      doFetch(pasted);
    }
  }

  return (
    <form onSubmit={e => { e.preventDefault(); doFetch(url); }} style={{
      display: 'flex', gap: 8, alignItems: 'center',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '10px 12px', marginBottom: 16,
    }}>
      <span style={{ color: 'var(--fg-muted)', fontSize: 14, flexShrink: 0 }}>▣</span>
      <input
        value={url} onChange={e => setUrl(e.target.value)} onPaste={handlePaste}
        placeholder="Paste a link to save it…"
          inputMode="url" autoCorrect="off" autoCapitalize="none" spellCheck={false} autoComplete="off"
        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 16, color: 'var(--fg)', fontFamily: 'inherit' }}
      />
      <button type="submit" disabled={loading} style={{
        background: 'var(--fg)', color: 'var(--bg)', border: 'none',
        borderRadius: 8, width: 30, height: 30, fontSize: loading ? 14 : 18,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        opacity: loading ? 0.5 : 1,
      }}>{loading ? '…' : '+'}</button>
    </form>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function BookmarkModal({ bm, isNew, fetchPromise, onSave, onClose }) {
  const [form, setForm]         = React.useState(bm);
  const [fetching, setFetching] = React.useState(!!fetchPromise);

  React.useEffect(() => {
    if (!fetchPromise) return;
    let alive = true;
    fetchPromise.then(result => {
      if (!alive) return;
      if (result?.title) setForm(f => ({ ...f, title: result.title, coverUrl: result.coverUrl || f.coverUrl, meta: result.meta ? { ...f.meta, ...result.meta } : f.meta }));
      setFetching(false);
    }).catch(() => { if (alive) setFetching(false); });
    return () => { alive = false; };
  }, []);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }
  function setMeta(field, val) { setForm(f => ({ ...f, meta: { ...f.meta, [field]: val } })); }

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)',
    fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 4, display: 'block',
  };

  return (
    <BottomSheet onClose={onClose} maxHeight="90vh">
      {dismiss => (<>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>{isNew ? 'Add to archive' : 'Edit'}</span>
          <button onClick={dismiss} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--fg-muted)', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Type */}
          <div>
            <span style={labelStyle}>Type</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(BOOKMARK_TYPES).map(([key, t]) => (
                <button key={key} onClick={() => set('type', key)} style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid',
                  background: form.type === key ? 'var(--fg)' : 'transparent',
                  color: form.type === key ? 'var(--bg)' : 'var(--fg)',
                  borderColor: form.type === key ? 'var(--fg)' : 'var(--border)', transition: 'all 0.15s',
                }}>{t.icon} {t.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Title {fetching && <span style={{ opacity: 0.4, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— fetching…</span>}</label>
            <input style={{ ...inputStyle, opacity: fetching ? 0.5 : 1 }} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Title…" />
          </div>

          <div>
            <label style={labelStyle}>URL</label>
            <input style={inputStyle} value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://…" inputMode="url" autoCorrect="off" autoCapitalize="none" spellCheck={false} autoComplete="off" />
          </div>

          <div>
            <label style={labelStyle}>Cover image URL</label>
            <input style={inputStyle} value={form.coverUrl} onChange={e => set('coverUrl', e.target.value)} placeholder="https://image.jpg" inputMode="url" autoCorrect="off" autoCapitalize="none" spellCheck={false} autoComplete="off" />
          </div>

          {BOOKMARK_TYPES[form.type]?.fields.map(field => (
            <div key={field}>
              <label style={labelStyle}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
              <input style={inputStyle} value={form.meta[field] || ''} onChange={e => setMeta(field, e.target.value)} placeholder={field + '…'} />
            </div>
          ))}

          {/* Status */}
          <div>
            <span style={labelStyle}>Status</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => set('status', s)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: '1px solid', flex: 1,
                  background: form.status === s ? STATUS_COLORS[s] : 'transparent',
                  color: form.status === s ? '#fff' : 'var(--fg)',
                  borderColor: form.status === s ? STATUS_COLORS[s] : 'var(--border)', transition: 'all 0.15s',
                }}>{STATUS_LABELS[s]}</button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <span style={labelStyle}>Rating</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => set('rating', form.rating === n ? 0 : n)} style={{
                  background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', padding: '0 2px', lineHeight: 1,
                  color: n <= (form.rating || 0) ? '#f59e0b' : 'var(--border)', transition: 'color 0.1s',
                }}>★</button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Tags (comma-separated)</label>
            <input style={inputStyle} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="tag1, tag2…" autoCorrect="off" autoCapitalize="none" spellCheck={false} />
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Your thoughts…" />
          </div>

          <button onClick={() => onSave(form)} style={{
            width: '100%', padding: '14px', borderRadius: 12, background: 'var(--fg)',
            color: 'var(--bg)', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4,
          }}>{isNew ? 'Add to archive' : 'Save changes'}</button>
        </div>
      </>)}
    </BottomSheet>
  );
}

// ── List card ─────────────────────────────────────────────────────────────────
function ListCard({ bm, onEdit, onDelete }) {
  const typeInfo = BOOKMARK_TYPES[bm.type] || BOOKMARK_TYPES.article;
  const isDone   = bm.status === 'done';
  const subtitle = bm.meta?.artist || bm.meta?.author || bm.meta?.director || bm.meta?.source || typeInfo.label;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      {/* Thumbnail */}
      <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--fg-muted)' }}>
        {bm.coverUrl
          ? <img src={bm.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ opacity: 0.4 }}>{typeInfo.icon}</span>}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {bm.url
          ? <a href={bm.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg)', textDecoration: 'none' }}>
              <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bm.title || '(untitled)'}</div>
            </a>
          : <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bm.title || '(untitled)'}</div>
        }
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {bm.rating > 0 && <span style={{ fontSize: 11, color: '#f59e0b', letterSpacing: '-0.5px' }}>{'★'.repeat(bm.rating)}</span>}
          <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{isDone && bm.doneAt ? formatLogDate(bm.doneAt) : subtitle}</span>
        </div>
      </div>

      <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: STATUS_COLORS[bm.status], color: '#fff', fontWeight: 700, flexShrink: 0 }}>
        {STATUS_LABELS[bm.status]}
      </span>

      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button onClick={() => onEdit(bm)} style={{ background: 'var(--border)', border: 'none', borderRadius: 7, fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
        <button onClick={() => onDelete(bm.id)} style={{ background: 'var(--border)', border: 'none', borderRadius: 7, fontSize: 14, color: 'var(--fg-muted)', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>
    </div>
  );
}

// ── Grid card ─────────────────────────────────────────────────────────────────
// movie = portrait cover (150%), music = square cover (100%),
// everything else = compact list row that flows into the masonry column.
function GridCard({ bm, onEdit, onDelete }) {
  const typeInfo = BOOKMARK_TYPES[bm.type] || BOOKMARK_TYPES.article;
  const isDone   = bm.status === 'done';
  const subtitle = bm.meta?.artist || bm.meta?.author || bm.meta?.director || bm.meta?.source || typeInfo.label;

  if (bm.type !== 'movie' && bm.type !== 'music') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--fg-muted)' }}>
          {bm.coverUrl
            ? <img src={bm.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ opacity: 0.4 }}>{typeInfo.icon}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {bm.url
            ? <a href={bm.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg)', textDecoration: 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bm.title || '(untitled)'}</div>
              </a>
            : <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bm.title || '(untitled)'}</div>
          }
          <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 1 }}>{isDone && bm.doneAt ? formatLogDate(bm.doneAt) : subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button onClick={() => onEdit(bm)} style={{ background: 'var(--border)', border: 'none', borderRadius: 6, fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
          <button onClick={() => onDelete(bm.id)} style={{ background: 'var(--border)', border: 'none', borderRadius: 6, fontSize: 13, color: 'var(--fg-muted)', cursor: 'pointer', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      </div>
    );
  }

  const aspectPct = bm.type === 'music' ? '100%' : '150%';

  return (
    <div>
      {/* Cover */}
      <div style={{ position: 'relative', paddingTop: aspectPct, borderRadius: 10, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 8 }}>
        {bm.coverUrl
          ? <img src={bm.coverUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, opacity: 0.2 }}>{typeInfo.icon}</div>
        }
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <span style={{ background: STATUS_COLORS[bm.status], color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 8, padding: '3px 7px' }}>
            {STATUS_LABELS[bm.status]}
          </span>
        </div>
        <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={() => onEdit(bm)} style={{ background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: 6, fontSize: 11, color: '#fff', cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
          <button onClick={() => onDelete(bm.id)} style={{ background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: 6, fontSize: 14, color: '#fff', cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      </div>

      {/* Info */}
      {bm.url
        ? <a href={bm.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg)', textDecoration: 'none' }}>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{bm.title || '(untitled)'}</div>
          </a>
        : <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{bm.title || '(untitled)'}</div>
      }
      {bm.rating > 0 && (
        <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 2, letterSpacing: '-0.5px' }}>
          {'★'.repeat(bm.rating)}{'☆'.repeat(5 - bm.rating)}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
        {isDone && bm.doneAt ? formatLogDate(bm.doneAt) : subtitle}
      </div>
    </div>
  );
}

// ── Main Bookmarks view ───────────────────────────────────────────────────────
function Bookmarks() {
  const [items, setItems]           = React.useState(() => load('bookmarks') || []);
  const [modal, setModal]           = React.useState(null);
  const [filter, setFilter]         = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [view, setView]             = React.useState(() => localStorage.getItem('socialog_bm_view') || 'grid');

  function toggleView() {
    const next = view === 'grid' ? 'list' : 'grid';
    setView(next);
    localStorage.setItem('socialog_bm_view', next);
  }

  React.useEffect(() => { save('bookmarks', items); }, [items]);

  function closeModal() {
    if (modal && modal.clearFn) modal.clearFn();
    setModal(null);
  }

  function handleSave(bm) {
    const existing = items.find(b => b.id === bm.id);
    const wasNew   = !existing;
    // Track when an item first becomes "done"
    let updated = { ...bm };
    if (bm.status === 'done' && (!existing || existing.status !== 'done')) {
      updated.doneAt = updated.doneAt || new Date().toISOString();
    } else if (bm.status !== 'done') {
      updated.doneAt = null;
    }
    setItems(prev => {
      const idx = prev.findIndex(b => b.id === updated.id);
      if (idx < 0) return [updated, ...prev];
      const next = [...prev]; next[idx] = updated; return next;
    });
    closeModal();
    showToast(wasNew ? 'Saved to archive' : 'Updated');
  }

  function handleDelete(id) {
    const idx     = items.findIndex(b => b.id === id);
    const deleted = items[idx];
    setItems(prev => prev.filter(b => b.id !== id));
    showToast('Removed', 4000, {
      label: 'Undo',
      fn: () => setItems(prev => { const next = [...prev]; next.splice(Math.min(idx, next.length), 0, deleted); return next; }),
    });
  }

  const filtered = items.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false;
    if (typeFilter !== 'all' && b.type !== typeFilter) return false;
    return true;
  });

  const want  = items.filter(b => b.status === 'want to try').length;
  const doing = items.filter(b => b.status === 'in progress').length;
  const done  = items.filter(b => b.status === 'done').length;

  const modalBm = modal ? (modal.bm != null ? modal.bm : modal) : null;

  return (
    <div style={{ padding: '20px 20px 80px' }}>
      <QuickAdd onPreview={(bm, fetchPromise, clearFn) => setModal({ bm, fetchPromise, clearFn })} />

      {/* Stats + view toggle */}
      {items.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, flex: 1 }}>
            <span><strong style={{ color: STATUS_COLORS['want to try'] }}>{want}</strong> <span style={{ color: 'var(--fg-muted)' }}>want</span></span>
            <span><strong style={{ color: STATUS_COLORS['in progress'] }}>{doing}</strong> <span style={{ color: 'var(--fg-muted)' }}>doing</span></span>
            <span><strong style={{ color: STATUS_COLORS['done'] }}>{done}</strong> <span style={{ color: 'var(--fg-muted)' }}>done</span></span>
          </div>
          <button onClick={toggleView} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--fg-muted)', padding: 4, lineHeight: 1, width: 28, textAlign: 'center' }}>
            {view === 'grid' ? '▤' : '⊞'}
          </button>
        </div>
      )}

      {/* Type filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 8 }}>
        {[['all','All'], ...Object.entries(BOOKMARK_TYPES).map(([k,t]) => [k, t.label])].map(([key, label]) => (
          <button key={key} onClick={() => setTypeFilter(key)} style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
            cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap', flexShrink: 0,
            background: typeFilter === key ? 'var(--fg)' : 'transparent',
            color: typeFilter === key ? 'var(--bg)' : 'var(--fg-muted)',
            borderColor: typeFilter === key ? 'var(--fg)' : 'var(--border)', transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[['all','All'], ['want to try','Want'], ['in progress','Doing'], ['done','Done']].map(([key, label]) => {
          const active = filter === key;
          const cc = STATUS_COLORS[key];
          return (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
              cursor: 'pointer', border: '1px solid',
              background: active ? cc : 'transparent',
              color: active ? '#fff' : 'var(--fg-muted)',
              borderColor: active ? cc : 'var(--border)', transition: 'all 0.15s',
            }}>{label}</button>
          );
        })}
      </div>

      {/* Cards */}
      {view === 'grid'
        ? <div style={{ columnCount: 2, columnGap: 12 }}>
            {filtered.map(bm => (
              <div key={bm.id} style={{ breakInside: 'avoid', display: 'block', marginBottom: (bm.type === 'movie' || bm.type === 'music') ? 20 : 0 }}>
                <GridCard bm={bm} onEdit={b => setModal(b)} onDelete={handleDelete} />
              </div>
            ))}
          </div>
        : <div>
            {filtered.map(bm => <ListCard key={bm.id} bm={bm} onEdit={b => setModal(b)} onDelete={handleDelete} />)}
          </div>
      }

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--fg-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.2 }}>▣</div>
          <div style={{ fontSize: 13, opacity: 0.5 }}>{items.length ? 'Nothing matches' : 'Paste a link to save it'}</div>
        </div>
      )}

      {modalBm && (
        <BookmarkModal bm={modalBm} fetchPromise={modal.fetchPromise} isNew={!items.find(b => b.id === modalBm.id)} onSave={handleSave} onClose={closeModal} />
      )}
    </div>
  );
}

Object.assign(window, { Bookmarks });
