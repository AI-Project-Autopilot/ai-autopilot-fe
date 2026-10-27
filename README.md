# AI Project Autopilot

An independent frontend workspace for planning repository improvements with AI. This project is not based on or copied from the Codeit/MoonShot frontend. GitHub and model-provider integrations are intentionally not connected yet.

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

Copy `.env.example` to `.env.local` when preparing a local backend connection. Keep server credentials server-side; never add GitHub or Meta API keys to `NEXT_PUBLIC_*` variables.

## Routes

- `/` redirects to `/dashboard`
- `/dashboard`
- `/repositories`
- `/analyze`
- `/plans/[planId]`
- `/plans/[planId]/execution`

Workspace routes live in the `(workspace)` route group, which is not part of their URLs.

## Structure

Application code is under `src/`: `app/` contains the App Router, `components/` contains shared layout and UI, `features/` contains screen-level UI, `lib/api/` defines the proposed backend contract, `lib/mock/` provides replaceable demo data, and `types/` contains proposed domain types.

The TypeScript API types are proposals only. The backend response format has not been agreed. `AutopilotApi` is the replacement boundary; the current `mockAutopilotApi` implementation can later be swapped for a server-side HTTP client without changing feature screens.

## Dependencies and assets

- Next.js `16.4.3`, React `19.3.0`, and TypeScript: framework/runtime and types; MIT licenses.
- ESLint `9` and `eslint-config-next 16.4.3`: linting; MIT licenses.
- `lucide-react 1.61.0`: interface icons; ISC license. Icons are imported from the package and no icon artwork is copied into this repository.
- CSS Modules and CSS custom properties: built into the application/toolchain; no additional styling package.
- No external images, logos, or design templates are used by the new interface.
- The pre-existing, unused `public/*.svg` scaffold files are from the official `create-next-app` template (MIT template source); Next.js and Vercel brand marks remain subject to their owners' terms. They are not referenced by this app.

Package details and licenses: [Next.js](https://github.com/vercel/next.js), [React](https://github.com/facebook/react), [TypeScript](https://github.com/microsoft/TypeScript), [ESLint](https://github.com/eslint/eslint), and [Lucide](https://github.com/lucide-icons/lucide).
