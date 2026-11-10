import {useEffect,useRef,useState} from 'react';
import {difficulties,type SudokuView} from '../shared/sudoku';
import {RoundFinish} from './round-finish';
type Score={player:string;name:string;wins:number;seconds:number;startLevel:number};
const time=(s:number)=>`${Math.floor(s/3600)?Math.floor(s/3600)+':':''}${Math.floor(s/60)%60<10?'0':''}${Math.floor(s/60)%60}:${String(s%60).padStart(2,'0')}`;
const storageKey='qm-sudoku';
export default function Sudoku({playerName,changeName}:{playerName:string;changeName:(name:string)=>void}){
 const [session,setSession]=useState<SudokuView|null>(null),[values,setValues]=useState<number[]>([]),[level,setLevel]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState('Choose your starting difficulty. Each win unlocks the next level.'),[scores,setScores]=useState<Score[]>([]),[error,setError]=useState(false),[clock,setClock]=useState(Date.now()),[confirm,setConfirm]=useState(false);
 const locked=useRef(false),mounted=useRef(true);
 async function loadScores(){try{const r=await fetch('/api/game?game=sudoku');if(!r.ok)throw Error();const d=await r.json();if(mounted.current){setScores(d.scores);setError(false)}}catch{if(mounted.current)setError(true)}}
 async function request(action:string,extra:Record<string,unknown>={}){
  const r=await fetch('/api/game',{method:'POST',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id:session?.id,puzzleNumber:session?.wins,...extra})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Sudoku is unavailable. Please retry.');return d as SudokuView;
 }
 useEffect(()=>{
  mounted.current=true;void loadScores();
  let cached:any;try{cached=JSON.parse(sessionStorage.getItem(storageKey)||'null')}catch{}
  if(cached?.session?.id){
   locked.current=true;setBusy(true);
   request('sudoku-resume',{id:cached.session.id}).then(s=>{if(!mounted.current)return;setSession(s);setLevel(s.startLevel);
    const same=JSON.stringify(s.puzzle)===JSON.stringify(cached.session.puzzle);
    setValues(s.puzzle.map((clue,i)=>clue||(same&&Number.isInteger(cached.values?.[i])&&cached.values[i]>=0&&cached.values[i]<=9?cached.values[i]:0)));
    setMessage(s.solved?'Win saved. Continue your streak with the next puzzle.':'Streak resumed. Fill the empty cells.');
   }).catch(e=>{if(mounted.current)setMessage(e.message)}).finally(()=>{locked.current=false;if(mounted.current)setBusy(false)});
  }
  return()=>{mounted.current=false};
 },[]);
 useEffect(()=>{if(session)try{sessionStorage.setItem(storageKey,JSON.stringify({session,values}))}catch{}},[session,values]);
 useEffect(()=>{const t=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(t)},[]);
 async function run(action:string){
  if(locked.current)return;locked.current=true;setBusy(true);
  try{
   const s=await request(action,action==='sudoku-start'?{level,name:playerName}:action==='sudoku-solve'?{answer:values}:{});
   if(!mounted.current)return;
   setSession(s);setConfirm(false);
   if(action==='sudoku-start'||action==='sudoku-next'||(action==='sudoku-resume'&&JSON.stringify(s.puzzle)!==JSON.stringify(session?.puzzle)))setValues(s.puzzle);
   setMessage(s.solved?'Win verified and saved. Ready for the next puzzle?':'Fill the empty cells. Your timer starts with your first entry.');
   if(s.solved)void loadScores();
  }catch(e:any){if(mounted.current)setMessage(e.message)}finally{locked.current=false;if(mounted.current)setBusy(false)}
 }
 async function enter(i:number,n:number){
  if(!session||session.solved||session.puzzle[i]||locked.current)return;
  if(!session.started&&n){
   locked.current=true;setBusy(true);
   try{const s=await request('sudoku-begin');if(!mounted.current)return;setSession(s)}
   catch(e:any){if(mounted.current)setMessage(e.message);return}
   finally{locked.current=false;if(mounted.current)setBusy(false)}
  }
  setValues(v=>v.map((x,k)=>k===i?n:x));
 }
 function conflict(i:number){const n=values[i];return !!n&&values.some((v,j)=>j!==i&&v===n&&(Math.floor(i/9)===Math.floor(j/9)||i%9===j%9||(Math.floor(i/27)===Math.floor(j/27)&&Math.floor(i%9/3)===Math.floor(j%9/3))))}
 const elapsed=session&&!session.solved&&session.started?Math.max(0,Math.floor((clock-session.started)/1000)):0;
 return <><div className="play-layout sudoku-layout"><section className="game-card">
  <div className="game-heading"><div><span className="eyebrow">NINE NUMBERS. ONE CLEAR MIND.</span><h2>Sudoku</h2></div><span className="pill">{session?difficulties[session.level]:'Choose your challenge'}</span></div>
  <div className="session-name"><label htmlFor="sudoku-name">Your name (optional)</label><input id="sudoku-name" value={playerName} disabled={busy||!!session&&!confirm} maxLength={24} onChange={e=>changeName(e.target.value)} placeholder="Choose a nickname"/><small>Your nickname is public if your streak reaches the top 100.</small></div>
  <div className="sudoku-setup"><label htmlFor="sudoku-level">Starting difficulty</label><select id="sudoku-level" disabled={busy||!!session&&!confirm} value={level} onChange={e=>setLevel(Number(e.target.value))}>{difficulties.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></div>
  <div className="stats"><div><strong>{session?.wins||0}</strong><span>CONSECUTIVE WINS</span></div><div><strong>{time(session?.seconds||0)}</strong><span>SAVED TOTAL TIME</span></div><div><strong>{time(elapsed)}</strong><span>CURRENT PUZZLE</span></div></div>
  {!session?<div className="sudoku-intro"><p>A fresh puzzle, a growing challenge.</p><button className="primary" disabled={busy} onClick={()=>run('sudoku-start')}>{busy?'Loading…':'Play Sudoku'}</button></div>:<>
   <div className="board-area sudoku-area">{session.solved&&<RoundFinish won/>}<div className="sudoku-board" role="group" aria-label="Sudoku puzzle">{session.puzzle.map((clue,i)=><input key={`${session.wins}-${i}`} aria-label={`Row ${Math.floor(i/9)+1}, column ${i%9+1}${clue?', given':''}`} aria-invalid={conflict(i)} className={`${clue?'given':''} ${conflict(i)?'conflict':''}`} readOnly={!!clue||session.solved||busy} inputMode="numeric" autoComplete="off" maxLength={1} value={values[i]||''} onFocus={e=>e.target.select()} onChange={e=>{const value=e.target.value;if(/^[1-9]?$/.test(value))void enter(i,Number(value)||0)}} onKeyDown={e=>{const offset=({ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9} as Record<string,number>)[e.key];if(offset){e.preventDefault();const target=i+offset;if(target>=0&&target<81)(e.currentTarget.parentElement!.children[target] as HTMLInputElement).focus()}}}/>)}</div></div>
   <p className="board-caption">Bold numbers are fixed. Enter 1–9; delete to clear a cell.</p>
   <div className="controls">{session.solved?<button className="primary" disabled={busy||confirm} onClick={()=>run('sudoku-next')}>Next puzzle · {difficulties[Math.min(3,session.startLevel+session.wins)]}</button>:<button className="primary" disabled={busy||confirm||values.some(n=>!n)} onClick={()=>run('sudoku-solve')}>Check & save win</button>}<button disabled={busy} onClick={()=>{setConfirm(!confirm);setLevel(session.startLevel)}}>{confirm?'Keep playing':'New streak / difficulty'}</button><button disabled={busy} onClick={()=>run('sudoku-resume')}>Resume saved streak</button></div>
  </>}
  {confirm&&<div className="sudoku-confirm"><p>A new streak resets consecutive wins and the current puzzle. Your best saved score stays on the leaderboard. Choose a difficulty above.</p><button className="primary" disabled={busy} onClick={()=>run('sudoku-start')}>Start new streak</button></div>}
  <p className="status" role="status">{busy?'Please wait…':message}</p>
 </section><aside><section className="objective"><p className="eyebrow">THE OBJECTIVE</p><h3>Nine numbers.<br/><em>No repeats.</em></h3><p>Fill each row, column and 3 × 3 box with the numbers 1–9, exactly once.</p><p>Win to advance: Easy → Medium → Hard → Expert. Expert wins continue with fresh Expert puzzles.</p></section>
 <section className="score-card" id="scores"><h3>Sudoku streak leaderboard</h3><p className="score-caption">TOP 100 · BEST STREAK PER PLAYER</p>{error?<p className="empty">Leaderboard unavailable.<button onClick={loadScores}>Retry</button></p>:scores.length?<ol className="score-list">{scores.map((s,i)=><li key={s.player}><span className="rank">{i+1}</span><span>{s.name}<small>{time(s.seconds)} total · started {difficulties[s.startLevel]}</small></span><b>{s.wins}<small>wins</small></b></li>)}</ol>:<p className="empty">Complete a puzzle to start your winning streak.</p>}<p className="ranking-note">Most consecutive wins ranks first; ties use the shortest total solving time. All starting levels share this board. Each verified win saves automatically.</p></section></aside></div>
 <section id="guide" className="guide sudoku-guide"><h2>Build your winning streak.</h2><div className="steps"><article><h3>1. Choose your challenge</h3><p>Select a starting difficulty. Levels use fewer given numbers, with one unique solution per puzzle; individual puzzles may vary in difficulty.</p></article><article><h3>2. Fill the grid</h3><p>Use 1–9 once per row, column and box. Red cells flag repeated numbers. A wrong answer can be corrected and does not end the streak.</p></article><article><h3>3. Save and advance</h3><p>Check & save win verifies the solution on the server, then Next puzzle increases the challenge. At Expert, keep winning to extend your streak.</p></article></div><p>Time runs from your first entry until the server accepts the solution, including time away from an unfinished puzzle. Waiting between puzzles is excluded. Resetting or changing difficulty starts a new streak. Refreshing resumes this tab’s saved progress; an inactive streak expires after 24 hours. Starting elsewhere in the same browser replaces the current streak.</p></section></>;
}
