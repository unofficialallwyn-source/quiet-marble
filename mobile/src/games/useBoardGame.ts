import {useCallback,useEffect,useRef,useState} from 'react';
import {initial,move,jumps,remaining,ended,type Game} from '@shared/game';
import {solveMarble} from '@shared/marble-solver';
import {solveLights} from '@shared/lights-solver';
import {checkPlayerName} from '@shared/player-name';
import {ApiError,OfflineError,startRound,submitRound} from '../lib/api';
import {addResult,firstHint,type ResultRow} from '../lib/player';
import {useSound} from '../lib/sounds';

// Phones have no Web Worker here, so the English-board hint search is kept
// shorter than the website's to avoid freezing the screen for long.
export const MARBLE_HINT_NODES=100000;
const marble=(g:Game)=>g!=='lights';
const intro='Make your first move to start, or tap Start game.';

export interface BoardGameOptions{
 nickname:string;
 /** Called after a result is saved (to refresh the leaderboard and personal best). */
 onSaved?(rows:ResultRow[]):void;
 /** Called the first time a hint is used on this phone. */
 onFirstHint?():void;
}

/** One game of Marble Solitaire (any board) or Lights Out, following the website's rules:
 * the first move starts a ranked round; hints or undo make it practice; when the
 * server can't be reached the round is practice, played and saved on the phone. */
