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
// One short transaction serializes leaderboard changes across all API instances.
// Cleanup is request-driven: no scheduler, extra table, or background service.
const begin = `SET XACT_ABORT ON; BEGIN TRANSACTION;
 DECLARE @lockResult int;
 EXEC @lockResult=sys.sp_getapplock @Resource='qm:retention',
 @LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=5000;
 IF @lockResult<0 THROW 50001, 'Leaderboard busy', 1;`;
const cleanup = `
 DELETE FROM dbo.rounds WHERE finished=0 AND started<=@cutoff;
 ;WITH personal AS (
  SELECT *,ROW_NUMBER() OVER(PARTITION BY game,player
   ORDER BY remaining_count,moves,seconds,started,id) AS place
  FROM dbo.rounds WHERE finished=1
 ) DELETE FROM personal WHERE place>1;
 ;WITH leaders AS (
  SELECT *,ROW_NUMBER() OVER(PARTITION BY game
   ORDER BY remaining_count,moves,seconds,started,id) AS place
  FROM dbo.rounds WHERE finished=1
 ) DELETE FROM leaders WHERE place>100;`;
export const ACTIVITY_TTL_MS=5*60*1000;
export const ROUND_TTL_MS=24*60*60*1000;
export class SqlStore implements Store{
 constructor(private connect:()=>Promise<sql.ConnectionPool>=pool){}
 async request(){return (await this.connect()).request().input('cutoff',sql.BigInt,Date.now()-ROUND_TTL_MS)}
 // A separate short transaction keeps activity polling independent of score cleanup.
 async activity(heartbeat?:{player:string;id:string}):Promise<number>{
  const now=Date.now();
  const result=await(await this.connect()).request()
   .input('player',sql.UniqueIdentifier,heartbeat?.player??null)
   .input('round',sql.UniqueIdentifier,heartbeat?.id??null)
   .input('seen',sql.BigInt,now).input('activeCutoff',sql.BigInt,now-ACTIVITY_TTL_MS)
   .input('roundCutoff',sql.BigInt,now-ROUND_TTL_MS).query(`
    SET XACT_ABORT ON;
    BEGIN TRY
     BEGIN TRANSACTION;
     DECLARE @lock int, @accepted bit=1;
     EXEC @lock=sys.sp_getapplock @Resource='qm:activity',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=5000;
     IF @lock<0 THROW 50002, 'Activity busy', 1;
     DELETE FROM dbo.player_activity WHERE last_seen<=@activeCutoff;
     IF @player IS NOT NULL
     BEGIN
      IF EXISTS(SELECT 1 FROM dbo.rounds WHERE id=@round AND player=@player AND finished=0 AND started>@roundCutoff)
      BEGIN
       UPDATE dbo.player_activity SET last_seen=@seen WHERE player=@player AND last_seen<@seen-30000;
       IF NOT EXISTS(SELECT 1 FROM dbo.player_activity WHERE player=@player)
        INSERT dbo.player_activity(player,last_seen) VALUES(@player,@seen);
      END
      ELSE SET @accepted=0;
     END;
     SELECT COUNT(*) AS count, @accepted AS accepted FROM dbo.player_activity WHERE last_seen>@activeCutoff;
     COMMIT;
    END TRY
    BEGIN CATCH
     IF XACT_STATE()<>0 ROLLBACK;
     THROW;
    END CATCH;
   `);
  if(!result.recordset[0].accepted)throw new HttpError(404,'Active round unavailable');
  return result.recordset[0].count;
 }
 async start(r:Round){
  const result=await(await this.request()).input('id',sql.UniqueIdentifier,r.id)
   .input('player',sql.UniqueIdentifier,r.player).input('game',sql.VarChar(10),r.game)
   .input('displayName',sql.NVarChar(24),r.displayName??null).input('started',sql.BigInt,r.started).query(`${begin}${cleanup}
   IF EXISTS(SELECT 1 FROM dbo.rounds WHERE player=@player AND started>@started-1500)
   BEGIN COMMIT; SELECT 0 AS accepted; RETURN; END;
   DELETE FROM dbo.rounds WHERE player=@player AND game=@game AND finished=0;
   INSERT dbo.rounds(id,player,game,started,display_name) VALUES(@id,@player,@game,@started,@displayName);
   COMMIT; SELECT 1 AS accepted;`);
  if(!result.recordset[0].accepted)throw new HttpError(429,'Please wait a moment before starting again');
 }
 async get(id:string,player:string):Promise<Round|null>{
  const r=await(await this.request()).input('id',sql.UniqueIdentifier,id).input('player',sql.UniqueIdentifier,player)
   .query('SELECT id,player,game,started,finished FROM dbo.rounds WHERE id=@id AND player=@player AND (finished=1 OR started>@cutoff)');
  const row=r.recordset[0];return row?{...row,id:row.id.toLowerCase(),player:row.player.toLowerCase(),started:Number(row.started)}:null;
 }
 async finish(id:string,player:string,r:Result){
  const result=await(await this.request()).input('id',sql.UniqueIdentifier,id).input('player',sql.UniqueIdentifier,player)
   .input('left',sql.Int,r.left).input('moves',sql.Int,r.moves).input('seconds',sql.Int,r.seconds)
   .query(`${begin}
   UPDATE dbo.rounds SET finished=1,remaining_count=@left,moves=@moves,seconds=@seconds
    WHERE id=@id AND player=@player AND finished=0 AND started>@cutoff;
   DECLARE @accepted int=@@ROWCOUNT;
   ${cleanup}
   COMMIT; SELECT @accepted AS accepted;`);
  return result.recordset[0].accepted===1;
 }
 async leaderboard(game:Game){
  const result=await(await this.request()).input('game',sql.VarChar(10),game).query(`${begin}${cleanup}
   SELECT TOP(100) LOWER(CONVERT(varchar(36),player)) player,
    COALESCE(display_name,'Player '+LOWER(LEFT(CONVERT(varchar(36),player),6))) name,remaining_count [left],moves,seconds
   FROM dbo.rounds WHERE game=@game AND finished=1
   ORDER BY remaining_count,moves,seconds,started,id;
   COMMIT;`);
  return result.recordset;
 }
}
