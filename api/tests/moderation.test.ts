import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import sql from 'mssql';
import {SqlStore} from '../src/database.ts';
import {AUTO_HIDE_REPORTS,REPORTS_PER_DAY,REPORT_TTL_MS} from '../src/moderation.ts';

test('SQL name reports, automatic hiding, moderation and leaderboard masking',async()=>{
 // Restricted to the isolated local CI SQL container, like retention.test.ts.
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
  const schema=await readFile(new URL('../../infra/schema.sql',import.meta.url),'utf8');
  await connection.request().batch(schema);
  await connection.request().batch(schema); // The migration stays repeatable.
  const store=new SqlStore(async()=>connection),moderation=store.moderation,now=Date.now();
  const named=randomUUID(),anonymous=randomUUID(),sudokuPlayer=randomUUID();
  for(const [player,displayName] of [[named,'Rude name'],[anonymous,undefined]] as const){
   const r={id:randomUUID(),player,game:'lights' as const,started:now-5000,finished:false,displayName};
   await store.start(r);assert(await store.finish(r.id,player,{left:0,moves:7,seconds:3}));
  }
  await connection.request().input('player',sql.UniqueIdentifier,sudokuPlayer)
   .query("INSERT dbo.sudoku_scores(player,name,wins,seconds,start_level) VALUES(@player,'Sudoku rude',3,40,0)");
  const label=(p:string)=>'Player '+p.slice(0,6);
  const reporters=Array.from({length:AUTO_HIDE_REPORTS},()=>randomUUID());

  // Only custom names that are on the reported board can be reported.
  assert.equal(await moderation.report({player:anonymous,reporter:reporters[0],board:'lights',now}),'not-found');
  assert.equal(await moderation.report({player:named,reporter:reporters[0],board:'marble',now}),'not-found');
  assert.equal(await moderation.report({player:randomUUID(),reporter:reporters[0],board:'sudoku',now}),'not-found');
  assert.equal(await moderation.report({player:named,reporter:reporters[0],board:'lights',now}),'reported');
  assert.equal(await moderation.report({player:named,reporter:reporters[0],board:'lights',now}),'duplicate');
  // Concurrent reports from different players still hide exactly once.
  const outcomes=await Promise.all(reporters.slice(1).map(reporter=>moderation.report({player:named,reporter,board:'lights',now})));
  assert.equal(outcomes.filter(o=>o==='hidden').length,1);
  assert(await moderation.isHidden(named));
  assert.equal(await moderation.report({player:named,reporter:randomUUID(),board:'lights',now}),'hidden');
  const lights=await store.leaderboard('lights') as any[];
  assert.equal(lights.find(s=>s.player===named).name,label(named));
  assert.equal(lights.find(s=>s.player===anonymous).name,label(anonymous));
  assert.equal(lights.length,2); // Hiding a name never removes the score.

  // Sudoku names hide too; moderators can restore and dismiss.
  assert.equal(await moderation.report({player:sudokuPlayer,reporter:reporters[0],board:'sudoku',now}),'reported');
  let listed=await moderation.list();
  assert.equal(listed[0].player,sudokuPlayer);assert.equal(listed[0].hidden,false);assert.equal(listed[0].reports[0].name,'Sudoku rude');
  assert.equal(listed.find(x=>x.player===named)?.hiddenBy,'reports');
  await moderation.hide(sudokuPlayer,now);await moderation.hide(sudokuPlayer,now);
  assert.equal((await store.sudoku.leaderboard() as any[])[0].name,label(sudokuPlayer));
  listed=await moderation.list();
  assert.deepEqual(listed.find(x=>x.player===sudokuPlayer),{player:sudokuPlayer,hidden:true,hiddenBy:'moderator',reports:[]});
  await moderation.restore(sudokuPlayer);
  assert.equal((await store.sudoku.leaderboard() as any[])[0].name,'Sudoku rude');
  await moderation.report({player:sudokuPlayer,reporter:reporters[1],board:'sudoku',now});
  await moderation.dismiss(sudokuPlayer);
  assert.equal((await moderation.list()).some(x=>x.player===sudokuPlayer),false);
  assert.equal(await moderation.isHidden(sudokuPlayer),false);

  // Daily per-reporter limit, and reports expire after the retention period.
  const busy=randomUUID();
  const targets=Array.from({length:REPORTS_PER_DAY+1},()=>randomUUID());
  for(const t of targets)await connection.request().input('player',sql.UniqueIdentifier,t)
   .query("INSERT dbo.sudoku_scores(player,name,wins,seconds,start_level) VALUES(@player,'Someone',1,10,0)");
  for(const t of targets.slice(0,-1))assert.equal(await moderation.report({player:t,reporter:busy,board:'sudoku',now}),'reported');
  assert.equal(await moderation.report({player:targets.at(-1)!,reporter:busy,board:'sudoku',now}),'limited');
  assert.equal(await moderation.report({player:targets.at(-1)!,reporter:busy,board:'sudoku',now:now+86400001}),'reported');
  await moderation.report({player:sudokuPlayer,reporter:randomUUID(),board:'sudoku',now:now+REPORT_TTL_MS+86400000});
  const left=(await connection.request().query('SELECT COUNT(*) n FROM dbo.name_reports')).recordset[0].n;
  assert.equal(left,2); // Only the two reports newer than 30 days remain.
 }finally{
  await connection.close();
  await admin.request().batch(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`);
  await admin.close();
 }
});