export function useBoardGame(game:Game,{nickname,onSaved,onFirstHint}:BoardGameOptions){
 const play=useSound();
 const [board,setBoard]=useState(()=>initial(game));
 const [history,setHistory]=useState<number[][]>([]);
 const [selected,setSelected]=useState(-1);
 const [hintTarget,setHintTarget]=useState(-1);
 const [active,setActive]=useState(false);
 const [practice,setPractice]=useState(false);
 const [offline,setOffline]=useState(false);
 const [round,setRound]=useState('');
 const [playerLabel,setPlayerLabel]=useState('');
 const [started,setStarted]=useState(0);
 const [seconds,setSeconds]=useState(0);
 const [busy,setBusy]=useState(false);
 const [saved,setSaved]=useState(false);
 const [message,setMessage]=useState(intro);
 const lock=useRef(false);
 const live=useRef(true);
 useEffect(()=>()=>{live.current=false},[]);

 const done=active&&ended(board,game);
 const left=remaining(board);
 const won=left===(marble(game)?1:0);
 const legal=marble(game)?jumps(board,game):[];
 const targets=hintTarget>=0?[hintTarget]:legal.filter(m=>m[0]===selected).map(m=>m[1]);

 useEffect(()=>{
  if(!active||done)return;
  const timer=setInterval(()=>setSeconds(Math.floor((Date.now()-started)/1000)),500);
  return()=>clearInterval(timer);
 },[active,done,started]);

 const sound=useCallback((b:number[],m:number[])=>play(marble(game)?'marble':b[m[0]]===1?'switch-on':'switch-off'),[game,play]);

 async function start(firstMove?:number[]){
  if(lock.current)return;
  const name=checkPlayerName(nickname);
  if(!name.ok){setMessage(name.error);return}
  lock.current=true;setBusy(true);setMessage('Starting your round…');
  const firstBoard=firstMove?move(initial(game),game,firstMove):initial(game);
  let ranked:{id:string;name:string}|null=null;
  try{ranked=await startRound(game,name.name)}
  catch(e){
   if(!(e instanceof OfflineError)){
    if(live.current){setMessage(e instanceof ApiError?e.message:'Cannot start. Please retry.');setBusy(false)}
    lock.current=false;return;
   }
  }
  lock.current=false;if(!live.current)return;
  setBusy(false);setBoard(firstBoard);setHistory(firstMove?[firstMove]:[]);setSelected(-1);setHintTarget(-1);
  setRound(ranked?.id??'');setPlayerLabel(ranked?.name??'');setActive(true);setPractice(!ranked);setOffline(!ranked);setSaved(false);
  setSeconds(0);setStarted(Date.now());
  if(firstMove)sound(firstBoard,firstMove);
  setMessage(!ranked?'You’re offline, so this is a practice round. It is saved on this phone only.'
   :marble(game)?'Select a marble, then a highlighted empty hole.':'Tap a tile to switch it and its neighbours.');
 }

 function reset(){
  if(lock.current)return;
  setBoard(initial(game));setHistory([]);setSelected(-1);setHintTarget(-1);setActive(false);setPractice(false);setOffline(false);
  setRound('');setSaved(false);setSeconds(0);setStarted(0);
  setMessage('Puzzle reset. Make your first move to start, or tap Start game. Saved scores are unchanged.');
 }

 async function tap(i:number){
  if(lock.current||done)return;
  if(marble(game)&&board[i]===1){setSelected(i===selected?-1:i);setHintTarget(-1);return}
  let next:number[];const m=marble(game)?[selected,i]:[i];
  try{next=move(board,game,m)}catch{setMessage('Choose a highlighted hole two spaces away.');return}
  if(!active){await start(m);return}
  sound(next,m);setBoard(next);setHistory([...history,m]);setSelected(-1);setHintTarget(-1);
  setMessage(ended(next,game)?'Round complete. Save your result below.':marble(game)?'Nice jump. Keep thinking a few moves ahead.':'Every switch changes the shape of the puzzle.');
 }

 function undo(){
  if(!history.length||saved||lock.current)return;
  const h=history.slice(0,-1);let b=initial(game);for(const m of h)b=move(b,game,m);
  setBoard(b);setHistory(h);setSelected(-1);setHintTarget(-1);setPractice(true);
  setMessage('Move undone. This is now a practice round.');
 }

 async function hint(){
  if(!active||done||lock.current)return;
  setPractice(true);
  if(await firstHint())onFirstHint?.();
  if(!marble(game)){
   const solution=solveLights(board);
   if(!solution?.length){setSelected(-1);setMessage('No hint is available for this board. Reset to try again.');return}
   const tile=solution[0];setSelected(tile);
   setMessage(`Hint: tap row ${Math.floor(tile/5)+1}, column ${tile%5+1}. This is a practice round; it won’t count on the leaderboard.`);
   return;
  }
  lock.current=true;setBusy(true);setMessage('Finding a winning route…');
  // Let "Finding…" appear before the search occupies the phone.
  await new Promise(resolve=>setTimeout(resolve,30));
  try{
   const solution=solveMarble(board,game==='marble'?MARBLE_HINT_NODES:Infinity,game);
   if(!live.current)return;
   if(solution.status!=='solved'||!solution.moves.length){
    setSelected(-1);setHintTarget(-1);
    setMessage(solution.status==='unsolvable'?'This position can’t finish with one marble, even though jumps may remain. Undo a move or reset to follow a winning route.':'No winning route found within the hint search limit. Undo a move or reset for guided play.');
    return;
   }
   const [from,to]=solution.moves[0];setSelected(from);setHintTarget(to);
   setMessage(`Hint: move the selected marble to the highlighted hole. Practice round — not on the leaderboard.`);
  }finally{lock.current=false;if(live.current)setBusy(false)}
 }

 async function save(){
  if(saved||!done||lock.current)return;
  lock.current=true;setBusy(true);
  try{
   if(!practice)await submitRound(round,history);
   const rows=await addResult({game,left,moves:history.length,date:new Date().toISOString(),practice});
   if(!live.current)return;
   setSaved(true);onSaved?.(rows);
   setMessage(practice?'Practice result saved on this phone.':'Result verified. Only your best score in the top 100 is kept on the leaderboard.');
  }catch(e){
   if(live.current)setMessage(e instanceof OfflineError?'Couldn’t reach the server to save. Check your connection and tap Save again.':e instanceof Error?e.message:'Save failed. Please retry.');
  }finally{lock.current=false;if(live.current)setBusy(false)}
 }

 return {board,history,selected,hintTarget,targets,active,practice,offline,playerLabel,seconds,busy,saved,message,done,left,won,
  start:()=>active?reset():void start(),reset,tap,undo,hint,save};
}
