# socialog

A minimal personal life tracker built for mobile. Everything stored locally in the browser, no accounts.

## Features

- **Bookmarks** — paste a URL to save it. Title and cover image are fetched automatically. Categorized by domain (music, movie, book, article, place, recipe), filtered by status (Want / Doing / Done). Grid and list views.
- **Tasks** — add tasks with optional color-coded categories and due dates. Bucketed by time (today, tomorrow, this week, later). Tap the category dot to cycle; tap `◷` to set a due date.
- **Routines** — daily and weekly habits with a Mon–Sun day picker, time-of-day slot, streak counter, and a monthly habit grid.
- **Notes** — freeform writing with auto-save.
- **Profile** — stats and import from Goodreads / Letterboxd.

## Stack

No build step. React 18 + Babel standalone loaded from CDN, compiled in the browser at runtime. All data in `localStorage`.

```
index.html     — app shell, tab bar, drawer, theme
utils.js       — load/save, uid, date helpers, back-button stack
Bookmarks.jsx  — link saving with auto title/image fetch
Todos.jsx      — tasks with categories and due dates
Routines.jsx   — habit tracker with streaks
Notes.jsx      — freeform notes
Home.jsx       — today's digest across all tabs
Profile.jsx    — stats and data import
Settings.jsx   — theme toggle
```

## Running locally

```sh
npx serve .
```

Or open `index.html` directly — bookmark title resolution requires an internet connection.
