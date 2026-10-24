import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import {
  DomainError,
  calculateOrder,
  assertTransition,
  createVoucherToken,
  hashVoucherToken
} from '@persian-food/domain';
import { db } from '../lib/db.js';
import { env } from '../config/env.js';

export const orderInclude = {
  items: true,
  events: { orderBy: { createdAt: 'asc' } },
  invoice: true,
  table: { select: { label: true } },
  voucher: { select: { status: true, expiresAt: true, redeemedAt: true } }
};

export function assertOrderAccess(order, actor) {
  if (!order) throw new DomainError('ORDER_NOT_FOUND', 'سفارش پیدا نشد', 404);
  if (actor.role === 'CUSTOMER' && order.customerId !== actor.id) {
    throw new DomainError('FORBIDDEN', 'دسترسی به سفارش مجاز نیست', 403);
  }
}

function mergeQuantities(items) {
  const quantities = new Map();
  for (const { productId, quantity } of items) {
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }
  if ([...quantities.values()].some(quantity => quantity > 100)) {
    throw new DomainError('INVALID_QUANTITY', 'حداکثر تعداد هر آیتم ۱۰۰ است');
  }
  return quantities;
}

function createNumber(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function tableIdForOrder(tx, input) {
  if (input.type !== 'DINE_IN') return null;
  if (!input.tableKey) throw new DomainError('TABLE_REQUIRED', 'برای سفارش حضوری کد میز لازم است');
  const table = await tx.restaurantTable.findFirst({ where: { qrKey: input.tableKey, active: true } });
  if (!table) throw new DomainError('TABLE_NOT_FOUND', 'کد میز معتبر نیست', 404);
  return table.id;
}

async function reserveStock(tx, quantities, menuById) {
  // Every conditional decrement participates in the same DB transaction.
  // If any product is unavailable, ALL stock changes roll back.
  for (const [productId, quantity] of quantities) {
    const result = await tx.product.updateMany({
      where: { id: productId, active: true, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } }
    });
    if (result.count !== 1) {
      throw new DomainError('OUT_OF_STOCK', `موجودی ${menuById.get(productId).name} کافی نیست`, 409);
    }
  }
}

async function placeOrderTransaction(tx, actor, input, quantities) {
  const products = await tx.product.findMany({
    where: { id: { in: [...quantities.keys()] }, active: true }
  });
  if (products.length !== quantities.size) {
    throw new DomainError('PRODUCT_UNAVAILABLE', 'بعضی آیتم‌ها دیگر قابل سفارش نیستند', 409);
  }
  const menuById = new Map(products.map(product => [product.id, product]));
  const items = [...quantities].map(([productId, quantity]) => ({
    productId,
    quantity,
    name: menuById.get(productId).name,
    unitPrice: menuById.get(productId).priceToman
  }));
  const quote = calculateOrder(items);
  const tableId = await tableIdForOrder(tx, input);
  await reserveStock(tx, quantities, menuById);

  const orderId = randomUUID();
  const voucherToken = createVoucherToken(orderId, env.VOUCHER_SECRET);
  return tx.order.create({
    data: {
      id: orderId,
      number: createNumber('PF'),
      customerId: actor.id,
      requestId: input.requestId,
      type: input.type,
      tableId,
      notes: input.notes ?? '',
      inventoryState: 'HELD',
      reservedUntil: new Date(Date.now() + 15 * 60 * 1000),
      subtotalToman: quote.subtotal,
      discountToman: quote.discountToman,
      taxToman: quote.tax,
      totalToman: quote.total,
      items: {
        create: quote.lines.map(line => ({
          productId: line.productId,
          nameSnapshot: line.name,
          unitPriceToman: line.unitPrice,
          quantity: line.quantity,
          lineTotalToman: line.lineTotal
        }))
      },
      events: { create: { status: 'PLACED', note: 'سفارش ثبت شد' } },
      invoice: { create: { number: createNumber('INV') } },
      voucher: {
        create: {
          tokenHash: hashVoucherToken(voucherToken),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      }
    },
    include: orderInclude
  });
}

export async function createOrder(actor, input) {
  const requestId = input.requestId;
  const existing = await db.order.findUnique({
    where: { customerId_requestId: { customerId: actor.id, requestId } },
    include: orderInclude
  });
  if (existing) return { order: existing, created: false };

  const quantities = mergeQuantities(input.items);
  try {
    const order = await db.$transaction(
      tx => placeOrderTransaction(tx, actor, input, quantities),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 12000 }
    );
    return { order, created: true };
  } catch (error) {
    if (error.code === 'P2002') {
      const order = await db.order.findUnique({
        where: { customerId_requestId: { customerId: actor.id, requestId } },
        include: orderInclude
      });
      if (order) return { order, created: false };
    }
    if (error.code === 'P2034') {
      throw new DomainError('PLEASE_RETRY', 'ترافیک هم‌زمان بالا بود؛ مجدداً امتحان کنید', 409);
    }
    throw error;
  }
}

