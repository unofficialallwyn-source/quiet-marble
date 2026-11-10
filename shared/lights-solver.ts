import {toggle} from './game.js';

// Only 32 possible first rows. Every later row is forced by the lights above it.
export function solveLights(board:number[]):number[]|null{
 if(board.length!==25||board.some(n=>n!==0&&n!==1))throw Error('Invalid Lights Out board');
 let best:number[]|null=null;
 for(let first=0;first<32;first++){
  let b=[...board];const presses:number[]=[];
  const press=(i:number)=>{b=toggle(b,i);presses.push(i)};
  for(let c=0;c<5;c++)if(first&(1<<c))press(c);
  for(let r=1;r<5;r++)for(let c=0;c<5;c++)if(b[(r-1)*5+c])press(r*5+c);
  if(b.every(n=>n===0)&&(best===null||presses.length<best.length))best=presses;
 }
 return best;
}
