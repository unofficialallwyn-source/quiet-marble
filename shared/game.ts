export type MarbleVariant='marble'|'triangle'|'diamond';
export type Game = MarbleVariant|'lights';
export const marbleVariants:Record<MarbleVariant,{name:string;holes:number;empty:number;rules:string}>={
 marble:{name:'English',holes:33,empty:24,rules:'Jump horizontally or vertically; no diagonal jumps.'},
 triangle:{name:'Triangle',holes:15,empty:0,rules:'Jump along any of the three lines of the triangle: horizontally or along either sloping diagonal.'},
 diamond:{name:'Mini Diamond',holes:13,empty:24,rules:'Jump horizontally, vertically or diagonally. Diagonal jumps are allowed on this 13-hole board.'}
};
export const isGame=(value:unknown):value is Game=>value==='marble'||value==='triangle'||value==='diamond'||value==='lights';
export function valid(i:number,g:Game='marble'){
 if(!Number.isInteger(i)||i<0||i>=49)return false;
 const r=Math.floor(i/7),c=i%7;
 if(g==='triangle')return r<5&&c<=r;
 if(g==='diamond')return Math.abs(r-3)+Math.abs(c-3)<=2;
 return g==='marble'&&((c>=2&&c<=4)||(r>=2&&r<=4));
}
export function toggle(b:number[],i:number){let a=[...b];for(const j of [i,i-5,i+5,...(i%5?[i-1]:[]),...(i%5<4?[i+1]:[])])if(j>=0&&j<25)a[j]=1-a[j];return a;}
export function initial(g:Game){if(g!=='lights')return Array.from({length:49},(_,i)=>valid(i,g)?+(i!==marbleVariants[g].empty):-1);let b=Array(25).fill(0);for(const i of [0,3,6,9,12,17,21])b=toggle(b,i);return b;}
export function jumps(b:number[],g:Game='marble'){
 const directions=g==='triangle'?[[0,-2],[0,2],[-2,0],[2,0],[-2,-2],[2,2]]:g==='diamond'?[[0,-2],[0,2],[-2,0],[2,0],[-2,-2],[2,2],[-2,2],[2,-2]]:[[0,-2],[0,2],[-2,0],[2,0]];
 const out:number[][]=[];
 for(let i=0;i<49;i++)if(valid(i,g)&&b[i]===1)for(const [dr,dc] of directions){
  const r=Math.floor(i/7)+dr,c=i%7+dc,j=r*7+c,m=(i+j)/2;
  if(r>=0&&r<7&&c>=0&&c<7&&valid(j,g)&&valid(m,g)&&b[j]===0&&b[m]===1)out.push([i,j]);
 }
 return out;
}
export function move(b:number[],g:Game,m:number[]){if(g==='lights'){if(m.length!==1||!Number.isInteger(m[0])||m[0]<0||m[0]>24)throw Error('Invalid move');return toggle(b,m[0]);}if(!jumps(b,g).some(x=>x[0]===m[0]&&x[1]===m[1])||m.length!==2)throw Error('Invalid jump');let a=[...b];a[m[0]]=0;a[(m[0]+m[1])/2]=0;a[m[1]]=1;return a;}
export const remaining=(b:number[])=>b.filter(x=>x===1).length;
export const ended=(b:number[],g:Game)=>g!=='lights'?jumps(b,g).length===0:remaining(b)===0;
