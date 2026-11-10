import {SqlDeploymentStore} from '../src/deployment-store.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import sql from 'mssql';
import type {SudokuSession} from '../../shared/sudoku.ts';
import {SqlStore,ROUND_TTL_MS,ACTIVITY_TTL_MS} from '../src/database.ts';

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
  // Presence does not count spectators; simultaneous tabs/rounds deduplicate by player.
  assert.equal(await store.activity(),0);
  const p1=round();p1.started=Date.now()-4000;await store.start(p1);
  const p1other={...round(p1.player,'marble'),started:p1.started+2000};await store.start(p1other);
  const p2=round();await store.start(p2);
  assert.deepEqual(await Promise.all([store.activity({player:p1.player,id:p1.id}),store.activity({player:p1.player,id:p1other.id})]),[1,1]);
  assert.equal(await store.activity({player:p2.player,id:p2.id}),2);
  await assert.rejects(store.activity({player:p2.player,id:p1.id}),/Active round unavailable/);
  const doneRound=round();await store.start(doneRound);
  await store.finish(doneRound.id,doneRound.player,{left:0,moves:1,seconds:1});
  await assert.rejects(store.activity({player:doneRound.player,id:doneRound.id}),/Active round unavailable/);
  await assert.rejects(store.activity({player:old.player,id:old.id}),/Active round unavailable/);
  await connection.request().input('player',sql.UniqueIdentifier,p1.player).input('old',sql.BigInt,Date.now()-ACTIVITY_TTL_MS-1)
   .query('UPDATE dbo.player_activity SET last_seen=@old WHERE player=@player');
  assert.equal(await store.activity(),1);
  assert.equal((await connection.request().query('SELECT COUNT(*) n FROM dbo.player_activity')).recordset[0].n,1);
  // Current valid play can rejoin after expiry, without adding duplicate rows.
  assert.equal(await store.activity({player:p1.player,id:p1.id}),2);
  const counts=await connection.request().query('SELECT game,COUNT(*) n FROM dbo.rounds WHERE finished=1 GROUP BY game');
  assert(counts.recordset.every(r=>r.n===100));

  // Sudoku migration is repeatable and scores remain capped across concurrent wins.
  await connection.request().batch(await readFile(new URL('../../infra/schema.sql',import.meta.url),'utf8'));
  const sr=(player=randomUUID()):SudokuSession=>({id:randomUUID(),player,name:'Sudoku player',startLevel:0,level:0,wins:0,seconds:0,puzzle:Array(81).fill(0),started:Date.now()-5000,solved:false,updated:Date.now()-2000});
  const one=sr();assert(await store.sudoku.start(one));assert.equal(await store.sudoku.get(one.id,randomUUID()),null);
  const won={...one,wins:1,seconds:10,solved:true,updated:Date.now()};
  assert.deepEqual((await Promise.all([1,2].map(()=>store.sudoku.replace(one,won,true)))).sort(),[false,true]);
  assert.equal((await store.sudoku.leaderboard()).length,1);
  const replacementSession=sr(one.player);replacementSession.updated=Date.now()+2000;
  assert(await store.sudoku.start(replacementSession));assert.equal(await store.sudoku.get(one.id,one.player),null);
  assert(await store.sudoku.replace(replacementSession,{...replacementSession,wins:1,seconds:50,solved:true},true));
  assert.equal((await store.sudoku.leaderboard() as any[])[0].seconds,10);
  const leaders=Array.from({length:105},(_,i)=>({player:randomUUID(),name:'Player',wins:i+2,seconds:100,start_level:0}));
  await connection.request().input('rows',sql.NVarChar(sql.MAX),JSON.stringify(leaders)).query(`
   INSERT dbo.sudoku_scores(player,name,wins,seconds,start_level)
   SELECT player,name,wins,seconds,start_level FROM OPENJSON(@rows)
   WITH(player uniqueidentifier,name nvarchar(24),wins int,seconds int,start_level int)`);
  const contenders=[sr(),sr()];for(const x of contenders)assert(await store.sudoku.start(x));
  assert.deepEqual(await Promise.all(contenders.map((x,i)=>store.sudoku.replace(x,{...x,wins:200,seconds:20+i,solved:true},true))),[true,true]);
  const sudokuScores=await store.sudoku.leaderboard() as any[];
  assert.equal(sudokuScores.length,100);assert.equal(new Set(sudokuScores.map(x=>x.player)).size,100);assert.equal(sudokuScores[0].wins,200);assert.equal(sudokuScores[0].seconds,20);
  const expired=sr();expired.updated=Date.now()-ROUND_TTL_MS-1;await store.sudoku.start(expired);
  assert.equal(await store.sudoku.get(expired.id,expired.player),null);await store.sudoku.leaderboard();
  assert.equal((await connection.request().input('id',sql.UniqueIdentifier,expired.id).query('SELECT id FROM dbo.sudoku_sessions WHERE id=@id')).recordset.length,0);
  const playing=sr();await store.sudoku.start(playing);assert((await store.activity({player:playing.player,id:playing.id}))>0);
  await store.sudoku.replace(playing,{...playing,solved:true,wins:1,seconds:10},true);
  await assert.rejects(store.activity({player:playing.player,id:playing.id}),/Active round unavailable/);
  // Visible website visitors need no game round; repeated tabs share one row.
  const visitor=randomUUID();const beforeVisitors=await store.activity();
  assert.deepEqual(await Promise.all([1,2].map(()=>store.activity({player:visitor}))),[beforeVisitors+1,beforeVisitors+1]);
  await connection.request().input('player',sql.UniqueIdentifier,visitor).input('old',sql.BigInt,Date.now()-ACTIVITY_TTL_MS-1).query('UPDATE dbo.player_activity SET last_seen=@old WHERE player=@player');
  assert.equal(await store.activity(),beforeVisitors);
  const notices=new SqlDeploymentStore(async()=>connection);
  assert.equal(await notices.get(),null);
  const notice={id:'123-1',startsAt:Date.now()+90000,expiresAt:Date.now()+1800000};
  await notices.begin(notice);assert.deepEqual(await notices.get(),notice);
  await notices.begin({...notice,id:'124-1'});await notices.end('123-1');assert.equal((await notices.get())?.id,'124-1');
  await notices.end('124-1');assert.equal(await notices.get(),null);
 }finally{
  await connection.close();
  await admin.request().batch(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`);
  await admin.close();
 }
});
