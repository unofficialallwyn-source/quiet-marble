import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,jumps,move,remaining,ended} from '../shared/game.ts';
import {marbleHint} from '../src/marble-hint.ts';
test('Diamond hints solve every opening without a browser Worker',async()=>{
 for(const first of jumps(initial('diamond'),'diamond')){
  let board=move(initial('diamond'),'diamond',first),steps=0;
  while(!ended(board,'diamond')){
   const hint=await marbleHint(board,'diamond');assert.equal(hint.status,'solved');if(hint.status!=='solved')throw Error();
   board=move(board,'diamond',hint.moves[0]);assert(++steps<12);
  }
  assert.equal(remaining(board),1);
 }
});
test('Diamond distinguishes an unsolvable position from a round with no legal moves',async()=>{
 let board=initial('diamond');const path=[[10,24],[22,10],[24,22],[26,24],[10,26],[30,18],[26,10],[32,30]];
 for(const m of path.slice(0,-1))board=move(board,'diamond',m);
 assert(!ended(board,'diamond'));assert(jumps(board,'diamond').length>0);
 assert.equal((await marbleHint(board,'diamond')).status,'unsolvable');
 board=move(board,'diamond',path.at(-1)!);assert(ended(board,'diamond'));assert.equal(remaining(board),4);
});
