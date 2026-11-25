import Constants from 'expo-constants';
import type {Game} from '@shared/game';
import type {SudokuView} from '@shared/sudoku';
import {readPlayerToken,writePlayerToken} from './storage';

// The website's API. App requests carry no Origin or cookies: they send
// X-QM-Client: app and the signed player token the server gave us earlier.
const BASE=((Constants.expoConfig?.extra as {apiBase?:string}|undefined)?.apiBase??'https://www.quietmarblegames.com').replace(/\/$/,'');
const TIMEOUT_MS=12000;

/** The phone could not reach the server (offline, timeout, or the service is down). */
export class OfflineError extends Error{constructor(){super('You’re offline or the game server can’t be reached.')}}
/** The server answered with an error it explained (e.g. a rejected nickname). */
export class ApiError extends Error{constructor(message:string,public status:number){super(message)}}

async function call(path:string,init:RequestInit={}):Promise<any>{
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
 let response:Response;
 try{response=await fetch(BASE+path,{...init,signal:controller.signal})}
 catch{throw new OfflineError()}
 finally{clearTimeout(timer)}
 let body:any=null;try{body=await response.json()}catch{}
 // 503 means the service (or its database) is temporarily unavailable: treat as offline.
 if(response.status===503||(!response.ok&&!body?.error))throw new OfflineError();
 if(!response.ok)throw new ApiError(body.error,response.status);
 return body;
}

async function post<T>(body:Record<string,unknown>):Promise<T>{
 const token=await readPlayerToken();
 const data=await call('/api/game',{method:'POST',headers:{'Content-Type':'application/json','X-QM-Client':'app',...(token?{'X-QM-Player-Token':token}:{})},body:JSON.stringify(body)});
 if(typeof data?.playerToken==='string')await writePlayerToken(data.playerToken);
 return data;
}

/** The anonymous player ID on this phone, if it has played ranked before. */
export async function myPlayerId(){return (await readPlayerToken())?.split('.')[0]??null}

export type Board=Game|'sudoku';
export interface MarbleScore{player:string;name:string;left:number;moves:number;seconds:number}
export interface SudokuScore{player:string;name:string;wins:number;seconds:number;startLevel:number}
export async function leaderboard(board:Board):Promise<(MarbleScore|SudokuScore)[]>{
 return (await call(`/api/game?game=${board}`)).scores;
}
export const startRound=(game:Game,name:string)=>post<{id:string;name:string}>({action:'start',game,name});
export const submitRound=(id:string,moves:number[][])=>post<{ok:true;seconds:number}>({id,moves});
export const reportName=(board:Board,player:string)=>post<{ok:true;hidden:boolean}>({action:'report-name',board,player});
export function sudoku(action:'sudoku-start'|'sudoku-begin'|'sudoku-solve'|'sudoku-next'|'sudoku-hint'|'sudoku-resume',session:{id:string;wins:number}|null,extra:Record<string,unknown>={}){
 return post<SudokuView>({action,id:session?.id,puzzleNumber:session?.wins,...extra});
}
