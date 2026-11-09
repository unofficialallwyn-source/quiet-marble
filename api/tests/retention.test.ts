import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import sql from 'mssql';
import {SqlStore,ROUND_TTL_MS} from '../src/database.ts';

test('SQL retention, ranking, concurrent saves, duplicate rejection and expiry',async()=>{
 // This test is deliberately restricted to the isolated local CI SQL container.
 const config={server:'127.0.0.1',user:'sa',password:process.env.SQL_TEST_PASSWORD!,
  options:{encrypt:true,trustServerCertificate:true},connectionTimeout:2000};
 assert(config.password,'Set SQL_TEST_PASSWORD for the local test container');
 let admin:sql.ConnectionPool|undefined;
 for(let i=0;i<45;i++){
  const candidate=new sql.ConnectionPool(config);
  try{admin=await candidate.connect();break}catch{await candidate.close();await new Promise(r=>setTimeout(r,1000))}
 }
 assert(admin,'SQL test container did not become ready');
 const database='qm_test_'+randomUUID().replaceAll('-','');
 await admin.request().batch(`CREATE DATABASE [${database}]`);
 const connection=await new sql.ConnectionPool({...config,database}).connect();
 try{
  await connection.request().batch(await readFile(new URL('../../infra/schema.sql',import.meta.url),'utf8'));
  const store=new SqlStore(async()=>connection);
  const started=Date.now()-10000;
  const rows=Array.from({length:210},(_,i)=>({id:randomUUID(),player:randomUUID(),game:i<105?'marble':'lights',started,finished:1,left:i<105?1:0,moves:i%105+1,seconds:20}));
  await connection.request().input('rows',sql.NVarChar(sql.MAX),JSON.stringify(rows)).query(`
   INSERT dbo.rounds(id,player,game,started,finished,remaining_count,moves,seconds)
   SELECT id,player,game,started,finished,[left],moves,seconds FROM OPENJSON(@rows)
   WITH(id uniqueidentifier,player uniqueidentifier,game varchar(10),started bigint,finished bit,[left] int,moves int,seconds int)`);
  const marble=await store.leaderboard('marble'),lights=await store.leaderboard('lights');
  assert.equal(marble.length,100);assert.equal(lights.length,100);
  assert.equal(marble[0].moves,1);assert.equal(marble[99].moves,100);
  const round=(player=randomUUID(),game:'marble'|'lights'='lights')=>({id:randomUUID(),player,game,started:Date.now()-2000,finished:false});
  const worse=round(rows[105].player);await store.start(worse);
  assert(await store.finish(worse.id,worse.player,{left:0,moves:500,seconds:10}));
  assert.equal(await store.get(worse.id,worse.player),null);
  assert.equal(await store.finish(worse.id,worse.player,{left:0,moves:1,seconds:1}),false);
  const better={...round(rows[105].player),displayName:'Allwyn'};await store.start(better);
  assert(await store.finish(better.id,better.player,{left:0,moves:1,seconds:1}));
  assert.equal((await store.leaderboard('lights'))[0].seconds,1);
  assert.equal((await store.leaderboard('lights'))[0].name,'Allwyn');
  assert.match(marble[0].name,/^Player [a-f0-9]{6}$/);
  assert.equal(await store.get(rows[105].id,rows[105].player),null);
  assert.equal(await store.finish(better.id,better.player,{left:0,moves:1,seconds:1}),false);
  // Two qualifying players save simultaneously. The cap must remain exactly 100.
  const concurrent=[round(),round()];for(const r of concurrent)await store.start(r);
  assert.deepEqual(await Promise.all(concurrent.map(r=>store.finish(r.id,r.player,{left:0,moves:2,seconds:1}))),[true,true]);
  const scores=await store.leaderboard('lights');assert.equal(scores.length,100);
  assert.equal(new Set(scores.map(s=>s.player)).size,100);
  const duplicate=round();await store.start(duplicate);
  assert.deepEqual((await Promise.all([1,2].map(()=>store.finish(duplicate.id,duplicate.player,{left:0,moves:3,seconds:1})))).sort(),[false,true]);
  const old=round();old.started=Date.now()-ROUND_TTL_MS-1000;await store.start(old);
  assert.equal(await store.get(old.id,old.player),null);
  assert.equal(await store.finish(old.id,old.player,{left:0,moves:1,seconds:1}),false);
  await store.leaderboard('marble');
  assert.equal((await connection.request().input('id',sql.UniqueIdentifier,old.id).query('SELECT id FROM dbo.rounds WHERE id=@id')).recordset.length,0);
  const first=round();await store.start(first);
  const replacement=round(first.player);replacement.started=Date.now();await store.start(replacement);
  assert.equal(await store.get(first.id,first.player),null);
  assert(await store.get(replacement.id,replacement.player));
  const counts=await connection.request().query('SELECT game,COUNT(*) n FROM dbo.rounds WHERE finished=1 GROUP BY game');
  assert(counts.recordset.every(r=>r.n===100));
 }finally{
  await connection.close();
  await admin.request().batch(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`);
  await admin.close();
 }
});