async function restoreCancelledInventory(tx, order) {
  if (order.inventoryState !== 'RELEASED') {
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } }
      });
    }
    await tx.order.update({ where: { id: order.id }, data: { inventoryState: 'RELEASED' } });
  }
  await tx.pickupVoucher.update({ where: { orderId: order.id }, data: { status: 'VOID' } });
}

async function syncKitchenTicket(tx, orderId, target, expectedVersion) {
  if (!['PREPARING', 'READY'].includes(target)) return;
  const where = {
    orderId,
    ...(expectedVersion === null ? {} : { version: expectedVersion })
  };
  const changed = await tx.kitchenTicket.updateMany({
    where,
    data: {
      status: target === 'PREPARING' ? 'COOKING' : 'READY',
      version: { increment: 1 },
      ...(target === 'PREPARING' ? { startedAt: new Date() } : { readyAt: new Date() })
    }
  });
  if (changed.count !== 1) {
    throw new DomainError('KITCHEN_CONFLICT', 'تیکت آشپزخانه تغییر کرده است؛ صفحه را تازه کنید', 409);
  }
}

export async function transitionOrder(orderId, target, actor, expectedVersion = null) {
  return db.$transaction(async tx => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    assertOrderAccess(order, actor);
    assertTransition(order.status, target);
    if (target !== 'CANCELLED' && order.paymentStatus !== 'PAID') {
      throw new DomainError('PAYMENT_REQUIRED', 'ابتدا پرداخت سفارش را ثبت کنید', 409);
    }
    if (target === 'CANCELLED' && order.paymentStatus === 'PAID') {
      throw new DomainError('REFUND_REQUIRED', 'سفارش پرداخت‌شده باید ابتدا از مسیر بازپرداخت رسیدگی شود', 409);
    }
    const moved = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: target }
    });
    if (moved.count !== 1) {
      throw new DomainError('CONFLICT', 'وضعیت سفارش تغییر کرده؛ صفحه را تازه کنید', 409);
    }
    if (target === 'CANCELLED') await restoreCancelledInventory(tx, order);
    await syncKitchenTicket(tx, orderId, target, expectedVersion);
    if (target === 'READY') {
      await tx.outboxEvent.upsert({
        where: { orderId_type: { orderId, type: 'ORDER_READY' } },
        update: {},
        create: { orderId, type: 'ORDER_READY' }
      });
    }
    await tx.orderEvent.create({
      data: { orderId, status: target, note: `تغییر وضعیت توسط ${actor.role}` }
    });
    return tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
  });
}

export async function redeemVoucher(token, actor) {
  return db.$transaction(async tx => {
    const tokenHash = hashVoucherToken(token);
    const voucher = await tx.pickupVoucher.findUnique({
      where: { tokenHash },
      include: { order: true }
    });
    if (!voucher) throw new DomainError('VOUCHER_NOT_FOUND', 'ووچر معتبر نیست', 404);
    if (voucher.status !== 'ISSUED') throw new DomainError('VOUCHER_USED', 'ووچر قبلاً مصرف یا باطل شده است', 409);
    if (voucher.expiresAt.getTime() < Date.now()) throw new DomainError('VOUCHER_EXPIRED', 'اعتبار ووچر تمام شده است', 409);
    if (voucher.order.status !== 'READY') throw new DomainError('ORDER_NOT_READY', 'سفارش هنوز آماده تحویل نیست', 409);
    if (voucher.order.paymentStatus !== 'PAID') throw new DomainError('PAYMENT_REQUIRED', 'ابتدا پرداخت سفارش را ثبت کنید', 409);

    const used = await tx.pickupVoucher.updateMany({
      where: { id: voucher.id, status: 'ISSUED' },
      data: { status: 'REDEEMED', redeemedAt: new Date() }
    });
    if (used.count !== 1) throw new DomainError('VOUCHER_USED', 'ووچر قبلاً مصرف شده است', 409);
    const moved = await tx.order.updateMany({
      where: { id: voucher.orderId, status: 'READY' },
      data: { status: 'COMPLETED' }
    });
    if (moved.count !== 1) throw new DomainError('CONFLICT', 'وضعیت سفارش تغییر کرده است', 409);
    await tx.kitchenTicket.updateMany({
      where: { orderId: voucher.orderId, status: 'READY' },
      data: { status: 'FINISHED', version: { increment: 1 } }
    });
    await tx.orderEvent.create({
      data: { orderId: voucher.orderId, status: 'COMPLETED', note: `تحویل توسط ${actor.role}` }
    });
    return tx.order.findUnique({ where: { id: voucher.orderId }, include: orderInclude });
  });
}

export async function orderForActor(orderId, actor) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: orderInclude });
  assertOrderAccess(order, actor);
  return order;
}
