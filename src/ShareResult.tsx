import {useId,useRef,useState} from 'react';
import {shareText,whatsappLink,type ShareContent} from './share-result';
import {RecentlyAdded} from './RecentlyAdded';
export function ShareResult({content,result=false}:{content:ShareContent;result?:boolean}){
 const [open,setOpen]=useState(false),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const field=useRef<HTMLTextAreaElement>(null),id=useId();
 async function copy(){
  try{await navigator.clipboard.writeText(shareText(content));setStatus('Message and link copied. Paste them into your message.');}
  catch{field.current?.focus();field.current?.select();setStatus('Copy is unavailable here. Copy the selected text manually.');}
 }
 async function share(){
  if(busy)return;setBusy(true);setStatus('');
  try{await navigator.share(content)}
  catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setStatus('Sharing is unavailable here. Use WhatsApp or copy the text below.');}
  finally{setBusy(false)}
 }
 return <div className="share-result">
  <button type="button" className="share-toggle" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>{result?'Share result':'Share game'} <RecentlyAdded/></button>
  {open&&<section id={id} className="share-panel" aria-label={result?'Share your result':'Share this game'}>
   <div className="share-actions"><a href={whatsappLink(content)} target="_blank" rel="noopener noreferrer">WhatsApp</a>{typeof navigator.share==='function'&&<button type="button" disabled={busy} onClick={share}>More apps</button>}<button type="button" onClick={copy}>Copy text & link</button></div>
   <label htmlFor={`${id}-text`}>Your message — ready to share</label>
   <textarea id={`${id}-text`} ref={field} readOnly rows={6} value={shareText(content)} onFocus={e=>e.target.select()}/>
   <p role="status">{status||'You choose the recipient and send the message. Nothing is posted automatically.'}</p>
  </section>}
 </div>;
}
