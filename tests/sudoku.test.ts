import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makePuzzle,validSolution,solutionCount,type SudokuSession} from '../shared/sudoku.ts';
import {createHandler,type Store} from '../api/src/service.ts';
import type {SudokuStore} from '../api/src/sudoku-store.ts';
function solve(puzzle:number[]):number[]{
 const b=[...puzzle];
 function search():boolean{
  let at=-1,choices:number[]=[];
  for(let i=0;i<81;i++)if(!b[i]){
   const r=Math.floor(i/9),c=i%9;
   const options=[1,2,3,4,5,6,7,8,9].filter(n=>!Array.from({length:9},(_,k)=>b[r*9+k]===n||b[k*9+c]===n||b[(Math.floor(r/3)*3+Math.floor(k/3))*9+Math.floor(c/3)*3+k%3]===n).some(Boolean));
   if(!options.length)return false;if(at<0||options.length<choices.length){at=i;choices=options}
  }
  if(at<0)return true;for(const n of choices){b[at]=n;if(search())return true}b[at]=0;return false;
 }
 assert(search());return b;
}
class MemorySudoku implements SudokuStore{
 state:SudokuSession|null=null;scores:SudokuSession[]=[];
 async get(id:string,player:string){return this.state?.id===id&&this.state.player===player?structuredClone(this.state):null}
 async start(s:SudokuSession){this.state=structuredClone(s);return true}
 async replace(prev:SudokuSession,next:SudokuSession,save:boolean){if(JSON.stringify(prev)!==JSON.stringify(this.state))return false;this.state=structuredClone(next);if(save)this.scores.push(next);return true}
 async leaderboard(){return this.scores}
}
const origin='https://game.example';
test('Sudoku generation preserves unique solutions at every level and rejects altered givens',()=>{
 for(let level=0;level<4;level++)for(let k=0;k<3;k++){
  let seed=k+1;const p=makePuzzle(level,()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296});assert.equal(solutionCount(p),1);const a=solve(p);assert(validSolution(p,a));assert(!validSolution(p,Array(81).fill(1)));assert(!validSolution(p,a.slice(1)));const i=p.findIndex(Boolean);const bad=[...a];bad[i]=bad[i]%9+1;assert(!validSolution(p,bad));
  assert(p.filter(Boolean).length<=[46,40,35,33][level]);
 }
});
test('Sudoku signed sessions, progression, server timing, retries and concurrency',async()=>{
 const sudoku=new MemorySudoku();let now=100000;const handler=createHandler({sudoku} as Store,{secret:'x'.repeat(40),origin,now:()=>now});
 let cookie='';const post=(body:any,c=cookie,o=origin)=>handler(new Request(origin+'/api/game',{method:'POST',headers:{origin:o,cookie:c,'content-type':'application/json'},body:JSON.stringify(body)}));
 assert.equal((await post({action:'sudoku-start',level:4})).status,400);
 assert.equal((await post({action:'sudoku-start',level:0,name:'<b>'})).status,400);
 assert.equal((await post({action:'sudoku-start',level:0},'', 'https://evil.test')).status,403);
 const response=await post({action:'sudoku-start',level:0,name:'Allwyn'});assert.equal(response.status,200);cookie=response.headers.get('set-cookie')!.split(';')[0];let s=await response.json();assert(!('player' in s));assert.equal(s.started,0);
 assert.equal((await post({action:'sudoku-resume',id:s.id},cookie+'0')).status,400);
 for(let win=0;win<5;win++){
  assert.equal(s.level,Math.min(3,win));const id=s.id;const puzzleNumber=s.wins;
  assert.equal((await post({action:'sudoku-next',id,puzzleNumber})).status,409);
  assert.equal((await post({action:'sudoku-solve',id,puzzleNumber,answer:solve(s.puzzle)})).status,409);
  now+=50000;await post({action:'sudoku-begin',id,puzzleNumber});const start=sudoku.state!.started;
  now+=1000;await post({action:'sudoku-begin',id,puzzleNumber});assert.equal(sudoku.state!.started,start);
  assert.equal((await post({action:'sudoku-solve',id,puzzleNumber,answer:Array(81).fill(1)})).status,400);
  now+=9000;const body={action:'sudoku-solve',id,puzzleNumber,answer:solve(s.puzzle),seconds:0,wins:999};
  const saves=await Promise.all([post(body),post(body)]);assert(saves.some(r=>r.status===200));s=await(await post(body)).json();assert.equal(s.wins,win+1);assert.equal(s.seconds,(win+1)*10);assert.equal(sudoku.scores.length,win+1);
  if(win<4){now+=100000;s=await(await post({action:'sudoku-next',id,puzzleNumber:s.wins})).json();assert.equal(s.started,0)}
 }
 const id=s.id;now+=86400001;assert.equal((await post({action:'sudoku-resume',id})).status,404);
 const fresh=await(await post({action:'sudoku-start',level:2})).json();assert.equal(fresh.wins,0);assert.equal(fresh.level,2);assert.equal((await post({action:'sudoku-resume',id})).status,404);
});
