import {timingSafeEqual} from 'node:crypto';
import {isGame} from '../../shared/game.js';

// Leaderboard name reports. Players report a name; it is hidden automatically
// after AUTO_HIDE_REPORTS different players report it, and a moderator can hide,
// restore or dismiss reports through the separate /api/moderation endpoint.
export type Board='marble'|'lights'|'triangle'|'diamond'|'sudoku';
export const isBoard=(value:unknown):value is Board=>value==='sudoku'||isGame(value);
export const AUTO_HIDE_REPORTS=3;
export const REPORTS_PER_DAY=20;
export const REPORT_TTL_MS=30*24*60*60*1000;
export interface NameReport{player:string;reporter:string;board:Board;now:number}
/** reported: saved; hidden: the name is now (or was already) hidden; duplicate: this reporter already reported it;
 *  not-found: no custom name to report on that board; limited: the reporter sent too many reports today. */
export type ReportOutcome='reported'|'hidden'|'duplicate'|'not-found'|'limited';
export interface ReportedName{player:string;hidden:boolean;hiddenBy?:string;reports:{board:string;name:string;created:number}[]}
export interface ModerationStore{
 report(report:NameReport):Promise<ReportOutcome>;
 isHidden(player:string):Promise<boolean>;
 list():Promise<ReportedName[]>;
 /** Hides the player's custom names on every board and clears their reports. */
 hide(player:string,now:number):Promise<void>;
 /** Shows the player's names again and clears their reports. */
 restore(player:string):Promise<void>;
 /** Clears reports without hiding the name. */
 dismiss(player:string):Promise<void>;
}

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function moderationHandler(store:ModerationStore,token:string,now=Date.now){
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 return async(req:Request):Promise<Response>=>{
  // Static Web Apps may replace Authorization while proxying, so use a custom header.
  const given=req.headers.get('x-qm-moderation-token')||'';
  if(token.length<32)return json({error:'Moderation is not configured'},503);
  if(Buffer.byteLength(given)!==Buffer.byteLength(token)||!timingSafeEqual(Buffer.from(given),Buffer.from(token)))return json({error:'Unauthorized'},401);
  try{
   if(req.method==='GET')return json({reports:await store.list()});
   if(req.method!=='POST')return json({error:'Method not allowed'},405);
   const raw=await req.text();if(raw.length>1000)return json({error:'Request too large'},413);
   let body:any;try{body=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
   const player=typeof body?.player==='string'?body.player.toLowerCase():'';
   if(!uuid.test(player))return json({error:'Invalid player'},400);
   if(body.action==='hide')await store.hide(player,now());
   else if(body.action==='restore')await store.restore(player);
   else if(body.action==='dismiss')await store.dismiss(player);
   else return json({error:'Use hide, restore or dismiss'},400);
   return json({ok:true});
  }catch{return json({error:'Moderation unavailable'},503)}
 };
}
