# Plans

## Split media from bookmarks

Books, music, and movies will become their own section — a structured **media catalogue** with rich metadata (covers, ratings, search). General bookmarks (articles, recipes, places, links, other) stay as **Saves/Bookmarks** — URL-based, lightweight.

**Why:** The two have different mental models and UX needs. Mixing them makes both feel worse.

**Media types to split out:** book, music, movie  
**Bookmark types that stay:** article, recipe, place, event, other

---

## Media search (no URL required)

Replace the URL input with a real search experience for books, music, movies. User types a title, results appear with covers, tapping one pre-fills everything.

**APIs (all free, no user auth required):**
- **Music:** Discogs anonymous API — deep catalog, strong on indie/niche/vinyl, rate limited to ~25 req/min (fine with debounce)
- **Books:** Open Library — no key, returns covers and metadata
- **Movies:** TMDB — best coverage, requires a free API key (registered once, stored server-side when backend exists; or in Settings for now)

**UX:** Results show as a cover grid or list, tap to save. No URL needed. Images fetched from the API directly.

---

## AI recommendations

A **"For you"** section at the bottom of Home — same card style as the rest, seamlessly integrated. Tapping a recommendation pre-fills the Add drawer for one-tap saving.

**Model:** Claude Haiku (cheap, fast, good enough for recommendations)  
**Cost:** ~$0.002/call → ~$0.06/user/month → ~$0.72/user/year at 1 call/user/day  
**Rate limiting:** 1 recommendation refresh per user per day, enforced server-side  
**Requires:** Backend (to proxy API calls and keep the key server-side)  
**Personalization:** Based on the user's saved media — titles, types, ratings, statuses sent as context

**Not building until backend exists.** User-provided API key is not the right UX for non-technical users.

---

## Backend

Will be added eventually. Needed for:
- Proxying AI recommendation calls (keep API key server-side)
- Rate limiting
- Future features (sync, social, etc.)

Current app is a zero-backend static PWA — keep it that way until backend is ready.
