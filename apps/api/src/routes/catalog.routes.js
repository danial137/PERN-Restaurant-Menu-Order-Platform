import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { asyncRoute } from '../lib/async-route.js';
import { requireAuth,requireRole } from '../middleware/auth.js';
const router=Router();
router.get('/menu',asyncRoute(async(_req,res)=>{
  const [categories,products]=await Promise.all([
    db.category.findMany({where:{active:true},orderBy:{position:'asc'}}),
    db.product.findMany({where:{active:true},orderBy:{name:'asc'}})
  ]);
  res.json({categories,products});
}));
router.get('/tables/:qrKey',asyncRoute(async(req,res)=>{
  const table=await db.restaurantTable.findFirst({where:{qrKey:req.params.qrKey,active:true},select:{id:true,label:true,qrKey:true}});
  if(!table) return res.status(404).json({error:{code:'NOT_FOUND',message:'میز پیدا نشد'}});
  res.json({table});
}));
router.get('/admin/products',requireAuth,requireRole('ADMIN','STAFF'),asyncRoute(async(_req,res)=>{
  const [categories,products]=await Promise.all([db.category.findMany({orderBy:{position:'asc'}}),db.product.findMany({orderBy:{name:'asc'}})]);
  res.json({categories,products});
}));
router.patch('/admin/products/:id',requireAuth,requireRole('ADMIN','STAFF'),asyncRoute(async(req,res)=>{
  const values=z.object({name:z.string().min(2).max(90).optional(),description:z.string().max(500).optional(),priceToman:z.number().int().nonnegative().max(100000000).optional(),stock:z.number().int().nonnegative().max(100000).optional(),active:z.boolean().optional()}).strict().parse(req.body);
  const product=await db.product.update({where:{id:req.params.id},data:values});res.json({product});
}));
router.post('/admin/products',requireAuth,requireRole('ADMIN'),asyncRoute(async(req,res)=>{
  const data=z.object({name:z.string().min(2).max(90),slug:z.string().regex(/^[a-z0-9-]+$/),description:z.string().max(500).default(''),categoryId:z.string(),priceToman:z.number().int().nonnegative(),stock:z.number().int().nonnegative().default(0)}).parse(req.body);
  const product=await db.product.create({data});res.status(201).json({product});
}));
export default router;
