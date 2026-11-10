import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,toggle} from '../shared/game.ts';
import {solveLights} from '../shared/lights-solver.ts';
test('Lights Out hint solves initial and screenshot positions',()=>{
 const screenshot=Array(25).fill(0);screenshot[5]=screenshot[19]=1;
 assert.equal(solveLights(screenshot)?.length,9);
 for(const board of [initial('lights'),screenshot]){
  const solution=solveLights(board);assert(solution);
  assert(solution.reduce((b,i)=>toggle(b,i),board).every(n=>n===0));
 }
});
test('repeated next-tile hints converge, including after arbitrary player moves',()=>{
 let seed=12345;
 for(let trial=0;trial<100;trial++){
  let board=initial('lights');
  for(let j=0;j<trial;j++){seed=(seed*1664525+1013904223)>>>0;board=toggle(board,seed%25)}
  let distance=solveLights(board)!.length;
  while(distance){const hint=solveLights(board)![0];board=toggle(board,hint);const next=solveLights(board)!.length;assert.equal(next,distance-1);distance=next}
  assert(board.every(n=>n===0));
 }
 assert.deepEqual(solveLights(Array(25).fill(0)),[]);
 assert.throws(()=>solveLights([1]));
});
