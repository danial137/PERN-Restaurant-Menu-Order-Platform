import {useCallback,useEffect,useState} from 'react';
export function useRemote<T>(load:()=>Promise<T>,deps:unknown[]=[]){
  const [value,setValue]=useState<T|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const refresh=useCallback(async()=>{setLoading(true);try{setValue(await load());setError('');}catch(e){setError(e instanceof Error?e.message:'خطا');}finally{setLoading(false);}},deps);
  useEffect(()=>{void refresh();},[refresh]);
  return {value,error,loading,refresh,setValue};
}
