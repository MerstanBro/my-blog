# Static portfolio and blog

A fast static site generated from the GitLab content repository. The browser receives semantic HTML, one CSS file, and small vanilla JavaScript modules.

This repo root is the production app (the old Next.js app has been removed).

## Local preview

```bash
npm install
npm run dev
```

`npm run dev` uses built-in demo content, so GitLab credentials are not required.

## Production build

Copy `.env.example` to `.env` (or keep your existing `.env`).
Accepted names:

- `GITLAB_PROJECT_ID` or `NEXT_PUBLIC_GITLAB_PROJECT_ID`
- `GITLAB_TOKEN` or `NEXT_PUBLIC_GITLAB_TOKEN`
- `GITLAB_REF` (defaults to `main`)
- `SITE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GITLAB_WEBHOOK_SECRET` / `VERCEL_DEPLOY_HOOK_URL` (CMS auto-rebuild)

Then run:

```bash
npm run build
```

The deployable site is written to `dist/`. Images are copied from `public/`.

## Vercel

- **Root Directory:** repository root (not `new/`)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- Env vars: same as `.env.example`

## Content format

The generator preserves the existing GitLab layout:

- `content.json` — portfolio, projects, social links, and leaderboard seed
- `details.json` — page count and tag metadata
- `pages/{number}.json` — blog listings
- `tags/{tag}/{number}.json` — tag listings
- post files — markdown with YAML front matter

## Runtime architecture

- Blog pages and metadata are generated at build time.
- Light/dark theme and mobile navigation live in `src/main.js`.
- The typing race is a standalone vanilla module in `src/type-race.js`.
- Score submission uses the Vercel function at `api/leaderboard.js`.
- CMS auto-rebuild uses `api/content-webhook.js`.
- GitLab and Supabase credentials never ship to the browser.

## Auto-update when CMS content changes

The live site is static. New posts appear after a rebuild. To rebuild automatically when you push to the content GitLab repo:

### 1. Create a Vercel Deploy Hook

1. Open your Vercel project → **Settings** → **Git** → **Deploy Hooks**
2. Create a hook named `cms-rebuild` for the production branch
3. Copy the hook URL
4. In Vercel → **Settings** → **Environment Variables**, add:
   - `VERCEL_DEPLOY_HOOK_URL` = that hook URL
   - `GITLAB_WEBHOOK_SECRET` = a long random string you invent
   - Keep existing `GITLAB_PROJECT_ID`, `GITLAB_TOKEN`, etc.

### 2. Add a GitLab webhook on the **content** repo

1. Open the CMS GitLab project → **Settings** → **Webhooks**
2. URL: `https://anasmerstani.com/api/content-webhook`
3. Secret token: the same value as `GITLAB_WEBHOOK_SECRET`
4. Trigger: **Push events**
5. Save, then click **Test** → **Push events**

Flow:

```
CMS push to main → GitLab webhook → /api/content-webhook → Vercel Deploy Hook → rebuild → live site updates
```

Only pushes to `GITLAB_REF` (default `main`) trigger a rebuild.
