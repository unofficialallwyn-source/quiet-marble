import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,HttpError,type Store,type Round,type Result} from '../api/src/service.ts';
class MemoryStore implements Store{
 rounds=new Map<string,Round>();results=new Map<string,Result>();
 async start(r:Round){if([...this.rounds.values()].some(x=>x.player===r.player&&r.started-x.started<1500))throw new HttpError(429,'Too fast');this.rounds.set(r.id,r)}
 async get(id:string,p:string){let r=this.rounds.get(id);return r?.player===p?r:null}
 async finish(id:string,p:string,result:Result){const r=await this.get(id,p);if(!r||r.finished)return false;r.finished=true;this.results.set(id,result);return true}
 async activity(_heartbeat?:{player:string;id?:string}){return 0}
 async leaderboard(){return [...this.results.values()]}
}
const origin='https://game.example';
function setup(){const store=new MemoryStore();let time=100000;const handler=createHandler(store,{origin,secret:'a'.repeat(40),now:()=>time});return {store,handler,advance:()=>time+=2000}}
const request=(body:unknown,cookie='',source=origin)=>new Request(origin+'/api/game',{method:'POST',headers:{origin:source,'content-type':'application/json',cookie},body:JSON.stringify(body)});
async function start(handler:ReturnType<typeof createHandler>){const r=await handler(request({action:'start',game:'lights'}));assert.equal(r.status,200);return {id:(await r.json()).id,cookie:r.headers.get('set-cookie')!.split(';')[0]}}
test('signed anonymous identity, valid solution, replay rejection',async()=>{const {handler,store,advance}=setup();const {id,cookie}=await start(handler);advance();const body={id,moves:[0,3,6,9,12,17,21].map(i=>[i])};assert.equal((await handler(request(body,cookie))).status,200);assert.equal(store.results.get(id)?.left,0);assert.equal((await handler(request(body,cookie))).status,409)});
test('reject forged cookie, illegal moves, incomplete games, cross-origin POST',async()=>{const {handler}=setup();const {id,cookie}=await start(handler);assert.equal((await handler(request({id,moves:[[0]]},cookie))).status,400);assert.equal((await handler(request({id,moves:[[25]]},cookie))).status,400);assert.equal((await handler(request({id,moves:[[0]]},cookie+'0'))).status,400);assert.equal((await handler(request({action:'start',game:'lights'},cookie,'https://evil.example'))).status,403)});
test('throttle start, reject malformed JSON, report unavailable backend',async()=>{const {handler}=setup();const {cookie}=await start(handler);assert.equal((await handler(request({action:'start',game:'lights'},cookie))).status,429);assert.equal((await handler(new Request(origin+'/api/game',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{' }))).status,400);const broken=createHandler({...new MemoryStore(),leaderboard:async()=>{throw Error('db detail')} } as Store,{origin,secret:'a'.repeat(40)});const r=await broken(new Request(origin+'/api/game'));assert.equal(r.status,503);assert(!JSON.stringify(await r.json()).includes('db detail'))});

test('session nickname is normalized, optional, validated and bound to the round',async()=>{
 const {handler,store}=setup();
 const response=await handler(request({action:'start',game:'lights',name:"  Allwyn   Joseph  "}));
 assert.equal(response.status,200);const body=await response.json();
 assert.equal(body.name,'Allwyn Joseph');assert.equal(store.rounds.get(body.id)?.displayName,'Allwyn Joseph');
 for(const name of ['x'.repeat(25),'<script>alert(1)</script>','bad\nname','bad\u202ename',42])assert.equal((await handler(request({action:'start',game:'lights',name}))).status,400);
 const fallback=await handler(request({action:'start',game:'lights',name:'   '}));
 assert.match((await fallback.json()).name,/^Player [a-f0-9]{6}$/);
 const unicode=await handler(request({action:'start',game:'lights',name:'അല്വിൻ'}));assert.equal(unicode.status,200);
 const cookie=response.headers.get('set-cookie')!.split(';')[0];
 assert.equal((await handler(request({id:body.id,name:'Different name',moves:[0,3,6,9,12,17,21].map(i=>[i])},cookie))).status,200);
 assert.equal(store.rounds.get(body.id)?.displayName,'Allwyn Joseph');
});

test('activity reads are anonymous; heartbeats require same-origin signed identity and a valid round ID',async()=>{
 const {store,handler}=setup();
 const calls:unknown[]=[];
 store.activity=async(heartbeat?:{player:string;id?:string})=>{calls.push(heartbeat);return 7};
 const read=await handler(new Request(origin+'/api/game?action=activity'));
 assert.deepEqual(await read.json(),{count:7});assert.equal(read.headers.get('set-cookie'),null);
 assert.equal(calls.length,1);assert.equal(calls[0],undefined);
 const {id,cookie}=await start(handler);
 for(const [body,c,source,status] of [
  [{action:'heartbeat',id},'',origin,401],
  [{action:'heartbeat',id},cookie+'0',origin,401],
  [{action:'heartbeat',id},cookie,'https://evil.example',403],
  [{action:'heartbeat',id:'not-a-uuid'},cookie,origin,400],
 ] as const)assert.equal((await handler(request(body,c,source))).status,status);
 assert.equal(calls.length,1);
 const beat=await handler(request({action:'heartbeat',id},cookie));
 assert.deepEqual(await beat.json(),{count:7});
 assert.deepEqual(calls[1],{id,player:store.rounds.get(id)!.player});
 store.activity=async()=>{throw Error('private database error')};
 const failure=await handler(new Request(origin+'/api/game?action=activity'));
 assert.equal(failure.status,503);assert(!('count' in await failure.json()));
});

test('website visitors count only after signed-cookie confirmation without affecting game identity',async()=>{
 const {handler,store}=setup();const seen=new Set<string>();let writes=0;
 store.activity=async(beat?:{player:string;id?:string})=>{if(beat){seen.add(beat.player);writes++}return seen.size};
 const first=await handler(request({action:'visit'}));
 assert.deepEqual(await first.json(),{count:0,registered:false});assert.equal(writes,0);
 const visitorCookie=first.headers.get('set-cookie')!.split(';')[0];assert(visitorCookie.startsWith('qm_visitor='));
 for(let i=0;i<2;i++)assert.deepEqual(await(await handler(request({action:'visit'},visitorCookie))).json(),{count:1,registered:true});
 const {cookie:gameCookie}=await start(handler);
 const same=await handler(request({action:'visit'},gameCookie+'; '+visitorCookie));assert.equal(same.headers.get('set-cookie'),null);assert.equal((await same.json()).count,1);
 const forged=await handler(request({action:'visit'},visitorCookie+'0'));assert.equal((await forged.json()).registered,false);assert.equal(seen.size,1);
 assert.equal((await handler(request({action:'visit'},visitorCookie,'https://evil.example'))).status,403);
 for(let i=0;i<3;i++)await handler(request({action:'visit'}));assert.equal(seen.size,1);
});
