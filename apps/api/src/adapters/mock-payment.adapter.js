/**
 * PaymentGatewayPort contract:
 * - createCheckoutSession(attempt): returns non-secret checkout metadata
 * - verifyPayment(attempt): verifies a provider transaction server-side
 *
 * MOCK NEVER contacts a gateway. Real implementation must verify provider signature,
 * exact amount + currency + reference, and cannot trust browser redirect alone.
 */
export const mockPaymentGateway = Object.freeze({
  provider: 'MOCK',
  async createCheckoutSession(attempt) {
    return { paymentId: attempt.id, provider:'MOCK', status:attempt.status, amountToman:attempt.amountToman };
  },
  async verifyPayment() {
    return {verified:true}; // Called only through dev-only, authenticated mock confirmation endpoint.
  }
});
