import { DomainError } from '@persian-food/domain';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
export function notFound(_req,res){res.status(404).json({error:{code:'NOT_FOUND',message:'مسیر پیدا نشد'}});}
export function errorHandler(error,req,res,_next){
  if(error instanceof ZodError) return res.status(422).json({error:{code:'VALIDATION_ERROR',message:'اطلاعات ورودی نامعتبر است',fields:error.flatten()}});
  if(error instanceof DomainError) return res.status(error.status).json({error:{code:error.code,message:error.message}});
  if(error instanceof Prisma.PrismaClientKnownRequestError){
    if(error.code==='P2002') return res.status(409).json({error:{code:'DUPLICATE',message:'رکورد تکراری است'}});
    if(error.code==='P2034') return res.status(409).json({error:{code:'SERIALIZATION_CONFLICT',message:'هم‌زمانی درخواست‌ها بالا بود؛ دوباره تلاش کنید'}});
    if(error.code==='P2025') return res.status(404).json({error:{code:'NOT_FOUND',message:'رکورد پیدا نشد'}});
  }
  console.error('request failed',req.method,req.path,error);
  return res.status(500).json({error:{code:'SERVER_ERROR',message:'خطای غیرمنتظره سرور'}});
}
