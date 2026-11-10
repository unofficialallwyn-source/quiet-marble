import {useEffect,useState} from 'react';

// One site-level poller counts visible visitors, whether or not a game has started.
export function useVisitorActivity(){
 const [count,setCount]=useState<number|null>(null);
 useEffect(()=>{
  let stopped=false,inFlight=false,cookiesBlocked=false;
  let controller:AbortController|undefined;
  const refresh=async()=>{
   if(document.visibilityState!=='visible'||inFlight)return;
   inFlight=true;controller=new AbortController();
   const timeout=setTimeout(()=>controller?.abort(),12000);
   try{
    const send=async()=>{
     const response=await fetch(cookiesBlocked?'/api/game?action=activity':'/api/game',{
      signal:controller!.signal,...(!cookiesBlocked?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'visit'})}:{})
     });
     if(!response.ok)throw Error('Activity unavailable');
     return response.json();
    };
    let data=await send();
    if(!cookiesBlocked&&data.registered===false){
     data=await send(); // Confirm the browser accepted the cookie before counting it.
     if(data.registered===false)cookiesBlocked=true;
    }
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
 },[]);
 return count;
}
