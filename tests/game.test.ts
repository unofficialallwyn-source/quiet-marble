import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,jumps,move,remaining,ended} from '../shared/game.ts';
test('English board and opening jump',()=>{let b=initial('marble');assert.equal(remaining(b),32);assert.equal(b.filter(n=>n>=0).length,33);assert.equal(jumps(b).length,4);b=move(b,'marble',[10,24]);assert.equal(remaining(b),31);assert.equal(b[17],0);assert.throws(()=>move(b,'marble',[2,4]));});
test('Lights Out is solvable and resetting recreates the initial board',()=>{let b=initial('lights');const before=[...b];for(const i of [0,3,6,9,12,17,21])b=move(b,'lights',[i]);assert(ended(b,'lights'));assert.deepEqual(initial('lights'),before);});
