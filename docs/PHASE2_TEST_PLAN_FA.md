# Persian Food / Phase 2 — برنامه تست

## تست‌های انجام‌شده در بسته
- `npm test`: تست‌های دامنه و Adapterهای Mock، شامل Heap، Backoff، وضعیت، پرداخت مجاز/منقضی و پیش‌نمایش اعلان.
- `node --check`: بررسی نحوی JS سرور.
- `apps/api/openapi.yaml`: بررسی ساختار YAML با parser.

## تست‌های لازم روی سیستم توسعه‌دهنده (هنوز اینجا انجام نشده)

### DB / API
- اجرای `npx prisma validate`, `npx prisma generate`, ایجاد migration, شروع Docker PostgreSQL.
- ثبت سفارش با موجودی کافی، ناموجود، اقلام تکراری، Idempotency-Key تکراری.
- پرداخت دوباره یک PaymentAttempt: یک PAID، یک KitchenTicket، یک PAYMENT_SUCCEEDED Outbox؛ مبلغ صفر خارج از سرور تغییر نکند.
- دو PaymentAttempt هم‌زمان یک Order: فقط یکی موفق؛ دیگری Conflict و بدون تیکت/رویداد دوم.
- پرداخت بعد از `reservedUntil`: 409؛ Worker موجودی رزروشده را فقط یک بار آزاد کند.
- هم‌زمانی Expiry و Payment: فقط یکی پیروز؛ هیچ موجودی منفی یا افزایش دوباره‌ای اتفاق نیفتد.
- نقش CUSTOMER نتواند سفارش دیگری را بپردازد یا مسیرهای KDS را بخواند.
- نقش STAFF بتواند پرداخت حضوری را ثبت و پس از آن سفارش را وارد آشپزخانه کند.
- READY، پیام Outbox را یک بار تولید کند. بعد از Redeem تیکت FINISHED باشد.
- محدودیت‌ها: خطاهای `P2034` به 409 قابل تلاش مجدد تبدیل شوند، انقضا به 409.

### Worker / Notifications
- با هر دو Preference خاموش، هیچ Delivery ثبت نشود.
- با SMS روشن و شماره معتبر، یک Delivery Mock ثبت شود؛ با Telegram demo روشن یک Delivery دیگر.
- اجرای دوباره Worker یا Crash بعد از ارسال، رکورد Delivery تکراری نسازد.
- تأخیر / خرابی Adapter، Retry و Lease را تست کن؛ هیچ تراکنش پرداختی rollback نشود.
- تست API `PATCH /api/notifications/preferences` برای شماره نامعتبر و رضایت مشتری.

### KDS / Frontend
- 320px، 375px، 768px، 1024px، desktop؛ بدون overflow افقی.
- EventSource reconnect، SSE قطع‌شده، fallback polling، refresh بعد از تغییر وضعیت.
- رقابت دو آشپز با `expectedVersion`: تنها یک موفق، دیگری 409.
- اسکرین شات login، menu، checkout، payment mock، KDS، notification inbox، invoice voucher.
- اجرای `npm run build` برای React و تست e2e با Playwright یا Cypress.

## خروجی پذیرش قبل از Production
- Success تست‌ها، audit permissions، مدرک backup/restore، عملیات واقعی درگاه در sandbox، بدون endpoint mock در Production.
