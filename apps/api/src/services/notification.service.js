import { db } from '../lib/db.js';
import { mockSmsAdapter, mockTelegramAdapter } from '../adapters/mock-notification.adapter.js';
import { retryDelayMs } from '@persian-food/domain';

function messageFor(event) {
  if (event.type==='PAYMENT_SUCCEEDED') return `پرشین فود: پرداخت آزمایشی سفارش ${event.order.number} ثبت شد. لطفاً وضعیت را در پنل مشاهده کنید.`;
  if (event.type==='ORDER_READY') return `پرشین فود: سفارش ${event.order.number} آماده تحویل است. ووچر را در پنل مشتری ارائه کنید.`;
  throw new Error('Unsupported notification event');
}

async function dispatch(event){
  const {customer} = event.order;
  const message = messageFor(event);
  // A channel is enabled by explicit user opt-in only.
  const deliveries=[];
  if(customer.smsOptIn && customer.phoneNumber) deliveries.push({channel:'SMS',adapter:mockSmsAdapter,destination:{phone:customer.phoneNumber}});
  if(customer.telegramDemoLinked) deliveries.push({channel:'TELEGRAM',adapter:mockTelegramAdapter,destination:{chatId:`demo:${customer.id}`}});
  for(const delivery of deliveries){
    // Unique(eventId,channel) avoids duplicate inbox entries even after a worker crash.
    const prior=await db.notificationDelivery.findUnique({where:{eventId_channel:{eventId:event.id,channel:delivery.channel}}});
    if(prior)continue;
    const {preview}=await delivery.adapter.send({...delivery.destination,message});
    await db.notificationDelivery.upsert({
      where:{eventId_channel:{eventId:event.id,channel:delivery.channel}},update:{},
      create:{eventId:event.id,channel:delivery.channel,userId:customer.id,body:preview}
    });
  }
}

export async function dispatchPendingNotifications({take=20,now=new Date()}={}){
  const events=await db.outboxEvent.findMany({
    where:{availableAt:{lte:now},OR:[{status:'PENDING'},{status:'PROCESSING',lockedUntil:{lt:now}}]},
    select:{id:true},take,orderBy:{createdAt:'asc'}
  });
  let delivered=0;
  for(const event of events){
    const claimed=await db.outboxEvent.updateMany({
      where:{id:event.id,availableAt:{lte:now},OR:[{status:'PENDING'},{status:'PROCESSING',lockedUntil:{lt:now}}]},
      data:{status:'PROCESSING',attempts:{increment:1},lockedUntil:new Date(now.getTime()+90_000)}
    });
    if(claimed.count!==1)continue;
    const current=await db.outboxEvent.findUnique({where:{id:event.id},include:{order:{include:{customer:true}}}});
    try{
      await dispatch(current);
      await db.outboxEvent.update({where:{id:event.id},data:{status:'DONE',lockedUntil:null,completedAt:new Date()}});
      delivered++;
    }catch(error){
      console.error('Mock notification dispatch failed',event.id,error);
      const retryAt=new Date(Date.now()+retryDelayMs(current.attempts,Math.floor(Math.random()*1000)));
      const exhausted=current.attempts>=8;
      await db.outboxEvent.update({
        where:{id:event.id},
        data:{status:exhausted?'FAILED':'PENDING',lockedUntil:null,availableAt:retryAt}
      });
    }
  }
  return {claimed:events.length,delivered};
}

export async function inboxForUser(userId){
  return db.notificationDelivery.findMany({where:{userId},select:{id:true,channel:true,body:true,sentAt:true},orderBy:{sentAt:'desc'},take:40});
}
