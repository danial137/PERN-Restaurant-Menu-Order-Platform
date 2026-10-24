import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { DomainError } from './errors.js';

// Deterministic opaque token: server can reconstruct it, DB stores only its SHA-256 hash.
export function createVoucherToken(orderId, secret) {
  if (!secret || secret.length < 32) throw new DomainError('WEAK_SECRET', 'Voucher secret must be at least 32 characters', 500);
  return createHmac('sha256', secret).update(`pickup:v1:${orderId}`).digest('base64url');
}
export function hashVoucherToken(token) { return createHash('sha256').update(token).digest('hex'); }
export function tokensMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
