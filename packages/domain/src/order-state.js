import { DomainError } from './errors.js';

export const ORDER_STATUSES = Object.freeze([
  'PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'
]);
const NEXT = Object.freeze({
  PLACED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: []
});
export function canTransition(from, to) { return (NEXT[from] ?? []).includes(to); }
export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new DomainError('INVALID_STATUS_TRANSITION', `Cannot transition ${from} to ${to}`, 409);
  }
}
export function statusProgress(status) {
  return Math.max(0, ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'].indexOf(status));
}
