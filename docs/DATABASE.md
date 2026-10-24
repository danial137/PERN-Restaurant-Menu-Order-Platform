# Data model and ER diagram

The authoritative schema is `apps/api/prisma/schema.prisma` (PostgreSQL, Prisma 6). All major tables and indexes below are represented there.

```mermaid
erDiagram
  User ||--o{ Order : places
  Category ||--o{ Product : contains
  Product ||--o{ OrderItem : purchased
  RestaurantTable o|--o{ Order : hosts
  Order ||--|{ OrderItem : has
  Order ||--|{ OrderEvent : tracks
  Order ||--|| Invoice : issues
  Order ||--|| PickupVoucher : creates
  User { string id PK string email UK string passwordHash string role }
  Category { string id PK string slug UK string name int position }
  Product { string id PK string categoryId FK string slug UK int priceToman int stock bool active }
  RestaurantTable { string id PK string label UK string qrKey UK bool active }
  Order { string id PK string number UK string customerId FK string tableId FK string requestId UK string status int totalToman string paymentStatus }
  OrderItem { string id PK string orderId FK string productId FK int quantity int unitPriceToman int lineTotalToman }
  OrderEvent { string id PK string orderId FK string status datetime createdAt }
  Invoice { string id PK string orderId UK string number UK datetime issuedAt }
  PickupVoucher { string id PK string orderId UK string tokenHash UK string status datetime expiresAt datetime redeemedAt }
```

## Concurrency design

- Database `Order.customerId + requestId` uniqueness implements idempotency.
- Database `PickupVoucher.tokenHash` uniqueness prevents duplicate voucher identity.
- `updateMany` with a current status and expected previous state prevents accidental double state transition.
- Inventory decrements only if enough stock exists, in the same transaction that inserts the order.
- Avoid `prisma db push` for ongoing production updates; create Prisma Migrate migrations and run `prisma migrate deploy` after backup.

## Indexes

`Product(categoryId,active)`, `Order(customerId,createdAt)`, `Order(status,createdAt)`, `OrderEvent(orderId,createdAt)`, and all unique fields. Additional indexes should be chosen using real `EXPLAIN ANALYZE` queries.
