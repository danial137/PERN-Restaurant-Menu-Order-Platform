# Persian Food / Phase 2 — اتصال Mock (پرداخت، اعلان، آشپزخانه)

**وضعیت:** سورس عملیاتی برای توسعه محلی؛ بدون اتصال سرویس خارجی و بدون دریافت پول واقعی. این نسخه در محیط حاضر روی PostgreSQL واقعی/مرورگر تست یکپارچه نشده است.

## معماری

```text
React UI (customer/admin/KDS)
  ├── POST /api/orders                    -> OrderService -> PostgreSQL
  ├── POST /api/payments/intents           -> PaymentService -> PaymentAttempt
  ├── POST /api/payments/mock/:id/confirm -> PaymentService (dev only)
  │    └── serializable DB transaction:
  │         Payment PAID + inventory COMMITTED + KitchenTicket + OutboxEvent
  ├── GET /api/kitchen/events             -> SSE snapshot every ~4s (staff)
  ├── PATCH /api/kitchen/tickets/:id/status -> KitchenService + FSM + CAS(version)
  │    └── on READY: OutboxEvent ORDER_READY
  └── GET/PATCH /api/notifications/*     -> per-user demo preferences/inbox

Worker (separate process)
  ├── release expired HELD reservations (>15 min, one-time stock credit)
  └── claim OutboxEvent -> send via MockSms/MockTelegram -> persist inbox
```

## چرا این ساختار Clean Architecture است؟

- `packages/domain/src`: قواعد کسب‌وکار و الگوریتم‌های مستقل از Express/React/Prisma.
- `apps/api/src/routes`: کنترلرهای کوچک؛ ورودی با Zod اعتبارسنجی می‌شود.
- `apps/api/src/services`: Use Case و تراکنش‌های دیتابیس.
- `apps/api/src/adapters`: شبیه‌ساز درگاه و شبیه‌ساز اعلان؛ تعویض‌پذیر با Adapter واقعی.
- `apps/api/src/workers`: پردازش async Outbox و انقضای رزرو.
- `apps/web/src/features`: رابط مستقل پرداخت، اعلان و Kitchen Display.

**فاکتور و ووچر قبلی حفظ می‌شوند.** تغییر وضعیت پرداخت، فاکتور را دوباره ایجاد نمی‌کند. آشپزخانه فقط سفارش تسویه‌شده را دریافت می‌کند. ووچر تنها در READY و PAID قابل مصرف است.

## سناریو کامل تست دستی

1. `npm run dev` را اجرا کن (سه پردازش API / WEB / WORKER).
2. مشتری ثبت‌نام کند و در `/notifications` شماره نمونه +989... و تیک SMS/Telegram آزمایشی را فعال کند.
3. از `/menu` محصول انتخاب کند، در `/checkout` سفارش ثبت کند.
4. در `/orders/:id` دکمه **تأیید پرداخت آزمایشی** را بزند. هیچ وجه واقعی جابه‌جا نمی‌شود.
5. ادمین `/admin/kitchen` را باز کند؛ سفارش `QUEUED` در صف نمایان است.
6. روی «شروع آماده‌سازی» و سپس «آماده تحویل» بزند. تغییرات با SSE به‌روز می‌شوند؛ در صورت قطع اتصال، Polling جایگزین است.
7. مشتری `/notifications` را Refresh کند: پیام‌های `MOCK SMS` و `MOCK TELEGRAM` برای پرداخت و آماده‌سازی ثبت شده‌اند.
8. ادمین ووچر QR را طبق مسیر فعلی تحویل، یک‌بار مصرف کند. تیکت از صف READY حذف می‌شود.

## امن‌بودن Mock

- `MOCK_PAYMENTS_ENABLED=true` تنها در development/test اثر دارد. در `NODE_ENV=production` Endpoint شبیه‌سازی خطای 403 می‌دهد.
- اپ در این نسخه **هیچ پرداخت واقعی یا پیامک واقعی انجام نمی‌دهد**. امکان مصرف تجاری تا اتصال و تست Provider واقعی فراهم نیست.
- Amount از سفارش سمت سرور خوانده می‌شود، نه Browser. Idempotency-Key برای ساخت تراکنش الزامی است.
- پرداخت تأییدشده و ایجاد تیکت و Outbox در یک تراکنش SERIALIZABLE رخ می‌دهد.
- Worker مسئول ارسال Mock است، نه HTTP request. با خطا حداکثر ۸ بار با Backoff تلاش می‌کند و سپس FAILED می‌شود؛ Delivery با کلید یکتا از ثبت تکراری در دیتابیس جلوگیری می‌کند.
- «Telegram demo linked» یک سوییچ تستی است و هیچ ارتباطی با اکانت واقعی Telegram ایجاد نمی‌کند.
- فعال‌سازی SMS تنها با رضایت کاربر است؛ برای نسخه واقعی، تأیید شماره، محدودیت نرخ و قوانین حریم خصوصی لازم است.
- SSE برای STAFF/ADMIN است و از کوکی احراز هویت استفاده می‌کند.

## الگوریتم‌ها

- **Binary Min-Heap:** `KitchenPriorityQueue`; درج/حذف `O(log n)`، ترتیب براساس deadline و شناسه برای شکستن تساوی.
- **Finite State Machine:** `nextKitchenOrderStatus` و `assertTransition`، جلوگیری از جهش حالت نامعتبر.
- **Optimistic Concurrency / Compare-and-Set:** `KitchenTicket.version`, `Order.status`; درخواست تکراری وضعیت 409 می‌دهد.
- **Hash Map:** ادغام اقلام تکراری هنگام ثبت سفارش، `O(n)`.
- **Outbox + Exponential Backoff:** هماهنگی قابل بازیابی بعد از خرابی Worker؛ ارسال خارجی در حالت واقعی at-least-once است، نه exactly-once تضمینی.
- **Stock reservation expiration:** فقط سفارش HELD/UNPAID با موعد گذشته را به RELEASED تبدیل می‌کند؛ هر قلم موجودی یک بار برمی‌گردد.

## تغییر به Provider واقعی

1. `apps/api/src/adapters/mock-payment.adapter.js` را با Adapter واقعی (در محیط و کشور مجاز) جایگزین کن؛ Create Session، Callback/Webhook معتبر، server-to-server verify، مبلغ دقیق و currency باید پیاده‌سازی شود.
2. تایید Payment را دیگر از Endpoint تایید Mock در مرورگر انجام نده؛ فقط بعد از تأیید واقعی از درگاه.
3. `apps/api/src/adapters/mock-notification.adapter.js`: آداپتر پیامک با API Key از env و Telegram Bot با `chatId` واقعی و لینک یک‌بارمصرف بساز.
4. Outbox فعلی را نگه دار، Retry و مراقبت عملیاتی و rate-limit اضافه کن؛ هر پیام می‌تواند بیش از یک بار ارسال شود مگر Provider deduplication پشتیبانی کند.
5. Production: Backups، SSL، monitoring، database migrations، security audit، webhook signature verification، consent، امضای کوکی و CSRF را تست کن.

**پیشنهاد Deploy:** React/Vite روی Vercel؛ Express SSE و Worker به‌صورت سرویس Node دائمی روی Render/Railway/VPS؛ PostgreSQL روی Neon یا ارائه‌دهنده سازگار. API مسیر `/api` باید Same-site یا Proxy درست داشته باشد تا کوکی نشست کار کند.
