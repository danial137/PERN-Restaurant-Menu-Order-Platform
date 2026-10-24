import {createContext,useContext,useEffect,useState} from 'react';
import {api,post} from '../api/client';
import type {User} from '../api/types';
type Auth={user:User|null;pending:boolean;setUser:(u:User|null)=>void;signOut:()=>Promise<void>};
const Context=createContext<Auth|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}){
  const [user,setUser]=useState<User|null>(null);
  const [pending,setPending]=useState(true);
  useEffect(()=>{let active=true;api<{user:User}>('/auth/me').then(data=>{if(active)setUser(data.user);}).catch(()=>{}).finally(()=>{if(active)setPending(false);});return()=>{active=false;};},[]);
  const signOut=async()=>{await post('/auth/logout',{});setUser(null);};
  return <Context.Provider value={{user,pending,setUser,signOut}}>{children}</Context.Provider>;
}
export function useAuth(){const context=useContext(Context);if(!context)throw new Error('AuthProvider missing');return context;}
