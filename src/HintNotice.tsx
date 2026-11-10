import {useEffect,useRef,useState} from 'react';
export function HintNotice({close}:{close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
 return <dialog ref={dialog} className="hint-notice" aria-labelledby="hint-title" onCancel={close} onClose={close}>
  <h2 id="hint-title">Hints make this a practice round</h2>
  <p>Lights Out: tap the highlighted tile. Marble: move the selected marble to the highlighted destination. Sudoku: enter the suggested number in the highlighted cell. Press Hint again for the next step. If Marble cannot find a winning route from your position, undo a move or reset for guided play.</p>
  <p>Assisted rounds are excluded from the public leaderboard. For Sudoku, the rest of the current streak becomes practice-only; earlier unassisted scores stay saved. Start a new round or streak to play ranked again.</p>
  <button className="primary" autoFocus onClick={()=>dialog.current?.close()}>Got it</button>
 </dialog>;
}

let explainedThisVisit=false;
export function useHintNotice(){
 const [open,setOpen]=useState(false);
 function explain(){
  let seen=explainedThisVisit;try{seen=seen||localStorage.getItem('qm-hint-explained')==='yes'}catch{}
  explainedThisVisit=true;
  if(!seen){setOpen(true);try{localStorage.setItem('qm-hint-explained','yes')}catch{}}
 }
 return {open,explain,close:()=>setOpen(false)};
}
