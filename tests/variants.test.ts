import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,move,jumps,remaining,ended,marbleVariants,type MarbleVariant} from '../shared/game.ts';
import {solveMarble} from '../shared/marble-solver.ts';
import {isRecent,VARIANTS_RELEASE} from '../src/RecentlyAdded.tsx';
test('each marble variant has the right shape and a complete repeatable hint solution',()=>{
 for(const game of Object.keys(marbleVariants) as MarbleVariant[]){
  let b=initial(game),steps=0;const original=[...b],holes=marbleVariants[game].holes;
  assert.equal(b.filter(n=>n>=0).length,holes);assert.equal(remaining(b),holes-1);assert.equal(b[marbleVariants[game].empty],0);
  while(!ended(b,game)){const result=solveMarble(b,250000,game);assert.equal(result.status,'solved');if(result.status!=='solved')throw Error();assert(jumps(b,game).some(m=>String(m)===String(result.moves[0])));b=move(b,game,result.moves[0]);assert(++steps<holes);}
  assert.equal(remaining(b),1);assert.equal(steps,holes-2);assert.deepEqual(initial(game),original);
 }
});
test('diagonal rules and board boundaries remain variant-specific',()=>{
 const board=initial('diamond').map(v=>v<0?-1:0);board[16]=board[24]=1;
 assert.deepEqual(move(board,'diamond',[16,32]).filter(n=>n===1),[1]);
 assert.throws(()=>move(board,'marble',[16,32]));
 const triangle=initial('triangle');assert.throws(()=>move(triangle,'triangle',[14,16]));assert.throws(()=>move(triangle,'triangle',[14,12]));
 assert.equal(remaining(move(triangle,'triangle',[14,0])),13);
});
test('recent badges expire after 30 days and do not appear before release',()=>{
 const release=Date.parse(VARIANTS_RELEASE);assert(!isRecent(VARIANTS_RELEASE,release-1));assert(isRecent(VARIANTS_RELEASE,release));assert(isRecent(VARIANTS_RELEASE,release+29*86400000));assert(!isRecent(VARIANTS_RELEASE,release+30*86400000));
});
