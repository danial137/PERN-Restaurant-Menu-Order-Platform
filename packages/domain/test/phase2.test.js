import test from 'node:test';
import assert from 'node:assert/strict';
import { KitchenPriorityQueue, estimatedPrepMinutes, retryDelayMs, kitchenPriority } from '../src/index.js';

test('priority heap sorts by earliest kitchen deadline', () => {
  const q = new KitchenPriorityQueue([{orderId:'b', deadlineAt:'2026-10-09T10:30:00Z'}, {orderId:'c',deadlineAt:'2026-10-09T10:10:00Z'}, {orderId:'a',deadlineAt:'2026-10-09T10:10:00Z'}]);
  assert.deepEqual([q.pop().orderId,q.pop().orderId,q.pop().orderId,q.pop()], ['a','c','b',null]);
});
test('heap accepts new urgent tickets',()=>{
  const q=new KitchenPriorityQueue([{orderId:'a',deadlineAt:'2026-10-09T10:20:00Z'}]);
  q.push({orderId:'b',deadlineAt:'2026-10-09T10:00:00Z'});
  assert.equal(q.pop().orderId,'b');
});
test('heap rejects invalid ticket',()=>assert.throws(()=>new KitchenPriorityQueue([{orderId:'x',deadlineAt:'bad'}]),/Invalid ticket/));
test('queue sort is non-destructive',()=>{const q=new KitchenPriorityQueue([{orderId:'a',deadlineAt:'2026-10-09T10:20:00Z'}]); assert.equal(q.sorted().length,1);assert.equal(q.size,1);});
test('prep estimate counts additional portions',()=>assert.equal(estimatedPrepMinutes([{quantity:2,prepMinutes:14},{quantity:1,prepMinutes:10}]),16));
test('prep estimate rejects empty',()=>assert.throws(()=>estimatedPrepMinutes([]),/Empty/));
test('priority can be overdue',()=>assert.equal(kitchenPriority({deadlineAt:'2026-10-09T10:00:00Z'},Date.parse('2026-10-09T10:01:00Z')),-60000));
test('exponential backoff is capped and adds bounded jitter',()=>{assert.equal(retryDelayMs(1),1000);assert.equal(retryDelayMs(2),2000);assert.equal(retryDelayMs(50,1500),61000);});
import { assertPaymentEligible, nextKitchenOrderStatus } from '../src/index.js';
test('held inventory is payable before reservation expiry',()=>assert.doesNotThrow(()=>assertPaymentEligible({status:'PLACED',inventoryState:'HELD',reservedUntil:'2026-10-09T12:00:00Z'},new Date('2026-10-09T11:59:59Z'))));
test('expired reservation rejects payment',()=>assert.throws(()=>assertPaymentEligible({status:'PLACED',inventoryState:'HELD',reservedUntil:'2026-10-09T12:00:00Z'},new Date('2026-10-09T12:00:00Z')),e=>e.code==='RESERVATION_EXPIRED'));
test('released inventory rejects payment',()=>assert.throws(()=>assertPaymentEligible({status:'PLACED',inventoryState:'RELEASED'}),/آزاد/));
test('cancelled order cannot be paid',()=>assert.throws(()=>assertPaymentEligible({status:'CANCELLED',inventoryState:'COMMITTED'}),e=>e.code==='ORDER_NOT_PAYABLE'));
test('kitchen maps cooking transition to preparing',()=>assert.equal(nextKitchenOrderStatus('QUEUED','COOKING'),'PREPARING'));
test('kitchen maps ready transition',()=>assert.equal(nextKitchenOrderStatus('COOKING','READY'),'READY'));
test('kitchen refuses skipped states',()=>assert.throws(()=>nextKitchenOrderStatus('QUEUED','READY'),e=>e.code==='INVALID_KITCHEN_TRANSITION'));
