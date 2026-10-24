import { db } from '../lib/db.js';
import { KitchenPriorityQueue, DomainError, nextKitchenOrderStatus } from '@persian-food/domain';
import { transitionOrder } from './order.service.js';

const include={order:{select:{id:true,number:true,notes:true,type:true,status:true,paymentStatus:true,items:{select:{nameSnapshot:true,quantity:true}}}}};
export async function kitchenSnapshot(){
  const tickets=await db.kitchenTicket.findMany({where:{status:{in:['QUEUED','COOKING']}},include,take:200});
  const heap=new KitchenPriorityQueue(tickets);
  const active=heap.sorted();
  const ready=await db.kitchenTicket.findMany({where:{status:'READY'},include,orderBy:{readyAt:'desc'},take:30});
  return {tickets:[...active,...ready],serverTime:new Date().toISOString()};
}
export async function kitchenMetrics(){
  const [queued,cooking,ready,overdue]=await Promise.all([
    db.kitchenTicket.count({where:{status:'QUEUED'}}),
    db.kitchenTicket.count({where:{status:'COOKING'}}),
    db.kitchenTicket.count({where:{status:'READY'}}),
    db.kitchenTicket.count({where:{status:{in:['QUEUED','COOKING']},deadlineAt:{lt:new Date()}}})
  ]);
  return {queued,cooking,ready,overdue};
}
export async function advanceKitchenTicket({ticketId,status,expectedVersion,actor}){
  const ticket=await db.kitchenTicket.findUnique({where:{id:ticketId}});
  if(!ticket)throw new DomainError('TICKET_NOT_FOUND','تیکت پیدا نشد',404);
  if(ticket.version!==expectedVersion) throw new DomainError('KITCHEN_CONFLICT','نسخه تیکت قدیمی است؛ صفحه را تازه کنید',409);
  const target=nextKitchenOrderStatus(ticket.status,status);
  await transitionOrder(ticket.orderId,target,actor,expectedVersion);
  return db.kitchenTicket.findUnique({where:{id:ticketId},include});
}
