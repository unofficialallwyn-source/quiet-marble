import {useEffect,useRef,useState} from 'react';
import type {SudokuView} from '@shared/sudoku';
import {sudokuHint} from '@shared/sudoku-hint';
import {checkPlayerName} from '@shared/player-name';
import {sudoku as api,ApiError,OfflineError} from '../lib/api';
import {firstHint} from '../lib/player';
import {KEYS,readJson,writeJson,remove} from '../lib/storage';
import {isLocal,localBegin,localHint,localNext,localSolve,localStart} from './local-sudoku';

type Saved={session:SudokuView;values:number[]};
const isSaved=(v:unknown):v is Saved=>!!v&&typeof v==='object'&&typeof (v as Saved).session?.id==='string'&&Array.isArray((v as Saved).session?.puzzle)&&Array.isArray((v as Saved).values);
const errorText=(e:unknown)=>e instanceof OfflineError?'You’re offline or the server can’t be reached. Check your connection and try again.':e instanceof Error?e.message:'Sudoku is unavailable. Please retry.';

/** A Sudoku streak, following the website: each puzzle is checked by the server
 * and every unassisted win saves automatically. Offline, a practice streak is
 * played on the phone instead. Progress is kept so the app can resume it. */
export function useSudoku({nickname,onWin,onFirstHint}:{nickname:string;onWin?():void;onFirstHint?():void}){
 const [session,setSession]=useState<SudokuView|null>(null);
 const [values,setValues]=useState<number[]>([]);
 const [level,setLevel]=useState(0);
 const [busy,setBusy]=useState(false);
 const [confirm,setConfirm]=useState(false);
 const [hintCell,setHintCell]=useState<{index:number;value:number}|null>(null);
 const [message,setMessage]=useState('Choose your starting difficulty. Each win unlocks the next level.');
 const [now,setNow]=useState(()=>Date.now());
 const lock=useRef(false),live=useRef(true),restored=useRef(false);
 const local=isLocal(session);

 useEffect(()=>{
  live.current=true;
  void readJson<Saved|null>(KEYS.sudoku,null,(v):v is Saved|null=>v===null||isSaved(v)).then(async saved=>{
   restored.current=true;
   if(!saved||!live.current)return;
   setSession(saved.session);setValues(saved.values);setLevel(saved.session.startLevel);
   if(isLocal(saved.session)){setMessage('Offline practice streak resumed.');return}
   // Ask the server for the current state; if offline, show the saved copy.
   try{
    const s=await api('sudoku-resume',saved.session,{id:saved.session.id});if(!live.current)return;
    const same=JSON.stringify(s.puzzle)===JSON.stringify(saved.session.puzzle);
    setSession(s);setValues(same?saved.values:s.puzzle);
    setMessage(s.practice?'Practice streak resumed. Assisted wins stay off the leaderboard.':s.solved?'Win saved. Continue your streak with the next puzzle.':'Streak resumed. Fill the empty cells.');
   }catch(e){
    if(!live.current)return;
    if(e instanceof ApiError){setSession(null);setValues([]);void remove(KEYS.sudoku);setMessage(e.message)}
    else setMessage('Saved streak shown. Connect to the internet to continue it.');
   }
  });
  const timer=setInterval(()=>setNow(Date.now()),1000);
  return()=>{live.current=false;clearInterval(timer)};
 },[]);
 useEffect(()=>{if(restored.current&&session)void writeJson(KEYS.sudoku,{session,values})},[session,values]);

 async function guarded(task:()=>Promise<void>){
  if(lock.current)return;lock.current=true;setBusy(true);
  try{await task()}catch(e){if(live.current)setMessage(errorText(e))}
  finally{lock.current=false;if(live.current)setBusy(false)}
 }
 const after=(s:SudokuView)=>{setSession(s);setConfirm(false);setHintCell(null)};
 const ready=(s:SudokuView)=>s.solved
  ?(s.practice?'Practice puzzle solved! Continue for another puzzle; this streak is off the leaderboard.':'Win verified and saved. Ready for the next puzzle?')
  :s.practice?(isLocal(s)?'Offline practice: play continues on this phone. Wins stay off the leaderboard.':'Practice streak: hints are available; wins stay off the leaderboard.')
  :'Fill the empty cells. Your timer starts with your first entry.';

 const start=()=>guarded(async()=>{
  const name=checkPlayerName(nickname);if(!name.ok){setMessage(name.error);return}
  let s:SudokuView;
  try{s=await api('sudoku-start',null,{level,name:name.name})}
  catch(e){if(!(e instanceof OfflineError))throw e;s=localStart(level,name.name)}
  if(!live.current)return;after(s);setValues(s.puzzle);
  setMessage(isLocal(s)?'You’re offline, so this is a practice streak on this phone. Fill the empty cells.':ready(s));
 });
 const solve=()=>guarded(async()=>{
  if(!session)return;
  const s=local?localSolve(session,values):await api('sudoku-solve',session,{answer:values});
  if(!live.current)return;after(s);setMessage(ready(s));if(s.solved&&!s.practice)onWin?.();
 });
 const next=()=>guarded(async()=>{
  if(!session)return;
  const s=local?localNext(session):await api('sudoku-next',session);
  if(!live.current)return;after(s);setValues(s.puzzle);setMessage(ready(s));
 });
 const resume=()=>guarded(async()=>{
  if(!session||local)return;
  const s=await api('sudoku-resume',session);
  if(!live.current)return;
  if(JSON.stringify(s.puzzle)!==JSON.stringify(session.puzzle))setValues(s.puzzle);
  after(s);setMessage(ready(s));
 });
 function enter(i:number,n:number){
  if(!session||session.solved||session.puzzle[i]||lock.current)return;
  const fill=()=>{setHintCell(null);setValues(v=>v.map((x,k)=>k===i?n:x))};
  if(session.started||!n){fill();return}
  // The first entry starts the puzzle timer.
  if(local){setSession(localBegin(session));fill();return}
  void guarded(async()=>{const s=await api('sudoku-begin',session);if(!live.current)return;setSession(s);fill()});
 }
 const hint=()=>guarded(async()=>{
  if(!session||session.solved)return;
  const suggestion=sudokuHint(session.puzzle,values);
  if(!suggestion){setMessage('The grid is complete. Tap Check & save win to verify it.');return}
  const s=local?localHint(session):await api('sudoku-hint',session);
  if(!live.current)return;
  setSession(s);setHintCell(suggestion);if(await firstHint())onFirstHint?.();
  setMessage(`Hint: enter ${suggestion.value} in row ${Math.floor(suggestion.index/9)+1}, column ${suggestion.index%9+1}. Tap the highlighted cell to fill it. This streak is practice-only.`);
 });
 const elapsed=session&&!session.solved&&session.started?Math.max(0,Math.floor((now-session.started)/1000)):0;
 const conflict=(i:number)=>{const n=values[i];return !!n&&values.some((v,j)=>j!==i&&v===n&&(Math.floor(i/9)===Math.floor(j/9)||i%9===j%9||(Math.floor(i/27)===Math.floor(j/27)&&Math.floor(i%9/3)===Math.floor(j%9/3))))};
 return {session,values,level,setLevel,busy,confirm,setConfirm,hintCell,message,elapsed,local,conflict,start,solve,next,resume,enter,hint};
}
