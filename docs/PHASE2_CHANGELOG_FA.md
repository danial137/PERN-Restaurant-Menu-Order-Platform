# Persian Food — Phase 2 Mock Integration Changelog

## اضافه‌شده
- پرداخت آزمایشی با PaymentAttempt، Idempotency-Key و تأیید تراکنشی، بدون پول واقعی.
- رزرو موجودی ۱۵ دقیقه‌ای و Worker آزادسازی موجودی بدون بازگشت تکراری.
- KitchenTicket با نسخه، Min-Heap مهلت پخت، پنل KDS واکنش‌گرا و SSE با fallback.
- SMS/Telegram mock با رضایت کاربر، Outbox، Inbox آزمایشی و Retry.
- Swagger Endpointها، تست‌های Domain و Mock Adapter، راهنمای اجرا و تست.
- استایل مستقل برای کامپوننت‌های جدید؛ API Routes مستقل برای ماژول‌ها.

## تغییر رفتار
- وضعیت سفارش تنها پس از ثبت پرداخت (Mock یا حضوری) از PLACED به ACCEPTED منتقل می‌شود.
- سفارش پرداخت‌نشده پس از ۱۵ دقیقه توسط Worker لغو و موجودی آزاد می‌شود.
- مصرف ووچر در READY تیکت آشپزخانه را FINISHED می‌کند.
- Mock Payment در NODE_ENV=production مسدود است.

## بدون تغییر
- PostgreSQL و Prisma مدل‌های قبلی حفظ شده‌اند؛ فاکتور، ووچر و شماره سفارش موجود تغییر قالب نداده‌اند.
- طراحی مانگای سیاه‌وسفید، QR میزها، فرم ورود، منو و سبد خرید حفظ شده‌اند.

## Known limitations
- API واقعی درگاه/پیام‌رسان وجود ندارد. اتصال نیازمند Adapter و اعتبارسنجی واقعی است.
- npm install، Prisma CLI، تست مرورگر و PostgreSQL integration در این محیط به خاطر نبود رجیستری/دیتابیس اجرا نشده‌اند.
- برای استفاده واقعی به Migrationهای versioned، تست هم‌زمانی، verify callback، مراقبت عملیاتی و امنیت نیاز داریم.
