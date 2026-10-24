import { DomainError } from './errors.js';

export function nonNegativeInteger(value, label = 'amount') {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError('INVALID_AMOUNT', `${label} must be a nonnegative safe integer`);
  }
  return value;
}

export function calculateOrder(items, { discountToman = 0, taxBasisPoints = 0 } = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new DomainError('EMPTY_CART', 'Cart must contain at least one item');
  }
  let subtotal = 0;
  const lines = items.map(({ productId, name, quantity, unitPrice }) => {
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 100) {
      throw new DomainError('INVALID_QUANTITY', 'Quantity must be between 1 and 100');
    }
    nonNegativeInteger(unitPrice, 'unit price');
    const lineTotal = nonNegativeInteger(quantity * unitPrice, 'line total');
    subtotal = nonNegativeInteger(subtotal + lineTotal, 'subtotal');
    return { productId, name, quantity, unitPrice, lineTotal };
  });
  nonNegativeInteger(discountToman, 'discount');
  if (discountToman > subtotal) throw new DomainError('INVALID_DISCOUNT', 'Discount exceeds subtotal');
  if (!Number.isInteger(taxBasisPoints) || taxBasisPoints < 0 || taxBasisPoints > 10000) {
    throw new DomainError('INVALID_TAX', 'Tax must be between 0 and 10000 basis points');
  }
  const taxable = subtotal - discountToman;
  const tax = nonNegativeInteger(Math.round((taxable * taxBasisPoints) / 10000), 'tax');
  const total = nonNegativeInteger(taxable + tax, 'total');
  return { lines, subtotal, discountToman, tax, total, currency: 'TOMAN' };
}

export function formatToman(amount) {
  return `${new Intl.NumberFormat('fa-IR').format(nonNegativeInteger(amount))} تومان`;
}
