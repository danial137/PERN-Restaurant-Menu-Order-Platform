import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncRoute } from '../lib/async-route.js';
import { inboxForUser } from '../services/notification.service.js';
const router=Router();
router.use(requireAuth);
const publicPreferences=user=>({phoneNumber:user.phoneNumber,smsOptIn:user.smsOptIn,telegramDemoLinked:user.telegramDemoLinked});
router.get('/preferences',asyncRoute(async(req,res)=>{
  const user=await db.user.findUniqueOrThrow({where:{id:req.actor.id}});
  res.json({preferences:publicPreferences(user)});
}));
router.patch('/preferences',asyncRoute(async(req,res)=>{
  const values=z.object({phoneNumber:z.union([z.string().regex(/^\+?[1-9]\d{7,14}$/),z.null()]).optional(),smsOptIn:z.boolean().optional(),telegramDemoLinked:z.boolean().optional()}).strict().parse(req.body);
  const user=await db.user.findUniqueOrThrow({where:{id:req.actor.id}});
  const phoneNumber=values.phoneNumber===undefined?user.phoneNumber:values.phoneNumber;
  if((values.smsOptIn??user.smsOptIn) && !phoneNumber) return res.status(422).json({error:{code:'PHONE_REQUIRED',message:'برای پیش‌نمایش پیامک یک شماره معتبر ثبت کنید'}});
  const updated=await db.user.update({where:{id:req.actor.id},data:{...values,phoneNumber}});
  res.json({preferences:publicPreferences(updated),demoOnly:true});
}));
router.get('/inbox',asyncRoute(async(req,res)=>res.json({deliveries:await inboxForUser(req.actor.id),demoOnly:true})));
export default router;
