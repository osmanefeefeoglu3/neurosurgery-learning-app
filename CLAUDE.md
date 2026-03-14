# CLAUDE.md — Neurosurgery Learning App

This file provides guidance for AI assistants working on this codebase.

---

## Project Overview

A Progressive Web App (PWA) for neurosurgery education. Users can browse step-by-step surgical procedures, log their case experience, and explore an interactive anatomy atlas. The application is a full-stack Node.js app with a vanilla JavaScript frontend and JSON file-based persistence.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >= 18 |
| Backend | Express.js v4 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Database | JSON file (`data.json`) — no external DB |
| Frontend | Vanilla HTML5 / CSS3 / JavaScript (no framework) |
| PWA | Service Worker + Web App Manifest |

---

## Directory Structure

```
neurosurgery-learning-app/
├── server.js           # Express app entry point (port 3000)
├── database.js         # JSON file DB abstraction layer
├── data.json           # Main data store (procedures, users, caseLogs)
├── middleware/
│   └── auth.js         # JWT middleware (authMiddleware, optionalAuth, generateToken)
├── routes/
│   ├── auth.js         # POST /api/auth/register|login, GET /api/auth/me
│   ├── caselogs.js     # CRUD /api/caselogs (auth-protected)
│   └── atlas.js        # GET /api/atlas/regions, /search (public)
├── data/
│   └── anatomy-atlas.json  # Static anatomical reference data (read-only)
└── public/             # Static frontend (served directly)
    ├── index.html      # SPA entry point
    ├── app.js          # All frontend logic (~1,343 lines)
    ├── styles.css      # All styles (~900 lines, CSS custom properties)
    ├── manifest.json   # PWA manifest
    ├── sw.js           # Service Worker (cache-first static, network-first API)
    └── icons/          # SVG icons (192, 512)
```

---

## Development Setup

```bash
npm install
npm start        # or: npm run dev
# App available at http://localhost:3000
```

No build step needed. The frontend is plain HTML/CSS/JS served statically.

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Server listen port |
| `JWT_SECRET` | `neurosurg-dev-secret-2026` | JWT signing key — **change in production** |

---

## API Endpoints

### Authentication (Public)
- `POST /api/auth/register` — Create account (username, email, password min 6 chars, role, specialization)
- `POST /api/auth/login` — Login (username, password) → returns JWT
- `GET /api/auth/me` — Current user profile (requires auth)

### Procedures (Public read, auth for write)
- `GET /api/procedures` — List all (optional auth)
- `GET /api/procedures/:id` — Single procedure
- `GET /api/categories` — All categories
- `POST /api/procedures` — Create (auth required)
- `PUT /api/procedures/:id` — Update (auth required)
- `DELETE /api/procedures/:id` — Delete (auth required)

### Case Logs (Auth required for all)
- `GET /api/caselogs` — User's logs (supports `search`, `startDate`, `endDate` query params)
- `GET /api/caselogs/stats` — Aggregated stats (totals, by role/category/month)
- `GET /api/caselogs/:id` — Single log
- `POST /api/caselogs` — Create log
- `PUT /api/caselogs/:id` — Update log
- `DELETE /api/caselogs/:id` — Delete log

### Anatomy Atlas (Public)
- `GET /api/atlas/regions` — All regions
- `GET /api/atlas/regions/:regionId` — Region with subregions
- `GET /api/atlas/regions/:regionId/:subregionId` — Subregion detail
- `GET /api/atlas/search?q=...` — Full-text search with relevance scoring

---

## Database Layer (`database.js`)

The app uses a simple JSON file (`data.json`) instead of a relational or document database.

**Key functions:**
- `readDB()` / `writeDB(data)` — Synchronous file I/O
- `db.procedures.*` — CRUD + search/filter
- `db.users.*` — Register, lookup by username/email/id
- `db.caseLogs.*` — User-scoped CRUD

