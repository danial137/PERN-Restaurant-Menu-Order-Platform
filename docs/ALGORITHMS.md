# Algorithms and data structures used in the project

This isn't decorative DSA; the algorithms protect real business invariants.

| Algorithm / DS | Used in | Complexity | Why |
|---|---|---|---|
| `Map<string, quantity>` | `order.service.js / uniqueLines` | O(n) expected time, O(k) memory | Coalesce duplicate cart entries |
| `Map<id, product>` | `createOrder` | O(k) expected build and lookup | Retrieve authoritative product snapshots without O(n²) `.find()` scans |
| Integer arithmetic, guarded overflow | `domain/money.js` | O(n) time, O(n) line snapshots | Avoid floating currency totals and unsafe integers |
| Directed finite state machine | `domain/order-state.js` | O(1) transition decision | Prevent illegal backtracking and arbitrary completion |
| Conditional update / compare-and-set | Inventory, status, voucher | O(1) by indexed key (DB dependent) | Concurrent reservations, double redemption prevention |
| SQL serializable transaction | checkout | Depends on DB workload | Atomic multi-item reservations and document creation |
| HMAC-SHA256 and SHA256 | `domain/voucher.js` | O(m) token length | Unforgeable QR entitlement, at-rest one-way hash |
| `Map` category index | `domain/menu.js` | O(n+k) | Group products by category efficiently |
| Search via tokenized substring match | `domain/menu.js` | O(n × m × L) roughly | Flexible Persian text search on small menus |
| Indexed database ordering + polling | order tracking | O(log n + returned rows), workload dependent | Persisted status across server restarts and instances |

## Interview exercises

1. Prove why the conditional decrement prevents selling negative stock under concurrent checkout.
2. Explain why a simple `if (voucher.status === 'ISSUED')` followed by separate update is not safe.
3. Refactor inventory reservation to always lock/update products in sorted id order to reduce deadlock risk for high concurrency.
4. Design an expiration job that invalidates unclaimed vouchers without losing customer entitlements.
5. Implement a Redis pub/sub event stream with polling fallback and give failure modes.
6. Add coupons with per-user one-time redemption using a unique constraint and transaction.
7. Discuss why a deterministic HMAC token can be re-derived but key rotation becomes a migration problem.

## Tests

`npm test` runs Node built-in unit tests with zero external dependencies. Add a Docker/Postgres integration suite before production release to exercise transaction conflict/retry scenarios and roles.
