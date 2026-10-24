import { DomainError } from './errors.js';

export function assertPaymentEligible(order, at = new Date()) {
  if (['CANCELLED','COMPLETED'].includes(order.status)) throw new DomainError('ORDER_NOT_PAYABLE','این سفارش قابل پرداخت نیست',409);
  if (order.inventoryState === 'RELEASED') throw new DomainError('RESERVATION_EXPIRED','موجودی رزروشده آزاد شده است',409);
  if (order.inventoryState === 'HELD' && order.reservedUntil && new Date(order.reservedUntil) <= at) {
    throw new DomainError('RESERVATION_EXPIRED','مهلت رزرو سفارش تمام شده است',409);
  }
}

export function nextKitchenOrderStatus(currentTicketStatus, requestedStatus) {
  const NEXT = { QUEUED:'COOKING', COOKING:'READY' };
  if (NEXT[currentTicketStatus] !== requestedStatus) {
    throw new DomainError('INVALID_KITCHEN_TRANSITION','تغییر وضعیت آشپزخانه مجاز نیست',409);
  }
  return requestedStatus === 'COOKING' ? 'PREPARING' : 'READY';
}
