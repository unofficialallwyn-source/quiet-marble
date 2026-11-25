import {makePuzzle,validSolution,type SudokuView} from '@shared/sudoku';

// Offline Sudoku: the same rules as the server, played entirely on the phone.
// Offline streaks are always practice and never reach the leaderboard.
export const isLocal=(s:SudokuView|null)=>!!s?.id.startsWith('local-');

export function localStart(level:number,name:string,now=Date.now()):SudokuView{
 return {id:`local-${now}`,name:name||'You',startLevel:level,level,wins:0,seconds:0,puzzle:makePuzzle(level),started:0,solved:false,practice:true};
}
export function localBegin(s:SudokuView,now=Date.now()):SudokuView{
 return s.started||s.solved?s:{...s,started:now};
}
export function localHint(s:SudokuView,now=Date.now()):SudokuView{
 return {...s,practice:true,started:s.started||now};
}
export function localSolve(s:SudokuView,answer:number[],now=Date.now()):SudokuView{
 if(s.solved||!s.started)throw Error('Start this puzzle first');
 if(!validSolution(s.puzzle,answer))throw Error('Not solved yet. Check every row, column and 3 × 3 box.');
 return {...s,wins:s.wins+1,seconds:s.seconds+Math.max(1,Math.floor((now-s.started)/1000)),solved:true};
}
export function localNext(s:SudokuView):SudokuView{
 if(!s.solved)throw Error('Solve this puzzle first');
 const level=Math.min(3,s.startLevel+s.wins);
 return {...s,level,puzzle:makePuzzle(level),started:0,solved:false};
}
