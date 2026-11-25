import {isGame,type Game} from '../shared/game';
import {shareText,type ShareContent} from '../shared/share-text';
export * from '../shared/share-text';
export function gameFromLink(search:string):Game|'sudoku'{const value=new URLSearchParams(search).get('game');return value==='sudoku'||isGame(value)?value:'marble';}
export const whatsappLink=(content:ShareContent)=>`https://wa.me/?text=${encodeURIComponent(shareText(content))}`;
