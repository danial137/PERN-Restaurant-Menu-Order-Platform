import {createContext,useContext,useMemo,useState} from 'react';
import type{Product} from '../api/types';
type CartLine={product:Product;quantity:number};
type Cart={lines:CartLine[];count:number;subtotal:number;add:(p:Product)=>void;change:(id:string,delta:number)=>void;clear:()=>void};
const Context=createContext<Cart|null>(null);
export function CartProvider({children}:{children:React.ReactNode}){
  const [lines,setLines]=useState<CartLine[]>([]);
  const add=(p:Product)=>setLines(current=>{const existing=current.find(x=>x.product.id===p.id);if(existing)return current.map(x=>x.product.id===p.id?{...x,quantity:Math.min(p.stock,Math.min(100,x.quantity+1))}:x);return p.stock>0?[...current,{product:p,quantity:1}]:current;});
  const change=(id:string,delta:number)=>setLines(current=>current.map(x=>x.product.id===id?{...x,quantity:Math.min(x.product.stock,Math.min(100,x.quantity+delta))}:x).filter(x=>x.quantity>0));
  const subtotal=useMemo(()=>lines.reduce((sum,x)=>sum+x.product.priceToman*x.quantity,0),[lines]);
  return <Context.Provider value={{lines,count:lines.reduce((sum,x)=>sum+x.quantity,0),subtotal,add,change,clear:()=>setLines([])}}>{children}</Context.Provider>;
}
export const useCart=()=>{const value=useContext(Context);if(!value)throw new Error('CartProvider missing');return value;};
