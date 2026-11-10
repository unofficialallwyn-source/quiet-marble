import {useEffect,useRef,useState} from 'react';

export function usePlayerActivity(round:string,playing:boolean,moves:number){
 const [count,setCount]=useState<number|null>(null);
 const lastMove=useRef(0);
 useEffect(()=>{lastMove.current=Date.now()},[round,moves]);
 useEffect(()=>{
  let stopped=false,inFlight=false;
  let controller:AbortController|undefined;
  const refresh=async()=>{
   if(document.visibilityState!=='visible'||inFlight)return;
   inFlight=true;controller=new AbortController();
   const timeout=setTimeout(()=>controller?.abort(),12000);
   try{
    // Only recent game interaction reports presence; passive polling never counts visitors.
    const heartbeat=playing&&round&&Date.now()-lastMove.current<60000;
    const response=await fetch(heartbeat?'/api/game':'/api/game?action=activity',{
     signal:controller.signal,...(heartbeat?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'heartbeat',id:round})}:{})
    });
    if(!response.ok)throw Error('Activity unavailable');
    const data=await response.json();
    if(!Number.isSafeInteger(data.count)||data.count<0)throw Error('Invalid count');
    if(!stopped)setCount(data.count);
   }catch{if(!stopped)setCount(null)}
   finally{clearTimeout(timeout);inFlight=false}
  };
  void refresh();
  const timer=setInterval(()=>void refresh(),60000);
  const visible=()=>{if(document.visibilityState==='visible')void refresh()};
  document.addEventListener('visibilitychange',visible);
  return()=>{stopped=true;clearInterval(timer);controller?.abort();document.removeEventListener('visibilitychange',visible)};
 },[round,playing]);
 return count;
}
