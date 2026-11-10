import type {MarbleVariant} from '../shared/game';
import {solveMarble,cachedMarbleSolution,rememberMarbleSolution,type MarbleSolution} from '../shared/marble-solver';
export async function marbleHint(board:number[],game:MarbleVariant='marble'):Promise<MarbleSolution>{
 // Compact boards have at most 2^15 states; solve them without worker support.
 if(game==='diamond'||game==='triangle')return solveMarble(board,Infinity,game);
 const cached=cachedMarbleSolution(board,game);if(cached)return {status:'solved',moves:cached};
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./marble-hint.worker.ts',import.meta.url),{type:'module'});
  const finish=()=>{clearTimeout(timeout);worker.terminate()};
  const timeout=setTimeout(()=>{finish();resolve({status:'limit'})},8000);
  worker.onmessage=(event:MessageEvent<MarbleSolution>)=>{finish();if(event.data.status==='solved')rememberMarbleSolution(board,event.data.moves,game);resolve(event.data)};
  worker.onerror=()=>{finish();reject(Error('Hint unavailable. Please retry.'))};
  worker.postMessage({board,game});
 });
}
