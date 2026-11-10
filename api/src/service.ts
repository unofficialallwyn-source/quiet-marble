import {makePuzzle,validSolution,type SudokuSession} from '../../shared/sudoku.js';
import type {SudokuStore} from './sudoku-store.js';
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {unavailable,type FailureLog,type FailureOperation} from './diagnostics.js';
import {initial,move,remaining,ended,type Game} from '../../shared/game.js';
export class HttpError extends Error {constructor(public status:number,message:string){super(message)}}
export interface Round{id:string;player:string;game:Game;started:number;finished:boolean;displayName?:string|null}
export interface Result{left:number;moves:number;seconds:number}
export interface Store{
 sudoku?:SudokuStore;
 start(round:Round):Promise<void>;
 get(id:string,player:string):Promise<Round|null>;
 finish(id:string,player:string,result:Result):Promise<boolean>;
 leaderboard(game:Game):Promise<unknown[]>;
 activity(heartbeat?:{player:string;id?:string}):Promise<number>;
}
export function createHandler(store:Store,config:{secret:string;origin:string;now?:()=>number}){
 if(config.secret.length<32)throw Error('SESSION_SECRET must contain at least 32 characters');
 const origin=new URL(config.origin).origin,now=config.now??Date.now;
 const sign=(id:string)=>createHmac('sha256',config.secret).update(id).digest('hex');
 function identity(req:Request,cookieName='qm_player'){
  const value=req.headers.get('cookie')?.match(new RegExp('(?:^|;\\s*)'+cookieName+'=([a-f0-9-]{36})\\.([a-f0-9]{64})(?:;|$)'));
  if(!value)return null;
  return timingSafeEqual(Buffer.from(sign(value[1]),'hex'),Buffer.from(value[2],'hex'))?value[1]:null;
 }
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 return async(req:Request,log?:FailureLog):Promise<Response>=>{
  const started=Date.now();let operation:FailureOperation='request';
  try{
   if(req.method==='GET'){
    if(new URL(req.url).searchParams.get('game')==='sudoku'){
     operation='leaderboard';if(!store.sudoku)throw Error('Sudoku unavailable');return json({scores:await store.sudoku.leaderboard()});
    }
    if(new URL(req.url).searchParams.get('action')==='activity'){
     operation='activity';return json({count:await store.activity()});
    }
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
   if(body.action==='visit'){
    operation='activity';
    const visitor=identity(req,'qm_visitor');
    // Count only after the browser returns its signed cookie; blocked cookies must
    // not create a new visitor row every minute. Keep this separate from game identity.
    if(visitor)return json({count:await store.activity({player:visitor}),registered:true});
    const id=randomUUID();const response=json({count:await store.activity(),registered:false});
    response.headers.set('Set-Cookie',`qm_visitor=${id}.${sign(id)}; HttpOnly; ${origin.startsWith('https:')?'Secure; ':''}SameSite=Lax; Path=/; Max-Age=86400`);
    return response;
   }
   let player=identity(req);
   if(typeof body.action==='string'&&body.action.startsWith('sudoku-')){
    if(!store.sudoku)throw Error('Sudoku unavailable');
    const view=(s:SudokuSession)=>{const {player:_,updated:__,...publicState}=s;return publicState};
    if(body.action==='sudoku-start'){
     if(!Number.isInteger(body.level)||body.level<0||body.level>3)return json({error:'Choose a difficulty'},400);
     if(body.name!=null&&typeof body.name!=='string')return json({error:'Enter a valid player name'},400);
     const nickname=(body.name??'').trim().replace(/ +/g,' ');
     if(nickname.length>24||(nickname&&!/^[\p{L}\p{M}\p{N} .'-]+$/u.test(nickname)))return json({error:'Use up to 24 characters: letters, numbers, spaces, dots, apostrophes or hyphens.'},400);
     player??=randomUUID();
     const session:SudokuSession={id:randomUUID(),player,name:nickname||`Player ${player.slice(0,6)}`,startLevel:body.level,level:body.level,wins:0,seconds:0,puzzle:makePuzzle(body.level),started:0,solved:false,updated:now()};
     operation='start';
     if(!await store.sudoku.start(session))return json({error:'Please wait a moment before starting again'},429);
     const response=json(view(session));
     response.headers.set('Set-Cookie',`qm_player=${player}.${sign(player)}; HttpOnly; ${origin.startsWith('https:')?'Secure; ':''}SameSite=Lax; Path=/; Max-Age=31536000`);
     return response;
    }
    if(!player||typeof body.id!=='string'||!/^[a-f0-9-]{36}$/.test(body.id))return json({error:'Start a Sudoku streak first'},400);
    operation='get-round';
    const session=await store.sudoku.get(body.id,player);
    if(!session||session.updated<=now()-86400000)return json({error:'This streak expired or was replaced. Start a new streak.'},404);
    if(body.action==='sudoku-resume')return json(view(session));
    if(!['sudoku-begin','sudoku-solve','sudoku-next'].includes(body.action))return json({error:'Unknown Sudoku action'},400);
    // A repeated submission after a lost response returns the saved win, never adds one.
    if(body.action==='sudoku-solve'&&session.solved&&body.puzzleNumber===session.wins-1)return json(view(session));
    if(body.puzzleNumber!==session.wins)return json({error:'Puzzle changed. Resume the current streak.'},409);
    const next={...session,updated:now()};let save=false;
    if(body.action==='sudoku-begin'){
     if(session.solved)return json({error:'Choose the next puzzle'},409);
     if(session.started)return json(view(session));
     next.started=now();
    }else if(body.action==='sudoku-next'){
     if(!session.solved)return json({error:'Solve this puzzle first'},409);
     next.level=Math.min(3,session.startLevel+session.wins);next.puzzle=makePuzzle(next.level);next.started=0;next.solved=false;
    }else{
     if(session.solved||!session.started)return json({error:'Start this puzzle first'},409);
     if(!validSolution(session.puzzle,body.answer))return json({error:'Not solved yet. Check every row, column and 3 × 3 box.'},400);
     next.wins++;next.seconds+=Math.max(1,Math.floor((now()-session.started)/1000));next.solved=true;save=true;
    }
    operation=save?'save-score':'start';
    if(!await store.sudoku.replace(session,next,save))return json({error:'Streak changed in another request. Resume it before continuing.'},409);
    return json(view(next));
   }
   if(body.action==='heartbeat'){
    if(!player)return json({error:'Start a game before reporting activity'},401);
    if(typeof body.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(body.id))return json({error:'Invalid round'},400);
    operation='activity';return json({count:await store.activity({player,id:body.id})});
   }
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