**Data shape:**
```json
{
  "procedures": [],
  "users": [],
  "caseLogs": [],
  "nextProcedureId": 1,
  "nextStepId": 1,
  "nextUserId": 1,
  "nextCaseLogId": 1
}
```

**Conventions:**
- IDs are auto-incremented integers stored as counters in the DB file
- All writes are synchronous and replace the whole file
- No transactions or locking — suitable for single-process deployment only
- Schema migrations are handled in `initializeDB()` (additive only)

---

## Authentication

- Tokens are JWTs signed with `JWT_SECRET`, expiry 7 days
- Stored in browser `localStorage` as `authToken`
- Sent in `Authorization: Bearer <token>` header
- `authMiddleware` rejects requests without a valid token (401)
- `optionalAuth` attaches `req.user` if token is valid but never blocks

---

## Frontend Architecture (`public/app.js`)

Single-file vanilla JS SPA with no build tooling.

**Views:** Procedures | Case Logs | Anatomy Atlas — toggled by `switchView()`

**Major function groups:**
- `checkAuth()` / `handleAuth()` / `logout()` — Authentication state
- `loadProcedures()` / `renderProcedures()` / `showStepViewer()` — Procedure browsing
- `loadCaseLogs()` / `loadCaseLogStats()` / `saveCaseLog()` — Case log CRUD
- `loadAtlasRegions()` / `loadSubregion()` / `searchAtlas()` — Atlas navigation
- `showToast()` — User notifications
- `escapeHtml()` — XSS prevention for dynamic content

**Keyboard navigation:**
- Arrow keys navigate procedure steps when step viewer is open
- Escape closes modals

**PWA caching strategy (`sw.js`):**
- Static assets: cache-first
- API calls (`/api/*`): network-first with cache fallback
- Navigation requests: fallback to `index.html`

---

## CSS Conventions (`public/styles.css`)

- Uses CSS custom properties for design tokens (colors, spacing, shadows)
- Primary color: `#2563eb` (blue)
- Mobile-first responsive design
- Safe area insets (`env(safe-area-inset-*)`) for notched devices
- No CSS preprocessor — plain CSS only

Key variables:
```css
--primary: #2563eb;
--success: (green variant);
--warning: (yellow variant);
--danger: (red variant);
```

---

## Key Conventions

1. **No framework magic** — All DOM manipulation is plain `document.querySelector` / `innerHTML`. Keep it that way unless a full rewrite is warranted.
2. **XSS safety** — Always use `escapeHtml()` when inserting user-supplied strings into `innerHTML`.
3. **Auth headers** — Use the `authHeaders()` helper (in app.js) for any authenticated fetch calls.
4. **Error responses** — Backend returns `{ error: "message" }` JSON with appropriate HTTP status codes (400, 401, 404, 409, 500).
5. **DB writes** — After any mutation, call `writeDB()` immediately. There is no deferred flushing.
6. **Anatomy atlas** — `data/anatomy-atlas.json` is read-only static data. Do not modify it via API; it's loaded once into memory on first request.
7. **No test suite** — Validate changes manually by running the app. Add tests only if explicitly requested.
8. **Passwords** — Minimum 6 characters, hashed with bcryptjs (10 salt rounds) before storage. Never log or return password hashes.
9. **JWT secret** — The hardcoded default is for development only. Any production deployment must set `JWT_SECRET` via environment variable.

---

## Deployment

The app deploys to any Node.js host. See `DEPLOY.md` for step-by-step guides for:
- **Railway.app** (recommended — auto-detects Node.js)
- **Render.com**
- **Local network sharing**

No Dockerfile or CI/CD pipeline is included. The `npm start` command is the only entry point needed.

---

## Security Considerations

- CORS is enabled globally — restrict origins in production if needed
- The `data.json` file stores all data in plaintext — do not store sensitive PHI without encryption
- Input is validated on the frontend and partially on the backend; add server-side validation before expanding to production use
- No rate limiting is implemented on auth endpoints
