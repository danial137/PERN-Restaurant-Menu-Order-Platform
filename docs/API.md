# REST API / Swagger

OpenAPI source: `apps/api/openapi.yaml`.

After starting API: **http://localhost:4000/api/docs**.

## Common conventions

- `Content-Type: application/json`
- Session cookie `pf_session` (httpOnly). Browser API calls require `credentials: include`.
- IDs are opaque strings; price and totals are integers in toman.
- Errors: `{ "error": { "code": "DOMAIN_CODE", "message": "Persian human-readable message" } }`.
- Status codes: 200 normal/replay, 201 created, 401 unauthenticated, 403 unauthorized, 404 missing, 409 concurrency/business conflict, 422 validation.
- Create order: `POST /api/orders` with UUID `requestId`; retries MUST reuse the same UUID.

## Quick sample

```json
{
  "requestId": "8e16f6dd-301f-4aa2-968c-8151e13a18a9",
  "type": "TAKEAWAY",
  "items": [{"productId":"PRODUCT_ID_FROM_MENU","quantity":2}],
  "notes": "کم‌نمک"
}
```

### User flows

**Customer:** register/login -> public menu -> cart -> authenticated checkout -> /orders/:id -> invoice -> pickup voucher QR.

**Staff:** /admin/orders -> accept -> preparing -> ready -> record offline payment -> scan/read customer's voucher -> redeem to complete.

**Admin:** staff actions plus add product and create table with dedicated QR menu link.

## Known limitations

- No online payment processing. `PATCH /api/orders/{id}/payment` records receipt of cash/card **outside** the app; it does not charge anything.
- Printing invoice uses browser print/PDF, not a PDF rendering microservice.
- Swagger schema covers main endpoints but should be enriched with complete response body models and examples before publishing a public developer API.
