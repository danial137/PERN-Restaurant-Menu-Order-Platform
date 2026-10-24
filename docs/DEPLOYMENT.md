# Deployment guide — production architecture

This is a **PERN** application: React/Vite SPA, persistent Express API, PostgreSQL. It is **not** a Next.js application.

## Local development (Windows PowerShell)

1. Install Node 20+, Docker Desktop, Git.
2. In repository root: `Copy-Item .env.example apps/api/.env`.
3. Ensure port `5434` free (we intentionally do not use 5432 because a local PostgreSQL may already occupy it).
4. `docker compose up -d db`
5. `npm install`
6. `npm run db:generate`
7. **Initial DB:** `cd apps/api; npx prisma migrate dev --name init; cd ../..` (create and apply first migration once). Prisma may require a shadow DB with create database privilege; the compose DB user has that privilege.
8. Set `SEED_ADMIN_PASSWORD` to your own strong password in `apps/api/.env`; `npm run db:seed`.
9. `npm run dev`.
10. Open **http://localhost:5173** (frontend) and **http://localhost:4000/api/docs** (Swagger).

`apps/api/.env` is ignored by Git. If you change `POSTGRES_PORT`, update the `DATABASE_URL` port too.

## Cloud (recommended)

- **Frontend:** Vercel (Vite preset), Root Directory `apps/web`, output `dist`. Since monorepo npm workspaces need root install, prefer repository root Vercel build command `npm run build -w @persian-food/web` and Output Directory `apps/web/dist`; set Framework to `Other` or Vite and Root Directory root. Configure SPA fallback to index.html (see `apps/web/vercel.json`).
- **API:** Render/Railway/Fly.io (persistent Node service); repo root start `npm run start -w @persian-food/api`; installation `npm install`; configure env and health check `/health`.
- **DB:** Neon PostgreSQL; use provider-recommended pooled URL for runtime and direct URL for migration when appropriate. Retain `?sslmode=require` as provided. Do not reuse Docker development DB.
- **Browser/API cookies:** To avoid third-party-cookie blocking, configure **same-origin reverse proxy** routing `https://food.example.com/api/*` to the Express API and `/api/docs` too. With Vercel, create a rewrite destination pointing to your real backend URL; configure `WEB_ORIGIN=https://food.example.com` and `PUBLIC_WEB_URL=https://food.example.com`. Be mindful of forwarded cookies, CSP, rate limits and proxy trust.
- **Secrets:** `JWT_SECRET`, `VOUCHER_SECRET` each random 32+ chars, distinct; stable `VOUCHER_SECRET` across deploys. `NODE_ENV=production`. Store only in hosting environment, not git.
- **Migrations:** create first migration locally, commit `apps/api/prisma/migrations`, deploy with `npx prisma migrate deploy --schema apps/api/prisma/schema.prisma` from root. Never `db push` automatically against active production DB.
- **Seed:** only seed demo data if explicitly intended. Set unique admin email/password. Remove/disable example account for public rollout.

### Important Vercel note

React site can be hosted on Vercel, but **persistent Express service** should run on a separate host; do not assume Vercel can host the Express server or sustained SSE/WebSockets without adaptation. v1 deliberately uses status polling so backend is horizontally portable.

## Production acceptance checklist

- `npm test` and `npm run build` pass on a CI runner with npm access.
- Prisma migration completes against an empty staging DB; restore from backups tested.
- HTTPS, same-origin cookies, rate limits, secret storage verified.
- Order stock race test, voucher double-redemption test and cancellation test run against real Postgres.
- Test QR at the real public domain, tablet portrait, iPhone/Android, desktop.
- Audit admin capabilities, privacy, accessibility, local taxes, liability and invoice requirements.

## Troubleshooting

- **P1000:** wrong DB credentials, not a React issue. Verify URL against active database.
- **P1012:** schema parse error; `npx prisma validate --schema apps/api/prisma/schema.prisma`.
- **API network:** `GET http://localhost:4000/health` and ensure Vite reverse proxy points to 4000.
- **401:** cookies missing; inspect origin/proxy and sign in, ensure one consistent hostname.
- **QR to localhost:** printed QR must be generated with production `PUBLIC_WEB_URL`; regenerate after URL change.
