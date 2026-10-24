import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { asyncRoute } from '../lib/async-route.js';
import { requireAuth,requireRole } from '../middleware/auth.js';
import { env } from '../config/env.js';
const router=Router();router.use(requireAuth,requireRole('ADMIN','STAFF'));
router.get('/summary',asyncRoute(async(_req,res)=>{
  const [orders,products,totalSales]=await Promise.all([
    db.order.groupBy({by:['status'],_count:{_all:true}}),
    db.product.count({where:{active:true}}),
    db.order.aggregate({where:{paymentStatus:'PAID',status:{not:'CANCELLED'}},_sum:{totalToman:true}})
  ]);
  res.json({statusCounts:orders.map(x=>({status:x.status,count:x._count._all})),productCount:products,paidSalesToman:totalSales._sum.totalToman??0});
}));
router.get('/tables',asyncRoute(async(_req,res)=>{
  const tables=await db.restaurantTable.findMany({orderBy:{label:'asc'}});
  const results=await Promise.all(tables.map(async table=>{
    const url=`${env.PUBLIC_WEB_URL}/menu?table=${encodeURIComponent(table.qrKey)}`;
    return {...table,url,qr:await QRCode.toDataURL(url,{width:240,margin:1})};
  }));res.json({tables:results});
}));
router.post('/tables',requireRole('ADMIN'),asyncRoute(async(req,res)=>{
  const {label}=z.object({label:z.string().trim().min(1).max(20)}).parse(req.body);
  const table=await db.restaurantTable.create({data:{label,qrKey:randomBytes(14).toString('hex')}});res.status(201).json({table});
}));
export default router;
