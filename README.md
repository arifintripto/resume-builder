# Resume Builder

A single-page Next.js app where the A4 resume preview **is** the editor. No database — everything lives in `localStorage` and JSON files.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## How to use

- **Edit text**: click any text on the sheet and type. Enter (or clicking away) commits. Ctrl+B works inside bullets for bold.
- **Reorder sections**: hover a section title, grab the `⠿` handle on its left, and drag.
- **Entries & bullets**: hover any line — small controls appear (add, move up/down, delete, h3/h4 toggle).
- **Photo**: click the photo slot to upload; hover it for the remove button. Stored as a data URL.
- **PDF**: "Download PDF" renders the resume server-side via your installed Chrome/Edge and downloads `<Name>.pdf` directly — A4, 0.5in margins, selectable text. "Print" still opens the browser dialog as a fallback.
- **Page breaks**: the preview paginates like Word — content that would straddle an A4 boundary is pushed to the next simulated sheet, with a gray gap between sheets. Headings stay attached to what follows them, bullets never split. The PDF applies the same rules, so what you see is what prints (screen-only controls like "+ Photo" can shift things by a line or two).
- **Backup / restore**: "Export JSON" downloads the resume as a file; "Import JSON" loads one. "Reset" replaces the current resume with the John Doe template (also what first load and "+ New" show).

- **Undo / redo**: toolbar buttons or Ctrl+Z / Ctrl+Shift+Z (Ctrl+Y also redoes). History is kept per resume, up to 50 steps. While a text field is focused, the browser's own text undo applies; the app-level undo takes over once the edit is committed (click away / Enter).
- **Zoom**: the Zoom slider (50–200%) magnifies the preview for close inspection — it never affects the PDF or print output. The Text slider is the one that changes the actual resume.

Autosave: every change is written to `localStorage` immediately (guest mode), or debounced to your account when signed in.

## Google sign-in + cloud saving (optional)

Without configuration the app runs in guest mode (localStorage only). To enable accounts:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** (type: Web application).
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - First time: you'll be asked to configure the OAuth consent screen (External, add yourself as a test user).
2. Fill in `.env.local`: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `MONGODB_URI` (a MongoDB Atlas connection string or local mongod — the app uses the `resume-builder` database, configurable via `MONGODB_DB`). `AUTH_SECRET` is already generated.
3. Restart the dev server. A "Sign in with Google" button appears in the toolbar.

Signed in, your resumes live in MongoDB (`resumes` collection) and autosave ~1.5s after each change ("Saving… / Saved ✓" in the toolbar). On first sign-in with an empty account, the app offers to upload the resumes saved in this browser. Signed out, guest mode and its localStorage data are untouched.

## Deploying to cPanel under a subpath

Target: `https://example.com/resume-builder` via cPanel's **Setup Node.js App** (Passenger). Requires Node ≥ 20.9 in the cPanel Node selector.

This host blocks SSH, FTP data channels, and outbound git — the only working channel is cPanel's own HTTPS API (port 2083). So the workflow builds everything on the runner (including production `node_modules` — same Linux/Node as the server), uploads a single tarball through the File Manager API, extracts it server-side, and touches `tmp/restart.txt` to restart Passenger. The server needs no git, npm, or shell.

One-time setup:

1. cPanel → **Setup Node.js App** → Create application:
   - Node version: 22 · Mode: Production
   - Application root: `resume-builder-app` · Application URL: `example.com/resume-builder`
   - Startup file: `server.js` (no environment variables here — see step 3)
2. cPanel → **Manage API Tokens** → create a token → add it as the `CPANEL_TOKEN` secret in GitHub (repo → Settings → Secrets → Actions). It's the only secret the workflow needs; update `CPANEL_HOST`/`CPANEL_USER`/`APP_PATH` at the top of the workflow for your account.
3. cPanel → **File Manager** → create `resume-builder-app/.env` with the production values (`BASE_PATH=/resume-builder`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL=https://example.com/resume-builder/api/auth`, `MONGODB_URI`, `MONGODB_DB=resume-builder`). It persists across deploys.
4. Google Cloud Console → your OAuth client: add JavaScript origin `https://example.com` and redirect URI `https://example.com/resume-builder/api/auth/callback/google`.
5. MongoDB Atlas → Network Access: allow the hosting server's IP.

After that, every push to `main` deploys end to end with no manual steps.

Note: shared hosting has no Chrome, so the app detects that and hides "Download PDF" — visitors use **Print** → Save as PDF instead (identical output).
