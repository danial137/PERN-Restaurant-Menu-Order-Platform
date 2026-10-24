# Security model and open risks

## Already implemented

- bcrypt password hashing; short bounded Zod payloads; httpOnly JWT cookie; role checks; explicit origin and CORS controls; Helmet; auth and order rate limiting.
- Client never supplies price, discounts or payment status for checkout. Inventory decrements atomically with full transaction rollback.
- Customer isolation is checked on order and voucher lookup. Voucher possession never grants access to staff redemption endpoint.
- Voucher token is HMAC signed from order id, hash at rest, expires after 24h, has a single-redemption status guard.
- No raw exception stack traces returned to clients; passwords/secrets excluded from response.

## Before production launch

1. Add email verification/password reset and stronger account abuse controls (CAPTCHA or progressive rate limits).
2. Use HTTPS and first-party cookie routing; apply comprehensive CSRF checks for cookies in the deployed proxy scenario.
3. Add audit trails of actor/user ID for staff status and payment changes, and real receipts/refunds integration.
4. Add explicit limits for admin product changes and authorize role/permissions from DB after user deactivation.
5. Add server-side cleanup/retention for personally identifying records, comply with privacy laws.
6. Add integration tests with real DB (race conditions / P2034 retries) and targeted pentest before payments.
7. Rate limit token validation and avoid logging QR tokens or placing them in third-party analytics/referrer links.
8. Add strict CSP compatible with your origins; currently disabled to avoid blocking Swagger during development.
9. Add DB backup/restore, monitoring, alerting, and operator runbook.
10. Confirm jurisdiction-specific invoice numbering and taxation before legal/commercial use.

## Financial semantics

`paymentStatus: PAID` means staff recorded an offline payment; does not prove external settlement. No card credentials are collected. Invoice printing is a customer receipt mock, not a compliant formal tax invoice.
