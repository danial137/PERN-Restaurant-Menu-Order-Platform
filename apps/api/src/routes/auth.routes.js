import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../lib/db.js';
import { env } from '../config/env.js';
import { asyncRoute } from '../lib/async-route.js';
import { createSession,requireAuth } from '../middleware/auth.js';
import { DomainError } from '@persian-food/domain';
const router=Router();
const cookieOptions={httpOnly:true,secure:env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:7*86400000};
const authShape=z.object({email:z.string().email().max(255).transform(v=>v.toLowerCase()),password:z.string().min(10).max(128)});
const publicUser=user=>({id:user.id,name:user.name,email:user.email,role:user.role});
router.post('/register',asyncRoute(async(req,res)=>{
  const data=authShape.extend({name:z.string().trim().min(2).max(80)}).parse(req.body);
  const user=await db.user.create({data:{name:data.name,email:data.email,passwordHash:await bcrypt.hash(data.password,12)}});
  res.cookie('pf_session',createSession(user),cookieOptions).status(201).json({user:publicUser(user)});
}));
router.post('/login',asyncRoute(async(req,res)=>{
  const {email,password}=authShape.parse(req.body);
  const user=await db.user.findUnique({where:{email}});
  if(!user || !(await bcrypt.compare(password,user.passwordHash))) throw new DomainError('INVALID_CREDENTIALS','ایمیل یا رمز عبور صحیح نیست',401);
  res.cookie('pf_session',createSession(user),cookieOptions).json({user:publicUser(user)});
}));
router.get('/me',requireAuth,asyncRoute(async(req,res)=>{
  const user=await db.user.findUnique({where:{id:req.actor.id}});
  if(!user) throw new DomainError('UNAUTHORIZED','حساب وجود ندارد',401);
  res.json({user:publicUser(user)});
}));
router.post('/logout',(_req,res)=>res.clearCookie('pf_session',{path:'/',sameSite:'lax',secure:env.NODE_ENV==='production'}).json({ok:true}));
export default router;
