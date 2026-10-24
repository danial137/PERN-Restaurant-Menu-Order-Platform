import { DomainError } from './errors.js';

export function estimatedPrepMinutes(lines) {
  if (!Array.isArray(lines) || !lines.length) throw new DomainError('EMPTY_TICKET', 'Empty kitchen ticket');
  // Parallel preparation: longest dish + one minute per additional portion.
  // Replace this strategy via a domain port once historical prep times exist.
  return Math.max(...lines.map(line => line.prepMinutes ?? 12)) +
    Math.max(0, lines.reduce((sum, line) => sum + line.quantity, 0) - 1);
}

export function kitchenPriority(ticket, now = Date.now()) {
  const deadline = new Date(ticket.deadlineAt).getTime();
  if (!Number.isFinite(deadline)) throw new DomainError('BAD_DEADLINE', 'Ticket deadline is invalid');
  return deadline - now;
}

// Binary min-heap. Earlier deadlines first; deterministic tie-break by order ID.
export class KitchenPriorityQueue {
  #heap = [];
  constructor(tickets = []) { for (const ticket of tickets) this.push(ticket); }
  get size() { return this.#heap.length; }
  static #less(a, b) {
    return (new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime()) < 0 ||
      (new Date(a.deadlineAt).getTime() === new Date(b.deadlineAt).getTime() && a.orderId < b.orderId);
  }
  push(ticket) {
    if (!ticket?.orderId || !Number.isFinite(new Date(ticket.deadlineAt).getTime())) throw new DomainError('BAD_TICKET', 'Invalid ticket');
    const a = this.#heap;
    a.push(ticket);
    for (let i = a.length - 1; i > 0;) {
      const parent = (i - 1) >> 1;
      if (!KitchenPriorityQueue.#less(a[i], a[parent])) break;
      [a[i], a[parent]] = [a[parent], a[i]];
      i = parent;
    }
  }
  pop() {
    const a = this.#heap;
    if (!a.length) return null;
    const top = a[0];
    const tail = a.pop();
    if (a.length) {
      a[0] = tail;
      for (let i = 0;;) {
        let child = i * 2 + 1;
        if (child >= a.length) break;
        if (child + 1 < a.length && KitchenPriorityQueue.#less(a[child + 1], a[child])) child++;
        if (!KitchenPriorityQueue.#less(a[child], a[i])) break;
        [a[child], a[i]] = [a[i], a[child]];
        i = child;
      }
    }
    return top;
  }
  sorted() {
    const copy = new KitchenPriorityQueue(this.#heap);
    const result = [];
    while (copy.size) result.push(copy.pop());
    return result;
  }
}

export function retryDelayMs(attempt, jitter = 0) {
  if (!Number.isInteger(attempt) || attempt < 1) throw new DomainError('INVALID_ATTEMPT', 'Invalid retry attempt');
  return Math.min(60_000, 1000 * 2 ** Math.min(attempt - 1, 6)) + Math.max(0, Math.min(1000, jitter));
}
