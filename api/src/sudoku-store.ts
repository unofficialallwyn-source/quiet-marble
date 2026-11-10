import sql from 'mssql';
import type {SudokuSession} from '../../shared/sudoku.js';
export interface SudokuStore{
 get(id:string,player:string):Promise<SudokuSession|null>;
 start(session:SudokuSession):Promise<boolean>;
 replace(previous:SudokuSession,next:SudokuSession,save:boolean):Promise<boolean>;
 leaderboard():Promise<unknown[]>;
}
const begin=`SET XACT_ABORT ON; BEGIN TRY BEGIN TRANSACTION;
 DECLARE @lock int;
 EXEC @lock=sys.sp_getapplock @Resource='qm:sudoku',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=5000;
 IF @lock<0 THROW 50003,'Sudoku busy',1;
 DELETE FROM dbo.sudoku_sessions WHERE updated<=@cutoff;`;
const end=`COMMIT; END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;`;
export class SqlSudokuStore implements SudokuStore{
 constructor(private connect:()=>Promise<sql.ConnectionPool>){}
 async request(){return(await this.connect()).request().input('cutoff',sql.BigInt,Date.now()-86400000)}
 async get(id:string,player:string){const r=await(await this.request()).input('id',sql.UniqueIdentifier,id).input('player',sql.UniqueIdentifier,player).query('SELECT state FROM dbo.sudoku_sessions WHERE id=@id AND player=@player AND updated>@cutoff');return r.recordset[0]?JSON.parse(r.recordset[0].state) as SudokuSession:null}
 async start(s:SudokuSession){
  const r=await(await this.request()).input('id',sql.UniqueIdentifier,s.id).input('player',sql.UniqueIdentifier,s.player).input('state',sql.NVarChar(sql.MAX),JSON.stringify(s)).input('now',sql.BigInt,s.updated).query(`${begin}
   IF EXISTS(SELECT 1 FROM dbo.sudoku_sessions WHERE player=@player AND updated>@now-1500)
   BEGIN SELECT 0 accepted; END
   ELSE BEGIN
    DELETE FROM dbo.sudoku_sessions WHERE player=@player;
    INSERT dbo.sudoku_sessions(id,player,state,updated) VALUES(@id,@player,@state,@now);
    SELECT 1 accepted;
   END; ${end}`);return !!r.recordset[0].accepted;
 }
 async replace(prev:SudokuSession,next:SudokuSession,save:boolean){
  const r=await(await this.request()).input('id',sql.UniqueIdentifier,prev.id).input('player',sql.UniqueIdentifier,prev.player)
   .input('previous',sql.NVarChar(sql.MAX),JSON.stringify(prev)).input('state',sql.NVarChar(sql.MAX),JSON.stringify(next))
   .input('now',sql.BigInt,next.updated).input('save',sql.Bit,save).input('name',sql.NVarChar(24),next.name)
   .input('wins',sql.Int,next.wins).input('seconds',sql.Int,next.seconds).input('level',sql.Int,next.startLevel).query(`${begin}
    UPDATE dbo.sudoku_sessions SET state=@state,updated=@now WHERE id=@id AND player=@player AND state=@previous;
    DECLARE @accepted int=@@ROWCOUNT;
    IF @accepted=1 AND @save=1
    BEGIN
     UPDATE dbo.sudoku_scores SET name=@name,wins=@wins,seconds=@seconds,start_level=@level
      WHERE player=@player AND (wins<@wins OR (wins=@wins AND seconds>@seconds));
     IF NOT EXISTS(SELECT 1 FROM dbo.sudoku_scores WHERE player=@player)
      INSERT dbo.sudoku_scores(player,name,wins,seconds,start_level) VALUES(@player,@name,@wins,@seconds,@level);
     ;WITH ranked AS(SELECT *,ROW_NUMBER() OVER(ORDER BY wins DESC,seconds,player) place FROM dbo.sudoku_scores)
      DELETE FROM ranked WHERE place>100;
    END;
    SELECT @accepted accepted; ${end}`);
  return !!r.recordset[0].accepted;
 }
 async leaderboard(){const r=await(await this.request()).query(`${begin}
  SELECT TOP(100) LOWER(CONVERT(varchar(36),player)) player,name,wins,seconds,start_level startLevel FROM dbo.sudoku_scores ORDER BY wins DESC,seconds,player;
  ${end}`);return r.recordset}
}
