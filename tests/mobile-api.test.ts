import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createHandler,HttpError,type Store,type Round,type Result} from '../api/src/service.ts';
import {moderationHandler,AUTO_HIDE_REPORTS,type ModerationStore,type NameReport,type ReportOutcome} from '../api/src/moderation.ts';
import type {SudokuSession} from '../shared/sudoku.ts';

class MemoryModeration implements ModerationStore{
 reports:NameReport[]=[];hidden=new Set<string>();names=new Map<string,string>();
 async report(r:NameReport):Promise<ReportOutcome>{
  if(!this.names.has(r.player))return 'not-found';
  if(this.hidden.has(r.player))return 'hidden';
  if(this.reports.some(x=>x.player===r.player&&x.reporter===r.reporter))return 'duplicate';
  this.reports.push(r);
  if(this.reports.filter(x=>x.player===r.player).length>=AUTO_HIDE_REPORTS){this.hidden.add(r.player);return 'hidden'}
  return 'reported';
 }
 async isHidden(p:string){return this.hidden.has(p)}
 async list(){return [...new Set(this.reports.map(r=>r.player))].map(player=>({player,hidden:this.hidden.has(player),reports:this.reports.filter(r=>r.player===player).map(r=>({board:r.board,name:this.names.get(player)!,created:r.now}))}))}
 async hide(p:string){this.hidden.add(p);this.dismiss(p)}
 async restore(p:string){this.hidden.delete(p);this.dismiss(p)}
 async dismiss(p:string){this.reports=this.reports.filter(r=>r.player!==p)}
}
class MemoryStore implements Store{
 rounds=new Map<string,Round>();results=new Map<string,Result>();board:unknown[]=[];
 moderation=new MemoryModeration();
 sudoku={sessions:new Map<string,SudokuSession>(),
  async get(id:string,p:string){const s=this.sessions.get(id);return s?.player===p?s:null},
  async start(s:SudokuSession){this.sessions.set(s.id,s);return true},
  async replace(){return true},async leaderboard():Promise<unknown[]>{return []}};
 async start(r:Round){if([...this.rounds.values()].some(x=>x.player===r.player&&r.started-x.started<1500))throw new HttpError(429,'Too fast');this.rounds.set(r.id,r)}
 async get(id:string,p:string){const r=this.rounds.get(id);return r?.player===p?r:null}
 async finish(id:string,p:string,result:Result){const r=await this.get(id,p);if(!r||r.finished)return false;r.finished=true;this.results.set(id,result);return true}
 async totalVisits(){return 0}
 async activity(){return 0}
 async leaderboard(){return this.board}
}
const origin='https://game.example',url=origin+'/api/game';
const lightsSolution=[0,3,6,9,12,17,21].map(i=>[i]);
function setup(){const store=new MemoryStore();let time=100000;const handler=createHandler(store,{origin,secret:'a'.repeat(40),now:()=>time});return {store,handler,advance:()=>time+=2000}}
const post=(headers:Record<string,string>,body:unknown)=>new Request(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
const web=(body:unknown,cookie='')=>post({origin,cookie},body);
const app=(body:unknown,token='',extra:Record<string,string>={})=>post({'x-qm-client':'app',...(token?{'x-qm-player-token':token}:{}),...extra},body);

test('app identity: token in the body instead of a cookie, then used for ranked submission',async()=>{
 const {handler,store,advance}=setup();
 const started=await handler(app({action:'start',game:'lights',name:'Pocket player'}));
 assert.equal(started.status,200);assert.equal(started.headers.get('set-cookie'),null);
 const {id,name,playerToken}=await started.json();
 assert.equal(name,'Pocket player');assert.match(playerToken,/^[a-f0-9-]{36}\.[a-f0-9]{64}$/);
 assert.equal(store.rounds.get(id)!.player,playerToken.split('.')[0]);
 advance();
 assert.equal((await handler(app({id,moves:lightsSolution},playerToken))).status,200);
 assert.equal(store.results.get(id)?.left,0);
 // The same token keeps the same player on the next round.
 advance();const again=await(await handler(app({action:'start',game:'marble'},playerToken))).json();
 assert.equal(store.rounds.get(again.id)!.player,store.rounds.get(id)!.player);
});

test('app identity cannot be forged or mixed with website cookies',async()=>{
 const {handler}=setup();
 const {id,playerToken}=await(await handler(app({action:'start',game:'lights'}))).json();
 const [player,signature]=playerToken.split('.');
 const forged=`${player}.${signature.slice(0,-1)}${signature.endsWith('0')?'1':'0'}`;
 assert.equal((await handler(app({id,moves:lightsSolution},forged))).status,400);
 // A token is not a cookie, and the app path ignores cookies.
 assert.equal((await handler(web({id,moves:lightsSolution},`qm_player=${playerToken}`))).status,400);
 assert.equal((await handler(app({id,moves:lightsSolution},'',{cookie:`qm_player=${playerToken}`}))).status,400);
 // A website cookie value does not work as an app token.
 const site=await handler(web({action:'start',game:'lights'}));
 const cookie=site.headers.get('set-cookie')!.split(';')[0];
 const siteRound=(await site.json()).id;
 assert.equal((await handler(app({id:siteRound,moves:lightsSolution},cookie.slice('qm_player='.length)))).status,400);
});

test('origin rules: website origin, or no origin with the app header; nothing else',async()=>{
 const {handler}=setup();
 assert.equal((await handler(post({},{action:'start',game:'lights'}))).status,403);
 assert.equal((await handler(post({'x-qm-client':'web'},{action:'start',game:'lights'}))).status,403);
 // A browser page elsewhere always sends its own Origin, even with the app header.
 assert.equal((await handler(app({action:'start',game:'lights'},'',{origin:'https://evil.example'}))).status,403);
 assert.equal((await handler(app({action:'visit'}))).status,400);
 const sudoku=await handler(app({action:'sudoku-start',level:0,name:'Grid fan'}));
 assert.equal(sudoku.status,200);assert.equal(sudoku.headers.get('set-cookie'),null);
 const body=await sudoku.json();assert.equal(body.name,'Grid fan');assert.match(body.playerToken,/\./);assert(!('player' in body));
});

test('server rejects unsuitable nicknames on every start action',async()=>{
 const {handler,advance}=setup();
 for(const name of ['fuck','Sh1t head','a s s','QuietMarble official','www.spam.com']){
  for(const body of [{action:'start',game:'lights',name},{action:'sudoku-start',level:0,name}]){
   advance();const r=await handler(app(body));
   assert.equal(r.status,400,`${name} ${body.action}`);assert.equal((await r.json()).error,'Please choose a different name.');
  }
 }
 advance();assert.equal((await handler(web({action:'start',game:'lights',name:'Cassandra'}))).status,200);
});

test('leaderboards hide names that fail the current filter',async()=>{
 const {handler,store}=setup();const player=randomUUID();
 store.board=[{player,name:'Sh1thead',left:1},{player:randomUUID(),name:'Allwyn',left:2}];
 const {scores}=await(await handler(new Request(url+'?game=marble'))).json();
 assert.equal(scores[0].name,'Player '+player.slice(0,6));assert.equal(scores[1].name,'Allwyn');
});

test('reporting a name: validation, identity, duplicates and automatic hiding',async()=>{
 const {handler,store,advance}=setup();
 const target=randomUUID();store.moderation.names.set(target,'Rude name');
 assert.equal((await handler(app({action:'report-name',board:'chess',player:target}))).status,400);
 assert.equal((await handler(app({action:'report-name',board:'lights',player:'nope'}))).status,400);
 assert.equal((await handler(app({action:'report-name',board:'lights',player:randomUUID()}))).status,404);
 // Website reports need the same origin as other website writes.
 assert.equal((await handler(post({origin:'https://evil.example'},{action:'report-name',board:'lights',player:target}))).status,403);
 const first=await handler(app({action:'report-name',board:'lights',player:target}));
 assert.equal(first.status,200);const {playerToken,hidden}=await first.json();assert.equal(hidden,false);
 // Repeating a report from the same player does not count twice.
 await handler(app({action:'report-name',board:'lights',player:target.toUpperCase()},playerToken));
 assert.equal(store.moderation.reports.length,1);
 const siteReport=await handler(web({action:'report-name',board:'sudoku',player:target}));
 assert.equal(siteReport.status,200);assert.match(siteReport.headers.get('set-cookie')!,/^qm_player=/);
 const last=await(await handler(app({action:'report-name',board:'marble',player:target}))).json();
 assert.equal(last.hidden,true);assert(store.moderation.hidden.has(target));
 // Players cannot report themselves.
 const self=playerToken.split('.')[0];store.moderation.names.set(self,'Me');
 assert.equal((await handler(app({action:'report-name',board:'lights',player:self},playerToken))).status,400);
 // A hidden player keeps playing under the anonymous label.
 const hiddenPlayer=(await(await handler(app({action:'start',game:'lights',name:'Fresh start'}))).json());
 store.moderation.hidden.add(store.rounds.get(hiddenPlayer.id)!.player);
 advance();const next=await(await handler(app({action:'start',game:'lights',name:'Fresh start'},hiddenPlayer.playerToken))).json();
 assert.match(next.name,/^Player [a-f0-9]{6}$/);assert.equal(store.rounds.get(next.id)!.displayName,null);
});

test('report limits and storage failures use controlled responses',async()=>{
 const {handler,store}=setup();
 store.moderation.report=async()=>'limited';
 assert.equal((await handler(app({action:'report-name',board:'lights',player:randomUUID()}))).status,429);
 store.moderation.report=async()=>{throw Error('private database detail')};
 const failed=await handler(app({action:'report-name',board:'lights',player:randomUUID()}));
 assert.equal(failed.status,503);assert(!JSON.stringify(await failed.json()).includes('private'));
});

test('moderation endpoint requires its own token and supports hide, restore and dismiss',async()=>{
 const store=new MemoryModeration();const token='m'.repeat(40);const player=randomUUID();
 store.names.set(player,'Rude');await store.report({player,reporter:randomUUID(),board:'lights',now:1});
 const call=(method:string,secret:string,body?:unknown,handlerToken=token)=>moderationHandler(store,handlerToken)(new Request(origin+'/api/moderation',{method,headers:{'x-qm-moderation-token':secret},...(body?{body:JSON.stringify(body)}:{})}));
 assert.equal((await call('GET','',undefined,'')).status,503);
 assert.equal((await call('GET','short',undefined,'short')).status,503);
 assert.equal((await call('GET','wrong')).status,401);
 const listed=await(await call('GET',token)).json();
 assert.equal(listed.reports[0].player,player);assert.equal(listed.reports[0].reports.length,1);
 assert.equal((await call('POST',token,{action:'hide',player:'x'})).status,400);
 assert.equal((await call('POST',token,{action:'delete',player})).status,400);
 assert.equal((await call('POST',token,{action:'hide',player:player.toUpperCase()})).status,200);
 assert(store.hidden.has(player));assert.equal(store.reports.length,0);
 assert.equal((await call('POST',token,{action:'restore',player})).status,200);assert(!store.hidden.has(player));
 await store.report({player,reporter:randomUUID(),board:'lights',now:2});
 assert.equal((await call('POST',token,{action:'dismiss',player})).status,200);assert.equal(store.reports.length,0);
});
