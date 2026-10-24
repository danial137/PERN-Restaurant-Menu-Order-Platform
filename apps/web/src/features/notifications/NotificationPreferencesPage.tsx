import { FormEvent, useState } from 'react';
import { Bell, MessageCircle, Smartphone, RefreshCcw } from 'lucide-react';
import { api, patch } from '../../api/client';
import { Notice, SectionTitle, date } from '../../components/common';
import { useRemote } from '../../hooks/useRemote';

type Preferences = { phoneNumber:string|null;smsOptIn:boolean;telegramDemoLinked:boolean };
type Delivery = { id:string;channel:'SMS'|'TELEGRAM';body:string;sentAt:string };

export function NotificationPreferencesPage(){
  const {value,error,loading,refresh}=useRemote(()=>Promise.all([
    api<{preferences:Preferences}>('/notifications/preferences'),
    api<{deliveries:Delivery[]}>('/notifications/inbox')
  ]).then(([prefs,inbox])=>({...prefs,...inbox})),[]);
  const [phone,setPhone]=useState<string|null>(null);
  const [sms,setSms]=useState<boolean|null>(null);
  const [telegram,setTelegram]=useState<boolean|null>(null);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [isError,setIsError]=useState(false);
  const p=value?.preferences;

  async function save(e:FormEvent){
    e.preventDefault();setBusy(true);setStatus('');setIsError(false);
    try{
      await patch('/notifications/preferences',{
        phoneNumber:phone===null?(p?.phoneNumber??null):(phone.trim()||null),
        smsOptIn:sms??p?.smsOptIn??false,
        telegramDemoLinked:telegram??p?.telegramDemoLinked??false
      });
      await refresh();setStatus('تنظیمات آزمایشی ذخیره شد.');
    }catch(reason){setStatus(reason instanceof Error?reason.message:'ذخیره ناموفق بود');setIsError(true);}
    finally{setBusy(false);}
  }

  return <section className="wrap padded notification-settings">
    <SectionTitle eyebrow="DEMO NOTIFICATIONS" title="اعلان‌های سفارش" subtitle="پیامک و Telegram فعلاً شبیه‌سازی می‌شوند؛ هیچ پیام واقعی ارسال نخواهد شد."/>
    {error&&<Notice>{error}</Notice>}
    {loading&&!value&&<p>در حال دریافت تنظیمات…</p>}
    <div className="notification-columns">
      <form className="panel form-stack" onSubmit={save}>
        <h3><Bell size={20}/> تنظیمات کانال‌ها</h3>
        <label>شماره تلفن (صرفاً برای پیش‌نمایش، با کد کشور)
          <input dir="ltr" placeholder="+989121234567" value={phone??p?.phoneNumber??''} onChange={e=>setPhone(e.target.value)}/>
        </label>
        <label className="check-label"><input type="checkbox" checked={sms??p?.smsOptIn??false} onChange={e=>setSms(e.target.checked)}/> <Smartphone size={18}/> نمایش پیامک‌های آزمایشی</label>
        <label className="check-label"><input type="checkbox" checked={telegram??p?.telegramDemoLinked??false} onChange={e=>setTelegram(e.target.checked)}/> <MessageCircle size={18}/> اتصال شبیه‌سازی‌شده Telegram</label>
        <p className="fine-print">اتصال Telegram واقعی نیازمند شروع ربات و تأیید شناسه گفتگو است؛ تیک بالا فقط برای تست Mock است.</p>
        {status&&<Notice kind={isError?'error':'ok'}>{status}</Notice>}
        <button className="btn primary" disabled={busy}>ذخیره تنظیمات</button>
      </form>
      <div className="panel demo-inbox">
        <div className="row-between"><h3>صندوق پیام آزمایشی</h3><button className="btn outline compact" onClick={()=>void refresh()}><RefreshCcw size={14}/> تازه‌سازی</button></div>
        {!value?.deliveries.length&&<p>هنوز پیامی ثبت نشده. یک سفارش پرداخت کن و مطمئن شو Worker روشنه.</p>}
        {value?.deliveries.map(delivery=><article key={delivery.id} className="inbox-item"><div className="row-between"><span className="eyebrow">MOCK {delivery.channel}</span><small>{date(delivery.sentAt)}</small></div><p>{delivery.body}</p></article>)}
      </div>
    </div>
  </section>;
}
