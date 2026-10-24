# PERSIAN FOOD 🍜 — PERN Restaurant Menu & Order Platform

**Persian Food** is a responsive Persian-first, black-and-white manga-inspired restaurant app with public QR menu, customer dashboard, admin dashboard, order tracking, inventory management, printable invoices, and one-time pickup vouchers. Designed with Clean Architecture and measurable data-structure/algorithm decisions.

> ⚠ **Status: functional source implementation / developer preview, NOT production-certified.** 11+ domain unit tests run offline. In this environment the npm registry and a live PostgreSQL server were unavailable, so full dependency installation, web build, API integration, security validation and complete browser workflows could not be exercised. Validate locally before real customers.

## What's included?

- **PERN stack:** PostgreSQL 16, Express 4, React 18/Vite 6, Node.js 20+.
- **Monorepo:** workspaces `apps/api`, `apps/web`, `packages/domain`.
- **Customer:** registration/login, catalog/search/filter, cart, table QR, takeaway/dine-in checkout, order history, status timeline, print invoice, voucher QR.
- **Admin:** KPI overview, order status progression, offline payment recording, voucher redemption, product pricing/stock, QR per restaurant table.
- **Algorithmic core:** O(n) Map aggregations, server-trusted money maths (integer toman), strict FSM, serializable transactional stock reservation, idempotency key, hash-based one-time voucher.
- **Docs:** Mermaid architecture & ERD, Swagger/OpenAPI v3, algorithm reference, security and production deployment runbook.
- **Figma:** importable vector mockups for desktop/mobile/QR and design tokens, with original manga SVG assets. Not a native .fig file.

## 1. Quick start on Windows PowerShell

```powershell
# from project root
Copy-Item .env.example apps/api/.env
# edit apps/api/.env, set unique strong JWT_SECRET, VOUCHER_SECRET and admin password

docker compose up -d db
npm install
npm run db:generate

# first-time initialization: create migration in apps/api
cd apps/api
npx prisma migrate dev --name init
cd ../..

npm run db:seed
npm run dev
```

Frontend **http://localhost:5173**  
Backend **http://localhost:4000/health**  
Swagger **http://localhost:4000/api/docs**  
Prisma Studio: `cd apps/api; npx prisma studio`.

The local Docker DB intentionally exposes port **5434** (not 5432) to prevent conflict with Windows PostgreSQL. If Docker is running but Prisma fails P1000, verify `apps/api/.env`, Docker user/password/port, and existing volume credentials. Do not run `docker compose down -v` unless you intend to delete local data.

## 2. Demo flow

