import { Prisma } from '@prisma/client';
import { db } from '../lib/db.js';

/** Worker-only; stock is returned once using compare-and-set in a serializable transaction. */
export async function expireReservations({batchSize=30,now=new Date()}={}) {
  const candidates=await db.order.findMany({
    where:{inventoryState:'HELD',paymentStatus:'UNPAID',reservedUntil:{lt:now},status:{not:'CANCELLED'}},
    select:{id:true},take:batchSize,orderBy:{reservedUntil:'asc'}
  });
  let expired=0;
  for(const {id} of candidates){
    try {
      const didExpire=await db.$transaction(async tx=>{
        const order=await tx.order.findUnique({where:{id},include:{items:true}});
        if(!order || order.inventoryState!=='HELD' || order.paymentStatus!=='UNPAID' || !order.reservedUntil || order.reservedUntil>=now) return false;
        const moved=await tx.order.updateMany({where:{id,inventoryState:'HELD',paymentStatus:'UNPAID',status:{not:'CANCELLED'}},data:{inventoryState:'RELEASED',status:'CANCELLED'}});
        if(moved.count!==1) return false;
        for(const item of order.items) await tx.product.update({where:{id:item.productId},data:{stock:{increment:item.quantity}}});
        await tx.pickupVoucher.update({where:{orderId:id},data:{status:'VOID'}});
        await tx.orderEvent.create({data:{orderId:id,status:'CANCELLED',note:'مهلت پرداخت به پایان رسید'}});
        return true;
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:12000});
      if(didExpire)expired++;
    } catch(error){ if(error.code!=='P2034')throw error; }
  }
  return expired;
}
