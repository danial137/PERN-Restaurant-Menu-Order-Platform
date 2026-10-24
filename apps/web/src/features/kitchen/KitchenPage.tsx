import { useCallback, useEffect, useState } from 'react';
import { ChefHat, Clock3, RefreshCw, RadioTower, UtensilsCrossed } from 'lucide-react';
import { API_ROOT, api, patch } from '../../api/client';
import { AdminNav, Notice, SectionTitle, STATUS } from '../../components/common';

type Ticket={id:string;orderId:string;version:number;status:'QUEUED'|'COOKING'|'READY';deadlineAt:string;estimatedMin:number;order:{number:string;notes:string;type:string;status:string;items:{nameSnapshot:string;quantity:number}[]}};
type Snapshot={tickets:Ticket[];serverTime:string};
type Metrics={queued:number;cooking:number;ready:number;overdue:number};

export function KitchenPage(){
  const [snapshot,setSnapshot]=useState<Snapshot>({tickets:[],serverTime:''});
  const [metrics,setMetrics]=useState<Metrics>({queued:0,cooking:0,ready:0,overdue:0});
  const [connected,setConnected]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState('');

  const refresh=useCallback(async()=>{
    try{
      const [live,stats]=await Promise.all([api<Snapshot>('/kitchen/tickets'),api<Metrics>('/kitchen/metrics')]);
      setSnapshot(live);setMetrics(stats);setError('');
    }catch(reason){setError(reason instanceof Error?reason.message:'ارتباط با سرور قطع شد');}
  },[]);

  useEffect(()=>{
    void refresh();
    const stream=new EventSource(`${API_ROOT}/api/kitchen/events`,{withCredentials:true});
    const onKitchen=(event:MessageEvent)=>{
      try{setSnapshot(JSON.parse(event.data) as Snapshot);setConnected(true);}
      catch{void refresh();}
    };
    stream.addEventListener('kitchen',onKitchen as EventListener);
    stream.onerror=()=>setConnected(false);
    // Polling fallback: source of truth always remains PostgreSQL.
    const poll=setInterval(()=>void refresh(),12000);
    return()=>{stream.removeEventListener('kitchen',onKitchen as EventListener);stream.close();clearInterval(poll);};
  },[refresh]);

  async function advance(ticket:Ticket){
    setBusy(ticket.id);setError('');
    try{
      const status=ticket.status==='QUEUED'?'COOKING':'READY';
      await patch(`/kitchen/tickets/${ticket.id}/status`,{status,expectedVersion:ticket.version});
      await refresh();
    }catch(reason){setError(reason instanceof Error?reason.message:'تغییر وضعیت ناموفق بود');await refresh();}
    finally{setBusy('');}
  }

  return <section className="wrap padded kitchen-page">
    <span className="eyebrow">PERSIAN FOOD / KITCHEN DISPLAY</span>
    <SectionTitle eyebrow="KDS / SMART QUEUE" title="صف آشپزخانه" subtitle="اولویت‌بندی بر اساس موعد آماده‌سازی؛ نمایش زنده سفارش‌های پرداخت‌شده."/>
    <AdminNav/>
    <div className="kds-meta"><span className="eyebrow"><RadioTower size={15}/> {connected?'اتصال لحظه‌ای SSE برقرار':'حالت جایگزین: بازخوانی دوره‌ای'}</span><button className="btn outline compact" onClick={()=>void refresh()}><RefreshCw size={15}/> تازه‌سازی</button></div>
    {error&&<Notice>{error}</Notice>}
    <div className="kds-metrics"><div><b>{metrics.queued}</b><span>در صف</span></div><div><b>{metrics.cooking}</b><span>در حال پخت</span></div><div><b>{metrics.ready}</b><span>آماده تحویل</span></div><div><b>{metrics.overdue}</b><span>دیرکرده</span></div></div>
    <div className="kds-board">
      {(['QUEUED','COOKING','READY'] as const).map(status=><section key={status} className="kds-lane">
        <h3>{status==='QUEUED'?'در صف':status==='COOKING'?'در حال پخت':'آماده تحویل'}</h3>
        {snapshot.tickets.filter(ticket=>ticket.status===status).map(ticket=><article className="kds-ticket" key={ticket.id}>
          <div className="row-between"><strong dir="ltr">{ticket.order.number}</strong><span className="status-pill">{STATUS[ticket.order.status]}</span></div>
          <ul>{ticket.order.items.map((item,i)=><li key={i}>{item.nameSnapshot} × {item.quantity}</li>)}</ul>
          {ticket.order.notes&&<p>یادداشت: {ticket.order.notes}</p>}
          <div className="kds-time"><Clock3 size={16}/> {ticket.estimatedMin} دقیقه تخمینی · موعد {new Date(ticket.deadlineAt).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})}</div>
          {status!=='READY'&&<button disabled={busy===ticket.id} className="btn primary full" onClick={()=>void advance(ticket)}><ChefHat size={16}/>{status==='QUEUED'?'شروع آماده‌سازی':'آماده تحویل'}</button>}
          {status==='READY'&&<div className="kds-done"><UtensilsCrossed size={16}/> منتظر ارائه ووچر توسط مشتری</div>}
        </article>)}
        {!snapshot.tickets.some(t=>t.status===status)&&<div className="kds-empty">سفارشی در این مرحله نیست.</div>}
      </section>)}
    </div>
  </section>;
}
