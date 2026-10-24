import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../lib/async-route.js';
import { requireAuth } from '../middleware/auth.js';
import { confirmMockPayment, createMockPayment, paymentForActor } from '../services/payment.service.js';
const router = Router();
router.use(requireAuth);
router.post('/intents', asyncRoute(async (req,res) => {
  const body = z.object({orderId:z.string().min(1)}).strict().parse(req.body);
  const requestKey=z.string().uuid().parse(req.get('Idempotency-Key'));
  const payment=await createMockPayment(req.actor,{...body,requestKey});
  res.status(201).json({payment});
}));
router.get('/:id',asyncRoute(async(req,res)=>res.json({payment:await paymentForActor(req.actor,req.params.id)})));
router.post('/mock/:id/confirm',asyncRoute(async(req,res)=>res.json({payment:await confirmMockPayment(req.actor,req.params.id)})));
export default router;
