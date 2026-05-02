# socialog

A minimal personal organizer designed for mobile. Three tabs, everything stored locally in the browser.

## Tabs

### ★ Bookmarks
Save links by pasting a URL — the page title and cover image are fetched automatically. Supports oEmbed for YouTube, Spotify, Vimeo, SoundCloud, Reddit, and TikTok. All other URLs are resolved through a CORS proxy that reads `og:title` and `og:image`. Links are categorized by domain (music, movie, book, place, recipe, product, article) and can be filtered by type and status (Want / Doing / Done).

### ✓ Tasks
Add tasks with optional color-coded categories (Work, Personal, Health, Finance, Other) and due dates. Overdue items are highlighted red, today's due date in amber. Tap the category dot on any row to cycle through categories; tap `◷` to set or change the due date.

### ○ Routines
Daily and weekly habits with a Mon–Sun day picker, time-of-day slot, streak counter, and a progress ring for today's completions.

## Stack

No build step. Single HTML file that loads React 18, Babel standalone, and Geist font from CDN. Components are separate `.jsx` files compiled in the browser at runtime. All data lives in `localStorage`.

```
index.html       — app shell, tab bar, theme variables
utils.js         — shared helpers (load/save, uid, formatDate)
Bookmarks.jsx    — link saving with auto title/image fetch
Todos.jsx        — tasks with categories and due dates
Routines.jsx     — habit tracker with streaks
Notes.jsx        — freeform notes with auto-save
tweaks-panel.jsx — floating settings panel (theme, font scale)
```

## Running locally

```sh
npx serve .
```

Or open `index.html` directly — no server needed for basic use, though the CORS proxy calls for bookmark title resolution require an internet connection.

## Data

Everything is stored in `localStorage` under the `socialog_` prefix. No accounts, no sync, no server.
