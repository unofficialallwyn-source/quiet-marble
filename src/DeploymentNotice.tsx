import {useEffect,useState} from 'react';
type Notice={id:string;startsAt:number;expiresAt:number};
export function DeploymentNotice(){
 const [notice,setNotice]=useState<Notice|null>(null),[dismissed,setDismissed]=useState(''),[now,setNow]=useState(Date.now());
 useEffect(()=>{
  let stopped=false,busy=false;let controller:AbortController|undefined;
  async function check(){
   setNow(Date.now());if(document.visibilityState!=='visible'||busy)return;
   busy=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),8000);
   try{
    const r=await fetch('/api/deployment',{signal:controller.signal,cache:'no-store'});if(!r.ok)return;
    const {deployment:d}=await r.json();
    if(!stopped&&(d===null||(typeof d?.id==='string'&&Number.isFinite(d.startsAt)&&Number.isFinite(d.expiresAt))))setNotice(d);
   }catch{/* A network failure does not imply that a deployment is happening. */}
   finally{clearTimeout(timeout);busy=false}
  }
  void check();const timer=setInterval(()=>void check(),15000);
  document.addEventListener('visibilitychange',check);
  return()=>{stopped=true;clearInterval(timer);controller?.abort();document.removeEventListener('visibilitychange',check)};
 },[]);
 if(!notice||notice.id===dismissed||notice.expiresAt<=now)return null;
 return <div className="deployment-notice" role="status"><div><strong>{now<notice.startsAt?'Website update starting soon':'Website update in progress'}</strong><p>{now<notice.startsAt?'Finish and save your round if possible. Keep this tab open.':'Saving may be briefly unavailable; retry if needed. Keep this tab open.'}</p></div><button aria-label="Dismiss update notice" onClick={()=>setDismissed(notice.id)}>×</button></div>;
}
