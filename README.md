# AI Project Autopilot

An independent frontend workspace for planning repository improvements with AI. This project is not based on or copied from the Codeit/MoonShot frontend. GitHub OAuth is handled by the backend; the frontend uses an HttpOnly session cookie and never stores GitHub credentials or tokens.

## Requirements

- Node.js `>=20.9.0` (verified with `v24.11.1`)
- npm (verified with `11.6.2`)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Useful checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Copy `.env.example` to `.env.local` when preparing a local backend connection. `NEXT_PUBLIC_API_BASE_URL` is the backend origin and defaults to `http://localhost:5001`. Keep server credentials server-side; never add GitHub or Meta API keys to `NEXT_PUBLIC_*` variables. Set the backend's `GITHUB_REDIRECT_URI` to `http://localhost:3000/auth/github/callback` and `AUTOPILOT_FRONTEND_URL` to `http://localhost:3000/connect/github`. The FE callback route forwards GitHub's callback query to the backend at `/api/auth/github/callback`; OAuth token exchange remains on the backend.

## Routes

- `/` introduces the service and links to GitHub connection
- `/dashboard` checks the backend session before loading real GitHub repository data
- `/repositories` redirects to `/connect/github`
- `/analyze` redirects to `/connect/github`
- `/connect/github`
- `/connect/github/analysis` shows the current account's analysis from this browser tab after checking the session
- `/auth/github/callback`

Workspace routes live in the `(workspace)` route group, which is not part of their URLs.

## Structure

Application code is under `src/`: `app/` contains the App Router, `components/` contains shared authentication, layout, and UI, `features/` contains screen-level UI, `lib/api/` defines the backend contract, and `types/` contains domain types. The old demo views and fixtures are unused; the former `/plans/[planId]` and execution demo routes return 404 until real plan persistence is available.

`/connect/github` uses OAuth App login, the backend session, and `GET /api/github/repositories?page=1` to show the connected account's real repositories. It supports selection, pagination, refresh, and reconnecting when a session or GitHub token expires. GitHub App installation is not part of this flow. The selected repository can be analyzed from this screen with an optional development goal. `POST /api/github/repositories/{id}/analysis` sends that repository's README and selected source portions to the backend's Meta model and returns a summary, prioritized development recommendations, implementation steps, acceptance criteria, and file/line evidence pinned to the analyzed commit. Results show the files read and omitted-context warnings. Analysis only starts when the user presses the analysis button; changing repositories or logging out discards the current result.

`/dashboard` shows a login prompt until `GET /api/auth/me` confirms the session. It then loads the first repository page, shows counts explicitly limited to that page and up to five repositories, and uses the browser's current local date. Empty, loading, permission, and network-error states never fall back to sample data. A 401 response clears the visible workspace and prompts login again. The public landing page does not fetch account data.

Public and private repository access is granted through GitHub's OAuth consent screen. Existing connections without private repository access show a reconnect prompt. OAuth's `repo` scope includes read and write access to private repositories; there is no list-only private-repository scope.

## Dependencies and assets

- Next.js `16.4.3`, React `19.3.0`, and TypeScript: framework/runtime and types; MIT licenses.
- ESLint `9` and `eslint-config-next 16.4.3`: linting; MIT licenses.
- `lucide-react 1.61.0`: interface icons; ISC license. Icons are imported from the package and no icon artwork is copied into this repository.
- CSS Modules and CSS custom properties: built into the application/toolchain; no additional styling package.
- No external images, logos, or design templates are used by the new interface.
- The pre-existing, unused `public/*.svg` scaffold files are from the official `create-next-app` template (MIT template source); Next.js and Vercel brand marks remain subject to their owners' terms. They are not referenced by this app.

Package details and licenses: [Next.js](https://github.com/vercel/next.js), [React](https://github.com/facebook/react), [TypeScript](https://github.com/microsoft/TypeScript), [ESLint](https://github.com/eslint/eslint), and [Lucide](https://github.com/lucide-icons/lucide).
