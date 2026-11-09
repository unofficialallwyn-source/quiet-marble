import sql from 'mssql';
import {HttpError,type Round,type Result,type Store} from './service.js';
import type {Game} from '../../shared/game.js';
let poolPromise:Promise<sql.ConnectionPool>|undefined;
function required(name:string){const value=process.env[name];if(!value)throw Error(`Missing ${name}`);return value}
export function pool(){
 if(!poolPromise){
  const connection=new sql.ConnectionPool({server:required('SQL_SERVER'),database:required('SQL_DATABASE'),user:required('SQL_USER'),password:required('SQL_PASSWORD'),options:{encrypt:true,trustServerCertificate:false},pool:{max:5,min:0,idleTimeoutMillis:20000},connectionTimeout:10000,requestTimeout:10000});
  connection.on('error',()=>{poolPromise=undefined});
  poolPromise=connection.connect().catch(error=>{poolPromise=undefined;throw error});
 }
 return poolPromise;
}
export class SqlStore implements Store{
 async start(r:Round){
  const result=await(await pool()).request().input('id',sql.UniqueIdentifier,r.id).input('player',sql.UniqueIdentifier,r.player).input('game',sql.VarChar(10),r.game).input('started',sql.BigInt,r.started).input('lock',sql.NVarChar(255),'qm:'+r.player).query(`
   SET XACT_ABORT ON; BEGIN TRANSACTION;
   DECLARE @lockResult int;
   EXEC @lockResult=sys.sp_getapplock @Resource=@lock,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=2000;
   IF @lockResult<0 BEGIN ROLLBACK; SELECT 0 AS accepted; RETURN; END;
   IF EXISTS(SELECT 1 FROM dbo.rounds WHERE player=@player AND started>@started-1500)
   BEGIN ROLLBACK; SELECT 0 AS accepted; RETURN; END;
   INSERT dbo.rounds(id,player,game,started) VALUES(@id,@player,@game,@started);
   COMMIT; SELECT 1 AS accepted;`);
  if(!result.recordset[0].accepted)throw new HttpError(429,'Please wait a moment before starting again');
 }
 async get(id:string,player:string):Promise<Round|null>{
  const r=await(await pool()).request().input('id',sql.UniqueIdentifier,id).input('player',sql.UniqueIdentifier,player).query('SELECT id,player,game,started,finished FROM dbo.rounds WHERE id=@id AND player=@player');
  const row=r.recordset[0];return row?{...row,id:row.id.toLowerCase(),player:row.player.toLowerCase(),started:Number(row.started)}:null;
 }
 async finish(id:string,player:string,r:Result){
  const result=await(await pool()).request().input('id',sql.UniqueIdentifier,id).input('player',sql.UniqueIdentifier,player).input('left',sql.Int,r.left).input('moves',sql.Int,r.moves).input('seconds',sql.Int,r.seconds).query('UPDATE dbo.rounds SET finished=1,remaining_count=@left,moves=@moves,seconds=@seconds WHERE id=@id AND player=@player AND finished=0');
  return result.rowsAffected[0]===1;
 }
 async leaderboard(game:Game){
  const result=await(await pool()).request().input('game',sql.VarChar(10),game).query(`WITH ranked AS (
   SELECT player,remaining_count,moves,seconds,ROW_NUMBER() OVER(PARTITION BY player ORDER BY remaining_count,moves,seconds,id) rn
   FROM dbo.rounds WHERE game=@game AND finished=1)
   SELECT TOP(10) LOWER(LEFT(CONVERT(varchar(36),player),6)) name,remaining_count [left],moves,seconds
   FROM ranked WHERE rn=1 ORDER BY remaining_count,moves,seconds,player`);
  return result.recordset;
 }
}
