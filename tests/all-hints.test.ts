import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,move,remaining} from '../shared/game.ts';
import {solveMarble} from '../shared/marble-solver.ts';
import {makePuzzle,validSolution} from '../shared/sudoku.ts';
import {sudokuHint} from '../shared/sudoku-hint.ts';
test('Marble hints follow a complete legal winning route from every opening jump',()=>{
 for(const first of [[10,24],[22,24],[26,24],[38,24]]){
  let b=move(initial('marble'),'marble',first),steps=0;
  while(remaining(b)>1){const result=solveMarble(b);assert.equal(result.status,'solved');if(result.status!=='solved')throw Error();assert(result.moves.length);b=move(b,'marble',result.moves[0]);assert(++steps<=30)}
  assert.equal(remaining(b),1);
 }
 const dead=initial('marble').map(n=>n<0?-1:0);dead[2]=1;dead[46]=1;
 assert.equal(solveMarble(dead).status,'unsolvable');
});
test('Sudoku repeated hints correct wrong entries and solve every difficulty',()=>{
 for(let level=0;level<4;level++){
  let seed=42;const puzzle=makePuzzle(level,()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296});
  const values=puzzle.map(n=>n||9);let steps=0;
  for(let hint=sudokuHint(puzzle,values);hint;hint=sudokuHint(puzzle,values)){
   assert.equal(puzzle[hint.index],0);values[hint.index]=hint.value;assert(++steps<=81);
  }
  assert(validSolution(puzzle,values));
 }
});