1. Sign in as the seed admin using `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from local `.env`.
2. Navigate to `/admin/tables` to print a live QR for a table.
3. Open an incognito browser, register as a customer, scan a QR or browse `/menu`, add products, checkout.
4. As admin, open `/admin/orders`, progress `PLACED → ACCEPTED → PREPARING → READY`.
5. Customer opens `/orders/:id` and sees automatically refreshed tracking, invoice and voucher QR.
6. Admin opens redeem area and pastes the **voucher token** or complete voucher URL from the customer QR (the QR encodes the URL). The voucher must be unexpired, the order READY and offline payment recorded as PAID. One-time redemption marks order COMPLETED.
7. Invoice can be printed/saved as PDF with browser Print.

**Important:** this demo records offline payments only. It does not charge cards. Do not use for fiscal compliance without local legal/accounting review.

## Repo structure

```text
persian-food/
├── apps/
│   ├── api/
│   │   ├── prisma/             # PostgreSQL schema and seed
│   │   ├── openapi.yaml        # Swagger contract
│   │   └── src/
│   │       ├── config/         # environment validation
│   │       ├── middleware/     # auth, roles, origin, error handling
│   │       ├── routes/         # small HTTP controllers
│   │       ├── services/       # transactional use cases
│   │       └── lib/            # infrastructure
│   └── web/
│       ├── public/illustrations/  # original vector artwork
│       └── src/{api,components,hooks,pages}
├── packages/domain/src/         # framework-independent algorithms and invariants
├── packages/domain/test/        # runnable Node unit tests
├── docs/                        # technical docs, ERD, DSA, API, security, deploy, Figma
├── design/                      # Figma-ready editable SVG + design tokens
├── docker-compose.yml
└── .env.example
```

## Testing

```powershell
npm test
npm run build
```

The backend is native ESM JavaScript; domain tests can run even before npm install using `node --test packages/domain/test/*.test.js`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database + ERD](docs/DATABASE.md)
- [Algorithms / Data Structures](docs/ALGORITHMS.md)
- [API & Swagger](docs/API.md)
- [Security / Threats](docs/SECURITY.md)
- [Deployment (Vercel + persistent Node API + Neon)](docs/DEPLOYMENT.md)
- [Figma vector handoff](docs/FIGMA.md)

## Clean Code principles

1. Controllers parse inputs and coordinate; they don't calculate financial rules.
2. `domain` is dependency-free except Node built-in crypto and is unit tested.
3. All user-visible money is integer toman; computed on server from Product snapshots.
4. State changes must pass through explicit finite state transition rules.
5. Database operations preserving business invariants occur in transactions.
6. Frontend components focus on presentation; typed API wrapper, auth/cart contexts, remote data hooks are separate.

## Limitations / roadmap

Production still needs database concurrency integration tests, migration review, transactional retry strategy, checkout refunds, audit log, email verification, account recovery, payment gateway, voucher scanning hardware/UI, staff role management, multi-restaurant support, observability, rate-limit centralization, and formal invoice compliance.

---

## Phase 2: پرداخت Mock + اعلان Mock + Kitchen Display (پیاده‌سازی شده در سورس)

**هیچ پرداخت واقعی یا پیام واقعی ارسال نمی‌شود.** این نسخه برای تست گردش سفارش در محیط local توسعه طراحی شده. API شبیه‌سازی پرداخت در `NODE_ENV=production` غیرفعال است.

- `POST /api/payments/intents` + `POST /api/payments/mock/:id/confirm`: پرداخت آزمایشی شناسه‌دار، Idempotency-Key الزامی.
- `GET/PATCH /api/notifications/preferences`, `GET /api/notifications/inbox`: پیش‌نمایش SMS و Telegram با رضایت کاربر.
- `GET /api/kitchen/tickets`, `GET /api/kitchen/events`, `PATCH /api/kitchen/tickets/:id/status`: KDS با SSE، صف Min-Heap و کنترل نسخه تیکت.
- Worker مستقل: رزروهای پرداخت‌نشده پس از ۱۵ دقیقه منقضی و موجودی بازگردانده می‌شوند؛ اعلان‌های Outbox به Inbox آزمایشی منتقل می‌شوند.
- صفحات جدید: `/admin/kitchen` (ادمین یا کارمند) و `/notifications` (کاربر واردشده)؛ پرداخت Mock در `/orders/:id`.

### ارتقا از نسخه قبلی بدون حذف دیتابیس

۱. از PostgreSQL بکاپ بگیر و از پوشه قبلی نسخه پشتیبان نگه دار. فایل `apps/api/.env` قبلیت را به نسخه جدید کپی کن.

۲. در `apps/api/.env` اضافه کن:

```env
MOCK_PAYMENTS_ENABLED=true
NODE_ENV=development
```

۳. از ریشه پروژه در PowerShell:

```powershell
docker compose up -d db
npm install
npm run db:generate
cd apps/api
npx prisma validate
npx prisma migrate dev --name phase2_mock
cd ../..
npm run dev
```

اگر پروژه قبلی را با `prisma db push` و بدون سابقه migration ساخته‌ای، `migrate dev` ممکن است خطای drift بدهد. **در این حالت دیتابیس را reset نکن**؛ بعد از بکاپ برای توسعه محلی می‌توانی `cd apps/api; npx prisma db push` اجرا کنی و برای production تاریخچه migration منظم بسازی. دستور `docker compose down -v` نزن.

**اجرای Worker:** با `npm run dev` هر سه پردازش API/WEB/WORKER راه می‌افتند. برای اجرای یک‌باره Worker در توسعه `npm run worker:once` را بزن.

**Swagger:** http://localhost:4000/api/docs  
**KDS:** http://localhost:5173/admin/kitchen  
**اعلان Mock:** http://localhost:5173/notifications

**برای اتصال درگاه واقعی:** هسته Domain، جدول PaymentAttempt، KitchenTicket، Outbox و صفحه سفارش باقی می‌مانند، اما Adapter Mock باید با Provider واقعی و Verify امن سمت سرور جایگزین شود. صرفاً گذاشتن API Key در `.env` کافی نیست.

جزئیات: [مستندات معماری و سناریوی تست](docs/MOCK_INTEGRATIONS_FA.md) و [Test Plan](docs/PHASE2_TEST_PLAN_FA.md).
