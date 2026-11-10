import {initial,jumps,move,remaining,type MarbleVariant} from './game.js';
export type MarbleSolution={status:'solved';moves:number[][]}|{status:'unsolvable'|'limit'};
const solutions=new Map<string,number[][]>();
export function rememberMarbleSolution(board:number[],moves:number[][],game:MarbleVariant='marble'){let b=board;for(let i=0;i<=moves.length;i++){solutions.set(game+':'+b.join(','),moves.slice(i));if(i<moves.length)b=move(b,game,moves[i]);}}
export const cachedMarbleSolution=(board:number[],game:MarbleVariant='marble')=>solutions.get(game+':'+board.join(','));
// A verified full route gives instant hints from the opening and its rotations/reflections.
const opening:number[][]=[[10,24],[15,17],[2,16],[4,2],[17,15],[14,16],[18,4],[20,18],[23,9],[2,16],[21,23],[23,9],[25,11],[4,18],[27,25],[25,11],[37,23],[28,30],[30,16],[9,23],[23,25],[32,18],[11,25],[34,32],[31,33],[46,32],[25,39],[44,46],[46,32],[33,31],[31,45]];
for(let mirror=0;mirror<2;mirror++)for(let turns=0;turns<4;turns++){
 const transform=(i:number)=>{let r=Math.floor(i/7),c=i%7;if(mirror)c=6-c;for(let t=0;t<turns;t++)[r,c]=[c,6-r];return r*7+c};
 rememberMarbleSolution(initial('marble'),opening.map(m=>m.map(transform)));
}
export function solveMarble(board:number[],maxNodes=250000,game:MarbleVariant='marble'):MarbleSolution{
 let nodes=0,limited=false;const dead=new Set<string>();
 function search(b:number[]):number[][]|null{
  const known=cachedMarbleSolution(b,game);if(known)return known;
  if(remaining(b)===1)return [];
  if(++nodes>maxNodes){limited=true;return null;}
  const key=b.join(',');if(dead.has(key))return null;
  for(const m of jumps(b,game)){const tail=search(move(b,game,m));if(tail)return [m,...tail];if(limited)return null;}
  dead.add(key);return null;
 }
 const moves=search(board);
 if(moves){rememberMarbleSolution(board,moves,game);return {status:'solved',moves};}
 return {status:limited?'limit':'unsolvable'};
}

rememberMarbleSolution(initial('triangle'),[[14,0],[16,14],[0,16],[21,7],[24,8],[29,15],[30,16],[7,23],[8,24],[32,16],[16,30],[31,29],[28,30]],'triangle');

rememberMarbleSolution(initial('diamond'),[[10,24],[22,10],[30,16],[10,22],[18,30],[26,24],[30,18],[38,24],[18,30],[22,38],[38,26]],'diamond');
