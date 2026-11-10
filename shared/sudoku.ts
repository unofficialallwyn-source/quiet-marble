export const difficulties=['Easy','Medium','Hard','Expert'] as const;
export type SudokuSession={id:string;player:string;name:string;startLevel:number;level:number;wins:number;seconds:number;puzzle:number[];started:number;solved:boolean;updated:number};
export type SudokuView=Omit<SudokuSession,'player'|'updated'>;
export function validSolution(puzzle:number[],answer:unknown):answer is number[]{
 if(!Array.isArray(answer)||answer.length!==81||!answer.every(n=>Number.isInteger(n)&&n>=1&&n<=9))return false;
 if(puzzle.some((n,i)=>n!==0&&n!==answer[i]))return false;
 for(let k=0;k<9;k++){
  if(new Set(answer.slice(k*9,k*9+9)).size!==9)return false;
  if(new Set(Array.from({length:9},(_,r)=>answer[r*9+k])).size!==9)return false;
  if(new Set(Array.from({length:9},(_,i)=>answer[(Math.floor(k/3)*3+Math.floor(i/3))*9+(k%3)*3+i%3])).size!==9)return false;
 }
 return true;
}
// Stop at two solutions: generation only accepts removals that preserve uniqueness.
export function solutionCount(puzzle:number[],limit=2):number{
 const b=[...puzzle];let count=0;
 function visit(){
  let at=-1,options:number[]=[];
  for(let i=0;i<81;i++)if(b[i]===0){
   const row=Math.floor(i/9),col=i%9;
   const choices=[1,2,3,4,5,6,7,8,9].filter(n=>!Array.from({length:9},(_,k)=>b[row*9+k]===n||b[k*9+col]===n||b[(Math.floor(row/3)*3+Math.floor(k/3))*9+Math.floor(col/3)*3+k%3]===n).some(Boolean));
   if(!choices.length)return;
   if(at<0||choices.length<options.length){at=i;options=choices;if(choices.length===1)break;}
  }
  if(at<0){count++;return;}
  for(const n of options){b[at]=n;visit();if(count>=limit)break;}b[at]=0;
 }
 visit();return count;
}
export function makePuzzle(level:number,random:()=>number=Math.random):number[]{
 const shuffle=(a:number[])=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 const order=()=>shuffle([0,1,2]).flatMap(b=>shuffle([0,1,2]).map(n=>b*3+n));
 const rows=order(),cols=order(),digits=shuffle([1,2,3,4,5,6,7,8,9]);
 const board=rows.flatMap(r=>cols.map(c=>digits[(r*3+Math.floor(r/3)+c)%9]));
 const target=[44,38,32,28][Math.max(0,Math.min(3,level))];let clues=81;
 for(const i of shuffle(Array.from({length:81},(_,i)=>i))){if(clues<=target)break;const n=board[i];board[i]=0;if(solutionCount(board)===1)clues--;else board[i]=n;}
 return board;
}
