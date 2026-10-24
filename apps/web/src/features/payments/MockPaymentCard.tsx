import { useRef, useState } from 'react';
import { CheckCircle2, CreditCard, FlaskConical } from 'lucide-react';
import { api, post } from '../../api/client';
import { Notice, money } from '../../components/common';
import type { Order } from '../../api/types';

type PaymentIntent = { paymentId:string; provider:'MOCK'; amountToman:number; status:string };

export function MockPaymentCard({order,onPaid}:{order:Order;onPaid:()=>Promise<unknown>}) {
  const requestKey = useRef(crypto.randomUUID());
  const [loading,setLoading] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');

  async function pay(){
    setLoading(true);setError('');setMessage('');
    try{
      const {payment}=await api<{payment:PaymentIntent}>('/payments/intents',{
        method:'POST',headers:{'Idempotency-Key':requestKey.current},body:JSON.stringify({orderId:order.id})
      });
      await post(`/payments/mock/${payment.paymentId}/confirm`,{});
      setMessage('پرداخت آزمایشی با موفقیت ثبت شد؛ هیچ وجهی از حساب شما کسر نشده است.');
      await onPaid();
    }catch(reason){setError(reason instanceof Error?reason.message:'خطا در پرداخت آزمایشی');}
    finally{setLoading(false);}
  }

  if(order.paymentStatus==='PAID')return <div className="panel mock-payment"><h3><CheckCircle2 size={20}/> سفارش تسویه شده است</h3><p>پرداخت این سفارش در سیستم ثبت شده است.</p></div>;
  if(order.status==='CANCELLED')return null;
  return <section className="panel mock-payment" aria-label="پرداخت آزمایشی">
    <span className="eyebrow"><FlaskConical size={14}/> DEMO MODE / NO REAL CHARGES</span>
    <h3><CreditCard size={20}/> پرداخت شبیه‌سازی‌شده</h3>
    <p>برای تست کامل چرخه سفارش، مبلغ <strong>{money(order.totalToman)}</strong> را به‌صورت آزمایشی تأیید کن.</p>
    <p className="demo-disclaimer">این درگاه Mock است. پولی منتقل نمی‌شود و رسید آن برای استفاده واقعی معتبر نیست.</p>
    {error&&<Notice>{error}</Notice>}{message&&<Notice kind="ok">{message}</Notice>}
    <button type="button" disabled={loading} onClick={()=>void pay()} className="btn primary full">{loading?'در حال تأیید آزمایشی…':'تأیید پرداخت آزمایشی'}</button>
  </section>;
}
