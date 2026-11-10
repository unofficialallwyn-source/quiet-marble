import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {unavailable,type FailureLog,type FailureOperation} from './diagnostics.js';
import {initial,move,remaining,ended,type Game} from '../../shared/game.js';
export class HttpError extends Error {constructor(public status:number,message:string){super(message)}}
export interface Round{id:string;player:string;game:Game;started:number;finished:boolean;displayName?:string|null}
export interface Result{left:number;moves:number;seconds:number}
export interface Store{
 start(round:Round):Promise<void>;
 get(id:string,player:string):Promise<Round|null>;
 finish(id:string,player:string,result:Result):Promise<boolean>;
 leaderboard(game:Game):Promise<unknown[]>;
}
export function createHandler(store:Store,config:{secret:string;origin:string;now?:()=>number}){
 if(config.secret.length<32)throw Error('SESSION_SECRET must contain at least 32 characters');
 const origin=new URL(config.origin).origin,now=config.now??Date.now;
 const sign=(id:string)=>createHmac('sha256',config.secret).update(id).digest('hex');
 function identity(req:Request){
  const value=req.headers.get('cookie')?.match(/(?:^|;\s*)qm_player=([a-f0-9-]{36})\.([a-f0-9]{64})(?:;|$)/);
  if(!value)return null;
  return timingSafeEqual(Buffer.from(sign(value[1]),'hex'),Buffer.from(value[2],'hex'))?value[1]:null;
 }
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 return async(req:Request,log?:FailureLog):Promise<Response>=>{
  const started=Date.now();let operation:FailureOperation='request';
  try{
   if(req.method==='GET'){
    const game=new URL(req.url).searchParams.get('game')==='lights'?'lights':'marble';
    operation='leaderboard';
    return json({scores:await store.leaderboard(game)});
   }
   if(req.method!=='POST')return json({error:'Method not allowed'},405);
   if(req.headers.get('origin')!==origin)return json({error:'Invalid origin'},403);
   if(!req.headers.get('content-type')?.startsWith('application/json'))return json({error:'Expected JSON'},415);
   if(Number(req.headers.get('content-length'))>30000)return json({error:'Request too large'},413);
   const raw=await req.text();
   if(Buffer.byteLength(raw)>30000)return json({error:'Request too large'},413);
   let body:any;try{body=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
   if(!body||typeof body!=='object')return json({error:'Invalid request'},400);
   let player=identity(req);
   if(body.action==='start'){
    if(body.game!=='marble'&&body.game!=='lights')return json({error:'Unknown game'},400);
    if(body.name!=null&&typeof body.name!=='string')return json({error:'Enter a valid player name'},400);
    const displayName=(body.name??'').trim().replace(/ +/g,' ');
    if(displayName.length>24||(displayName&&!/^[\p{L}\p{M}\p{N} .'-]+$/u.test(displayName)))return json({error:'Use up to 24 characters: letters, numbers, spaces, dots, apostrophes or hyphens.'},400);
    player??=randomUUID();const id=randomUUID();
    operation='start';
    await store.start({id,player,game:body.game,started:now(),finished:false,displayName:displayName||null});
    const response=json({id,name:displayName||`Player ${player.slice(0,6)}`});
    response.headers.set('Set-Cookie',`qm_player=${player}.${sign(player)}; HttpOnly; ${origin.startsWith('https:')?'Secure; ':''}SameSite=Lax; Path=/; Max-Age=31536000`);
    return response;
   }
   if(!player||typeof body.id!=='string'||!/^[a-f0-9-]{36}$/.test(body.id))return json({error:'Round unavailable. Start a new round.'},400);
   operation='get-round';
   const round=await store.get(body.id,player);
   if(!round)return json({error:'Round unavailable'},404);
   if(round.finished)return json({error:'Round already submitted'},409);
   if(!Array.isArray(body.moves)||!body.moves.length||body.moves.length>500)return json({error:'Invalid move history'},400);
   let board=initial(round.game);
   try{for(const step of body.moves){if(!Array.isArray(step)||!step.every(Number.isInteger))throw Error();board=move(board,round.game,step)}}catch{return json({error:'Invalid move history'},400)}
   if(!ended(board,round.game))return json({error:'Finish the round before submitting'},400);
   const result={left:remaining(board),moves:body.moves.length,seconds:Math.max(1,Math.floor((now()-round.started)/1000))};
   operation='save-score';
   if(!await store.finish(round.id,player,result))return json({error:'Round already submitted'},409);
   return json({ok:true,seconds:result.seconds});
  }catch(error){
   if(error instanceof HttpError)return json({error:error.message},error.status);
   return unavailable(error,operation,started,log);
  }
 };
}
