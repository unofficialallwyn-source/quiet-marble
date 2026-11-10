import {useEffect,useRef} from 'react';
export function HintNotice({close}:{close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
 return <dialog ref={dialog} className="hint-notice" aria-labelledby="hint-title" onCancel={close} onClose={close}>
  <h2 id="hint-title">Hints make this a practice round</h2>
  <p>Tap the outlined tile marked “Hint”, then press Hint again for the next suggestion. Keep following the highlighted tiles to switch every light off.</p>
  <p>You can save the result on this device, but this round will not be submitted to the public leaderboard. Start a new round to play ranked again.</p>
  <button className="primary" autoFocus onClick={()=>dialog.current?.close()}>Got it</button>
 </dialog>;
}
