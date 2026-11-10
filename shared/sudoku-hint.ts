import {validSolution} from './sudoku.js';
export function solveSudoku(puzzle:number[]):number[]|null{
 const b=[...puzzle];
 function search():boolean{
  let at=-1,choices:number[]=[];
  for(let i=0;i<81;i++)if(!b[i]){
   const r=Math.floor(i/9),c=i%9;
   const options=[1,2,3,4,5,6,7,8,9].filter(n=>!Array.from({length:9},(_,k)=>b[r*9+k]===n||b[k*9+c]===n||b[(Math.floor(r/3)*3+Math.floor(k/3))*9+Math.floor(c/3)*3+k%3]===n).some(Boolean));
   if(!options.length)return false;if(at<0||options.length<choices.length){at=i;choices=options;}
  }
  if(at<0)return validSolution(puzzle,b);
  for(const n of choices){b[at]=n;if(search())return true;}b[at]=0;return false;
 }
 return search()?b:null;
}
// Solve from fixed clues, so hints can also correct a mistaken player entry.
export function sudokuHint(puzzle:number[],values:number[]){
 const solution=solveSudoku(puzzle);if(!solution)return null;
 const index=solution.findIndex((n,i)=>!puzzle[i]&&values[i]!==n);
 return index<0?null:{index,value:solution[index]};
}
