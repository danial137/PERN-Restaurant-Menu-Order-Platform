import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { db } from '../lib/db.js';
import { env } from '../config/env.js';
import { asyncRoute } from '../lib/async-route.js';
import { requireAuth,requireRole } from '../middleware/auth.js';
import { createOrder,transitionOrder,orderForActor,redeemVoucher,orderInclude } from '../services/order.service.js';
import { createVoucherToken } from '@persian-food/domain';
import { recordOfflinePayment } from '../services/payment.service.js';
const router=Router();
router.use(requireAuth);
const newOrderShape=z.object({type:z.enum(['TAKEAWAY','DINE_IN']),tableKey:z.string().optional(),notes:z.string().max(400).optional(),requestId:z.string().uuid(),items:z.array(z.object({productId:z.string().min(1),quantity:z.number().int().min(1).max(100)})).min(1).max(40)});
router.post('/',asyncRoute(async(req,res)=>{
  const {order,created}=await createOrder(req.actor,newOrderShape.parse(req.body));
  res.status(created?201:200).json({order,created});
}));
router.get('/',asyncRoute(async(req,res)=>{
  const orders=await db.order.findMany({where:req.actor.role==='CUSTOMER'?{customerId:req.actor.id}:{},include:{items:true,invoice:true},orderBy:{createdAt:'desc'},take:100});res.json({orders});
}));
router.get('/:id',asyncRoute(async(req,res)=>res.json({order:await orderForActor(req.params.id,req.actor)})));
router.get('/:id/voucher',asyncRoute(async(req,res)=>{
  const order=await orderForActor(req.params.id,req.actor);
  const token=createVoucherToken(order.id,env.VOUCHER_SECRET);
  const url=`${env.PUBLIC_WEB_URL}/voucher/${encodeURIComponent(token)}`;
  const qr=await QRCode.toDataURL(url,{margin:1,width:360,errorCorrectionLevel:'M'});
  res.json({token,url,qr,invoice:order.invoice,number:order.number,expiresAt:order.voucher?.expiresAt,status:order.voucher?.status});
}));
router.patch('/:id/status',requireRole('STAFF','ADMIN'),asyncRoute(async(req,res)=>{
  const {status}=z.object({status:z.enum(['ACCEPTED','PREPARING','READY','COMPLETED','CANCELLED'])}).parse(req.body);
  if(status==='COMPLETED') return res.status(409).json({error:{code:'REDEEM_REQUIRED',message:'تکمیل سفارش فقط با مصرف ووچر انجام می‌شود'}});
  res.json({order:await transitionOrder(req.params.id,status,req.actor)});
}));
router.patch('/:id/payment',requireRole('STAFF','ADMIN'),asyncRoute(async(req,res)=>res.json({order:await recordOfflinePayment(req.actor,req.params.id)})));
router.post('/vouchers/redeem',requireRole('STAFF','ADMIN'),asyncRoute(async(req,res)=>{
  const {token}=z.object({token:z.string().min(32).max(256)}).parse(req.body);
  res.json({order:await redeemVoucher(token,req.actor)});
}));
export default router;
