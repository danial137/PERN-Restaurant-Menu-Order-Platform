import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { DomainError } from '@persian-food/domain';

export function createSession(user){ return jwt.sign({sub:user.id,role:user.role},env.JWT_SECRET,{expiresIn:'7d',issuer:'persian-food'}); }
export function requireAuth(req,_res,next){
  try{
    const token=req.cookies?.pf_session;
    if(!token) throw new Error('missing cookie');
    const claims=jwt.verify(token,env.JWT_SECRET,{issuer:'persian-food'});
    req.actor={id:claims.sub,role:claims.role};
    next();
  }catch{next(new DomainError('UNAUTHORIZED','برای ادامه وارد حساب شوید',401));}
}
export function requireRole(...roles){return (req,_res,next)=>req.actor && roles.includes(req.actor.role)?next():next(new DomainError('FORBIDDEN','دسترسی مجاز نیست',403));}
export function sameOrigin(req,_res,next){
  // Browsers send Origin for cross-site fetch. Reject untrusted origins for mutating operations.
  if(['POST','PUT','PATCH','DELETE'].includes(req.method) && req.headers.origin && req.headers.origin!==env.WEB_ORIGIN){
    return next(new DomainError('INVALID_ORIGIN','درخواست از مبدا نامعتبر',403));
  }
  next();
}
