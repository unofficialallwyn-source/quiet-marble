import {useCallback,useEffect,useState} from 'react';
import {checkPlayerName} from '@shared/player-name';
import type {Game} from '@shared/game';
import {KEYS,readJson,readText,writeJson,writeText} from './storage';

/** The optional nickname, remembered on this phone. */
export function useNickname(){
 const [name,setName]=useState('');
 useEffect(()=>{void readText(KEYS.name).then(saved=>{if(saved)setName(saved)})},[]);
 const change=useCallback((value:string)=>{setName(value);void writeText(KEYS.name,value)},[]);
 const check=checkPlayerName(name);
 return {name,change,error:check.ok?'':check.error};
}

// Personal results stay on the phone, like the website's "My results".
export interface ResultRow{game:Game;left:number;moves:number;date:string;practice?:boolean}
const isRows=(v:unknown):v is ResultRow[]=>Array.isArray(v)&&v.every(r=>r&&typeof r==='object'&&typeof (r as ResultRow).game==='string'&&Number.isInteger((r as ResultRow).left)&&Number.isInteger((r as ResultRow).moves));
export const readResults=()=>readJson<ResultRow[]>(KEYS.history,[],isRows);
export async function addResult(row:ResultRow){
 const rows=[row,...await readResults()].slice(0,100);
 await writeJson(KEYS.history,rows);return rows;
}
/** Best result for a game: fewest marbles left, or fewest moves for Lights Out. */
export function personalBest(rows:ResultRow[],game:Game){
 const mine=rows.filter(r=>r.game===game);
 return mine.length?Math.min(...mine.map(r=>game==='lights'?r.moves:r.left)):null;
}

let hintExplained=false;
/** True the first time hints are used on this phone (to explain practice rounds once). */
export async function firstHint(){
 if(hintExplained)return false;hintExplained=true;
 if(await readText(KEYS.hintExplained)==='yes')return false;
 await writeText(KEYS.hintExplained,'yes');return true;
}
