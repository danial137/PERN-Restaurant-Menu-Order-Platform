import { expireReservations } from '../services/reservation.service.js';
import { dispatchPendingNotifications } from '../services/notification.service.js';
export async function runOnce() {
  const expired=await expireReservations();
  const notifications=await dispatchPendingNotifications();
  return {expired,notifications};
}
