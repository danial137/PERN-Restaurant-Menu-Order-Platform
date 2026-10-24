import { Prisma } from '@prisma/client';
import { db } from '../lib/db.js';
import { env } from '../config/env.js';
import { DomainError, estimatedPrepMinutes, assertPaymentEligible } from '@persian-food/domain';
import { mockPaymentGateway } from '../adapters/mock-payment.adapter.js';
import { assertOrderAccess, orderInclude } from './order.service.js';

function assertMockEnabled() {
  if (!env.MOCK_PAYMENTS_ENABLED || env.NODE_ENV === 'production') {
    throw new DomainError('MOCK_DISABLED','پرداخت آزمایشی در این محیط غیرفعال است',403);
  }
}


export async function createMockPayment(actor, { orderId, requestKey }) {
  assertMockEnabled();
  const order = await db.order.findUnique({ where:{id:orderId} });
  assertOrderAccess(order, actor);
  assertPaymentEligible(order);
  if (order.paymentStatus === 'PAID') throw new DomainError('ALREADY_PAID','این سفارش پرداخت شده است',409);
  const attempt = await db.paymentAttempt.upsert({
    where:{orderId_requestKey:{orderId,requestKey}},
    update:{},
    create:{orderId,requestKey,provider:'MOCK',amountToman:order.totalToman}
  });
  return mockPaymentGateway.createCheckoutSession(attempt);
}

async function finalizePayment(tx, order, source) {
  assertPaymentEligible(order);
  if (order.paymentStatus === 'PAID') return false;
  const updated = await tx.order.updateMany({
    where:{id:order.id,paymentStatus:'UNPAID',status:{notIn:['CANCELLED','COMPLETED']},inventoryState:{not:'RELEASED'}},
    data:{paymentStatus:'PAID',inventoryState:'COMMITTED',status:order.status==='PLACED'?'ACCEPTED':order.status}
  });
  if (updated.count !== 1) throw new DomainError('PAYMENT_CONFLICT','سفارش هم‌زمان تغییر کرده است',409);
  if (order.status === 'PLACED') await tx.orderEvent.create({data:{orderId:order.id,status:'ACCEPTED',note:`پرداخت ${source} تأیید شد`}});
  const items = await tx.orderItem.findMany({where:{orderId:order.id}});
  const estimatedMin = estimatedPrepMinutes(items);
  await tx.kitchenTicket.upsert({
    where:{orderId:order.id},update:{},
    create:{orderId:order.id,estimatedMin,deadlineAt:new Date(Date.now()+estimatedMin*60000)}
  });
  await tx.outboxEvent.upsert({
    where:{orderId_type:{orderId:order.id,type:'PAYMENT_SUCCEEDED'}},update:{},
    create:{orderId:order.id,type:'PAYMENT_SUCCEEDED'}
  });
  return true;
}

export async function confirmMockPayment(actor, paymentId) {
  assertMockEnabled();
  return db.$transaction(async tx => {
    const attempt = await tx.paymentAttempt.findUnique({where:{id:paymentId},include:{order:true}});
    if (!attempt) throw new DomainError('PAYMENT_NOT_FOUND','تراکنش پیدا نشد',404);
    assertOrderAccess(attempt.order, actor);
    if (attempt.provider !== 'MOCK') throw new DomainError('INVALID_PROVIDER','درگاه پرداخت نامعتبر است',409);
    if (attempt.status === 'SUCCEEDED') return {paymentId,status:'SUCCEEDED',orderId:attempt.orderId,alreadyConfirmed:true};
    if (attempt.status !== 'PENDING') throw new DomainError('PAYMENT_FAILED','این تراکنش قابل تأیید نیست',409);
    if (attempt.order.paymentStatus === 'PAID') throw new DomainError('ALREADY_PAID','سفارش با تراکنش دیگری پرداخت شده است',409);
    if (attempt.amountToman !== attempt.order.totalToman) throw new DomainError('AMOUNT_MISMATCH','مبلغ تراکنش معتبر نیست',409);
    const verified = await mockPaymentGateway.verifyPayment(attempt);
    if (!verified.verified) throw new DomainError('PAYMENT_REJECTED','پرداخت تأیید نشد',409);
    await finalizePayment(tx,attempt.order,'آزمایشی');
    const changed = await tx.paymentAttempt.updateMany({where:{id:paymentId,status:'PENDING'},data:{status:'SUCCEEDED',confirmedAt:new Date()}});
    if (changed.count !== 1) throw new DomainError('PAYMENT_CONFLICT','تراکنش تغییر کرده است',409);
    return {paymentId,status:'SUCCEEDED',orderId:attempt.orderId,alreadyConfirmed:false};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:12000});
}

export async function recordOfflinePayment(actor, orderId) {
  if (!['STAFF','ADMIN'].includes(actor.role)) throw new DomainError('FORBIDDEN','فقط کارکنان مجاز هستند',403);
  return db.$transaction(async tx => {
    const order = await tx.order.findUnique({where:{id:orderId}});
    if (!order) throw new DomainError('ORDER_NOT_FOUND','سفارش پیدا نشد',404);
    if (order.paymentStatus !== 'PAID') await finalizePayment(tx,order,'حضوری');
    return tx.order.findUnique({where:{id:orderId},include:orderInclude});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:12000});
}

export async function paymentForActor(actor, id) {
  const attempt = await db.paymentAttempt.findUnique({where:{id},include:{order:{select:{customerId:true}}}});
  if (!attempt) throw new DomainError('PAYMENT_NOT_FOUND','تراکنش پیدا نشد',404);
  if (actor.role==='CUSTOMER' && attempt.order.customerId!==actor.id) throw new DomainError('FORBIDDEN','دسترسی مجاز نیست',403);
  return {id:attempt.id,orderId:attempt.orderId,status:attempt.status,amountToman:attempt.amountToman,provider:attempt.provider};
}
