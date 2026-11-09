export type Game = 'marble'|'lights';
export const valid=(i:number)=> i>=0&&i<49&&((i%7>=2&&i%7<=4)||(Math.floor(i/7)>=2&&Math.floor(i/7)<=4));
export function toggle(b:number[],i:number){let a=[...b];for(const j of [i,i-5,i+5,...(i%5?[i-1]:[]),...(i%5<4?[i+1]:[])])if(j>=0&&j<25)a[j]=1-a[j];return a;}
export function initial(g:Game){if(g==='marble')return Array.from({length:49},(_,i)=>valid(i)?+(i!==24):-1);let b=Array(25).fill(0);for(const i of [0,3,6,9,12,17,21])b=toggle(b,i);return b;}
export function jumps(b:number[]){let out:number[][]=[];for(let i=0;i<49;i++)if(b[i]===1)for(const d of [-14,14,-2,2]){let j=i+d,m=i+d/2;if(valid(j)&&b[j]===0&&b[m]===1&&(Math.abs(d)===14||Math.floor(i/7)===Math.floor(j/7)))out.push([i,j]);}return out;}
export function move(b:number[],g:Game,m:number[]){if(g==='lights'){if(m.length!==1||!Number.isInteger(m[0])||m[0]<0||m[0]>24)throw Error('Invalid move');return toggle(b,m[0]);}if(!jumps(b).some(x=>x[0]===m[0]&&x[1]===m[1])||m.length!==2)throw Error('Invalid jump');let a=[...b];a[m[0]]=0;a[(m[0]+m[1])/2]=0;a[m[1]]=1;return a;}
export const remaining=(b:number[])=>b.filter(x=>x===1).length;
export const ended=(b:number[],g:Game)=>g==='marble'?jumps(b).length===0:remaining(b)===0;
