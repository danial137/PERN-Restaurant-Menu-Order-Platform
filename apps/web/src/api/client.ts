export const API_ROOT=(import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/,'')??'';
export class ApiError extends Error{constructor(public status:number,public code:string,message:string){super(message);}}
export async function api<T>(path:string, options:RequestInit={}):Promise<T>{
  let response:Response;
  try{response=await fetch(`${API_ROOT}/api${path}`,{credentials:'include',...options,headers:{'Content-Type':'application/json',...(options.headers??{})}})}
  catch{throw new ApiError(0,'NETWORK','اتصال به سرور برقرار نشد');}
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new ApiError(response.status,body.error?.code??'REQUEST_FAILED',body.error?.message??'درخواست ناموفق بود');
  return body as T;
}
export const post=<T>(path:string,payload:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(payload)});
export const patch=<T>(path:string,payload:unknown={})=>api<T>(path,{method:'PATCH',body:JSON.stringify(payload)});
