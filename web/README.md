# Media Hub — frontend

React 19 + Vite + TypeScript + Tailwind v4. Hébergé sur Vercel ; les appels `/api/*` sont relayés vers le backend (voir `vercel.json`).

## Commandes
- `npm run dev` : serveur local (le proxy `/api` est défini dans `vite.config.ts`)
- `npm run typecheck` : TypeScript
- `npm test` : tests (vitest + Testing Library)
- `npm run build` : typecheck + build de production dans `dist/`

## Structure
- `src/pages` : Landing (visiteurs), Tools, ToolPage, ApiPage, Account, Menu, AuthPages, Legal, admin/
- `src/layouts` : PublicLayout (header, barre du bas, pied), RequireAuth, AdminLayout
- `src/components` : ui, Logo, Intro (animation d'entrée), ToolCard, UsageChart…
- `src/features/tools.ts` : catalogue des outils et validation des liens
- `src/lib` : client API (CSRF, erreurs), formats, démo
- `public` : logo, icônes d'installation, `manifest.webmanifest`

## Variables
- `VITE_API_URL` (facultatif) : URL de l'API si elle n'est pas servie sur `/api`.
