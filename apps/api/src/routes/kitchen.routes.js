import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../lib/async-route.js';
import { requireAuth,requireRole } from '../middleware/auth.js';
import { advanceKitchenTicket,kitchenSnapshot,kitchenMetrics } from '../services/kitchen.service.js';
const router=Router();
router.use(requireAuth,requireRole('STAFF','ADMIN'));
router.get('/tickets',asyncRoute(async(_req,res)=>res.json(await kitchenSnapshot())));
router.get('/metrics',asyncRoute(async(_req,res)=>res.json(await kitchenMetrics())));
router.patch('/tickets/:id/status',asyncRoute(async(req,res)=>{
  const input=z.object({status:z.enum(['COOKING','READY']),expectedVersion:z.number().int().nonnegative()}).strict().parse(req.body);
  res.json({ticket:await advanceKitchenTicket({ticketId:req.params.id,...input,actor:req.actor})});
}));
router.get('/events',asyncRoute(async(req,res)=>{
  res.setHeader('Content-Type','text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control','no-cache, no-transform');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders?.();
  let closed=false;let busy=false;let previous='';
  req.on('close',()=>{closed=true;clearInterval(timer);});
  const emit=async()=>{
    if(closed || busy)return;
    busy=true;
    try{
      const snapshot=await kitchenSnapshot();
      const signature=JSON.stringify(snapshot.tickets.map(t=>[t.id,t.version,t.status]));
      if(signature!==previous){previous=signature;res.write(`event: kitchen\ndata: ${JSON.stringify(snapshot)}\n\n`);}
      else res.write(': heartbeat\n\n');
    } catch(error){console.error('KDS stream failed:',error);res.write('event: reconnect\ndata: {}\n\n');}
    finally{busy=false;}
  };
  const timer=setInterval(()=>void emit(),4000);
  void emit();
}));
export default router;
