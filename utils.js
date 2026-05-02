// Shared utilities and storage helpers

const STORAGE_KEYS = {
  bookmarks: 'socialog_bookmarks',
  todos: 'socialog_todos',
  routines: 'socialog_routines',
  notes: 'socialog_notes',
  settings: 'socialog_settings',
};

function load(key) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[key]);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function save(key, data) {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
  } catch (e) {
    console.error('Storage error', e);
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dayName(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
}

function currentDayIndex() {
  return new Date().getDay(); // 0=Sun
}

function daysDiff(iso) {
  if (!iso) return null;
  const due = new Date(iso + 'T00:00:00');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((due - now) / 86400000);
}

function getMondayOf(date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

Object.assign(window, { load, save, uid, formatDate, today, dayName, currentDayIndex, daysDiff, getMondayOf, STORAGE_KEYS });
