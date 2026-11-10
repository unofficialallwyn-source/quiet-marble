import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deploymentHandler,type DeploymentStatus} from '../api/src/deployment.ts';
test('deployment notice authorization, grace period, expiry and matching-run cleanup',async()=>{
 let state:DeploymentStatus|null=null,time=100000;const token='x'.repeat(40);
 const handler=deploymentHandler({get:async()=>state,begin:async s=>{state=s},end:async id=>{if(state?.id===id)state=null}},token,()=>time);
 const get=()=>handler(new Request('https://game.example/api/deployment'));
 const post=(action:string,id='123-1',secret=token)=>handler(new Request('https://game.example/api/deployment',{method:'POST',headers:{'X-QM-Deployment-Token':secret,authorization:'Bearer azure-internal-value'},body:JSON.stringify({action,id})}));
 assert.equal((await post('begin','123-1','wrong')).status,401);assert.equal(state,null);
 assert.equal((await post('begin','invalid')).status,400);assert.equal((await post('delete')).status,400);
 assert.equal((await post('begin')).status,200);
 const response=await get();assert.equal(response.headers.get('cache-control'),'no-store');
 assert.deepEqual(await response.json(),{deployment:{id:'123-1',startsAt:190000,expiresAt:1900000}});
 await post('begin','124-1');await post('end','123-1');assert.equal((await(await get()).json()).deployment.id,'124-1');
 await post('end','124-1');assert.deepEqual(await(await get()).json(),{deployment:null});
 await post('begin');time+=30*60000;assert.deepEqual(await(await get()).json(),{deployment:null});
});
test('deployment store failures remain unavailable without leaking details',async()=>{
 const handler=deploymentHandler({get:async()=>{throw Error('private SQL information')},begin:async()=>{},end:async()=>{}},'');
 const r=await handler(new Request('https://game.example/api/deployment'));assert.equal(r.status,503);assert(!JSON.stringify(await r.json()).includes('SQL'));
 const p=await handler(new Request('https://game.example/api/deployment',{method:'POST',headers:{authorization:'Bearer '},body:'{}'}));assert.equal(p.status,401);
});

test('standard Authorization cannot authenticate a notice, and missing or wrong custom headers fail',async()=>{
 const token='x'.repeat(44);let writes=0;
 const handler=deploymentHandler({get:async()=>null,begin:async()=>{writes++},end:async()=>{}},token);
 const post=(headers:Record<string,string>)=>handler(new Request('https://game.example/api/deployment',{method:'POST',headers,body:JSON.stringify({action:'begin',id:'123-1'})}));
 assert.equal((await post({Authorization:'Bearer '+token})).status,401);
 assert.equal((await post({'X-QM-Deployment-Token':'y'.repeat(44)})).status,401);
 assert.equal(writes,0);
 assert.equal((await post({'X-QM-Deployment-Token':token,Authorization:'Bearer overwritten-by-platform'})).status,200);
 assert.equal(writes,1);
});
