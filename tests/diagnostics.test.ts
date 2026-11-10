import {test} from 'node:test';
import assert from 'node:assert/strict';
import {unavailable} from '../api/src/diagnostics.ts';
import {createHandler,type Store} from '../api/src/service.ts';

test('SQL failure logs correlate with 503 without exposing raw error or player data',async()=>{
 const logs:Record<string,unknown>[]=[];
 const error=Object.assign(new Error('password=secret; player=Alice; SELECT * FROM rounds'),{name:'ConnectionError',code:'ELOGIN',originalError:{info:{number:40613,message:'sensitive server'}}});
 const store={leaderboard:async()=>{throw error}} as unknown as Store;
 const handler=createHandler(store,{origin:'https://game.example',secret:'a'.repeat(40)});
 const response=await handler(new Request('https://game.example/api/game?game=marble&private=secret'),x=>logs.push(x));
 const body=await response.json();
 assert.equal(response.status,503);assert.equal(logs.length,1);
 assert.equal(logs[0].operation,'leaderboard');assert.equal(logs[0].code,'ELOGIN');assert.equal(logs[0].sqlNumber,40613);
 assert.equal(logs[0].requestId,body.requestId);assert.equal(response.headers.get('X-Request-ID'),body.requestId);
 assert.match(body.requestId,/^[a-f0-9-]{36}$/);
 assert(!/secret|Alice|SELECT|sensitive/.test(JSON.stringify({logs,body})));
});

test('unknown errors and logger failures remain sanitized and return 503',async()=>{
 const logs:Record<string,unknown>[]=[];
 const response=unavailable({name:'private-name',code:'private-code',number:'private-number'},'start',Date.now(),x=>logs.push(x));
 assert.equal(logs[0].code,'UNKNOWN');assert.equal(logs[0].errorType,'UnknownError');assert(!('sqlNumber' in logs[0]));
 assert.equal(response.status,503);
 assert.equal(unavailable(null,'request',Date.now(),()=>{throw Error('logger down')}).status,503);
});

test('successful reads and expected client errors do not emit failure logs',async()=>{
 const logs:Record<string,unknown>[]=[];
 const handler=createHandler({leaderboard:async()=>[]} as unknown as Store,{origin:'https://game.example',secret:'a'.repeat(40)});
 assert.equal((await handler(new Request('https://game.example/api/game'),x=>logs.push(x))).status,200);
 assert.equal((await handler(new Request('https://game.example/api/game',{method:'POST'}),x=>logs.push(x))).status,403);
 assert.equal(logs.length,0);
});
