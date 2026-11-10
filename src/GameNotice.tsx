import {useEffect,useRef,type ReactNode} from 'react';
export function GameNotice({title,children,close}:{title:string;children:ReactNode;close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
 return <dialog ref={dialog} className="hint-notice game-notice" aria-labelledby="game-notice-title" onCancel={close} onClose={close}>
  <h2 id="game-notice-title">{title}</h2>{children}
  <button onClick={()=>dialog.current?.close()}>Back to board</button>
 </dialog>;
}
