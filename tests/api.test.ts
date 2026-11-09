import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,HttpError,type Store,type Round,type Result} from '../api/src/service.ts';
class MemoryStore implements Store{
 rounds=new Map<string,Round>();results=new Map<string,Result>();
 async start(r:Round){if([...this.rounds.values()].some(x=>x.player===r.player&&r.started-x.started<1500))throw new HttpError(429,'Too fast');this.rounds.set(r.id,r)}
 async get(id:string,p:string){let r=this.rounds.get(id);return r?.player===p?r:null}
 async finish(id:string,p:string,result:Result){const r=await this.get(id,p);if(!r||r.finished)return false;r.finished=true;this.results.set(id,result);return true}
 async leaderboard(){return [...this.results.values()]}
}
const origin='https://game.example';
function setup(){const store=new MemoryStore();let time=100000;const handler=createHandler(store,{origin,secret:'a'.repeat(40),now:()=>time});return {store,handler,advance:()=>time+=2000}}
const request=(body:unknown,cookie='',source=origin)=>new Request(origin+'/api/game',{method:'POST',headers:{origin:source,'content-type':'application/json',cookie},body:JSON.stringify(body)});
async function start(handler:ReturnType<typeof createHandler>){const r=await handler(request({action:'start',game:'lights'}));assert.equal(r.status,200);return {id:(await r.json()).id,cookie:r.headers.get('set-cookie')!.split(';')[0]}}
test('signed anonymous identity, valid solution, replay rejection',async()=>{const {handler,store,advance}=setup();const {id,cookie}=await start(handler);advance();const body={id,moves:[0,3,6,9,12,17,21].map(i=>[i])};assert.equal((await handler(request(body,cookie))).status,200);assert.equal(store.results.get(id)?.left,0);assert.equal((await handler(request(body,cookie))).status,409)});
test('reject forged cookie, illegal moves, incomplete games, cross-origin POST',async()=>{const {handler}=setup();const {id,cookie}=await start(handler);assert.equal((await handler(request({id,moves:[[0]]},cookie))).status,400);assert.equal((await handler(request({id,moves:[[25]]},cookie))).status,400);assert.equal((await handler(request({id,moves:[[0]]},cookie+'0'))).status,400);assert.equal((await handler(request({action:'start',game:'lights'},cookie,'https://evil.example'))).status,403)});
test('throttle start, reject malformed JSON, report unavailable backend',async()=>{const {handler}=setup();const {cookie}=await start(handler);assert.equal((await handler(request({action:'start',game:'lights'},cookie))).status,429);assert.equal((await handler(new Request(origin+'/api/game',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{' }))).status,400);const broken=createHandler({...new MemoryStore(),leaderboard:async()=>{throw Error('db detail')} } as Store,{origin,secret:'a'.repeat(40)});const r=await broken(new Request(origin+'/api/game'));assert.equal(r.status,503);assert(!JSON.stringify(await r.json()).includes('db detail'))});
