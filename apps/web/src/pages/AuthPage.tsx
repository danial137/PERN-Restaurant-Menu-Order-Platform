import {FormEvent,useState} from 'react';
import {useNavigate,Link} from 'react-router-dom';
import {ArrowLeft,LockKeyhole} from 'lucide-react';
import {post} from '../api/client';
import type{User} from '../api/types';
import {Notice} from '../components/common';
import{useAuth}from '../hooks/useAuth';
export function AuthPage(){
  const[register,setRegister]=useState(false);const [name,setName]=useState('');const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[error,setError]=useState('');const[busy,setBusy]=useState(false);
  const{setUser}=useAuth();const navigate=useNavigate();
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const data=await post<{user:User}>(register?'/auth/register':'/auth/login',register?{name,email,password}:{email,password});setUser(data.user);navigate(data.user.role==='CUSTOMER'?'/menu':'/admin');}catch(err){setError(err instanceof Error?err.message:'خطا در ورود');}finally{setBusy(false);}}
  return <section className="auth-shell wrap"><div className="auth-card"><div className="auth-illustration"><img src="/illustrations/cat.svg" alt="گربه پرشین فود"/><span>HELLO AGAIN!</span></div><div className="auth-content"><span className="eyebrow">WELCOME TO PERSIAN FOOD</span><h1>{register?'بیا آشنا شیم!':'خوش برگشتی!'}</h1><p>{register?'یه حساب کوچولو بساز تا سفارشت رو راحت رهگیری کنی.':'برای دیدن سفارش‌ها و ادامه خوشمزگی وارد شو.'}</p>{error&&<Notice>{error}</Notice>}<form onSubmit={submit} className="form-stack">{register&&<label>نام و نام خانوادگی<input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="مثلاً سارا احمدی"/></label>}<label>ایمیل<input type="email" dir="ltr" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>رمز عبور<input type="password" dir="ltr" minLength={10} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="حداقل ۱۰ کاراکتر"/></label><button className="btn primary full" disabled={busy}><LockKeyhole size={16}/>{busy?'چند لحظه…':register?'ساخت حساب':'ورود به حساب'}<ArrowLeft size={16}/></button></form><p className="auth-switch">{register?'حساب داری؟':'هنوز عضو نیستی؟'} <button onClick={()=>{setRegister(!register);setError('');}}>{register?'وارد شو':'حساب بساز'}</button></p><Link className="back-link" to="/menu">بازگشت به منو</Link></div></div></section>
}
