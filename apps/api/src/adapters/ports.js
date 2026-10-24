/**
 * Adapter contracts for the application layer.
 * @typedef {Object} PaymentGatewayPort
 * @property {(attempt: object) => Promise<object>} createCheckoutSession
 * @property {(attempt: object) => Promise<{verified:boolean}>} verifyPayment
 *
 * @typedef {Object} NotificationChannelPort
 * @property {string} channel
 * @property {(message:object) => Promise<{preview:string}>} send
 *
 * Future real providers implement the same contract, but MUST verify signed
 * webhooks and amounts server-side before finalizing payment.
 */
export {};
