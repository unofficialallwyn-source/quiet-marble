import {isGame,marbleVariants,type Game} from '../shared/game';
import {difficulties,type SudokuView} from '../shared/sudoku';
export type ShareContent={title:string;text:string;url:string};
const site='https://www.quietmarblegames.com/';
export function gameFromLink(search:string):Game|'sudoku'{const value=new URLSearchParams(search).get('game');return value==='sudoku'||isGame(value)?value:'marble';}
export function gameLink(game:Game|'sudoku'){return `${site}?game=${game}#games`;}
export function shareGame(game:Game|'sudoku'):ShareContent{
 const name=game==='sudoku'?'Sudoku':game==='lights'?'Lights Out':`${marbleVariants[game].name} Marble Solitaire`;
 return {title:`${name} · Quiet Marble`,text:`Try ${name} on Quiet Marble Games. Free to play, no game account needed!`,url:gameLink(game)};
}
export function duration(seconds:number){const s=Math.max(0,Math.floor(seconds));return `${Math.floor(s/60)}m ${String(s%60).padStart(2,'0')}s`;}
export function shareRound(game:Game,left:number,moves:number,seconds:number,practice:boolean):ShareContent{
 const base=shareGame(game);
 const score=game==='lights'?`All lights off in ${moves} moves`:`${left} marble${left===1?'':'s'} left in ${moves} moves`;
 return {...base,text:`${base.title}\n${score} · ${duration(seconds)}\n${practice?'Practice round (hints or undo used; not ranked).':'Unassisted round.'}\nTry the same board!`};
}
export function shareSudoku(session:SudokuView):ShareContent{
 return {...shareGame('sudoku'),text:`Sudoku · Quiet Marble\n${session.wins} consecutive puzzle${session.wins===1?'':'s'} solved · ${duration(session.seconds)} total\nStarted ${difficulties[session.startLevel]} · latest puzzle ${difficulties[session.level]}\n${session.practice?'Practice streak (hints used; not ranked).':'Unassisted streak.'}\nHow far can you go?`};
}
export const shareText=(content:ShareContent)=>`${content.text}\n${content.url}`;
export const whatsappLink=(content:ShareContent)=>`https://wa.me/?text=${encodeURIComponent(shareText(content))}`;
