import sql from 'mssql';
import {AUTO_HIDE_REPORTS,REPORTS_PER_DAY,REPORT_TTL_MS,type ModerationStore,type NameReport,type ReportOutcome,type ReportedName} from './moderation.js';
const transaction=(body:string)=>`SET XACT_ABORT ON; BEGIN TRY BEGIN TRANSACTION;
 DECLARE @lock int;
 EXEC @lock=sys.sp_getapplock @Resource='qm:reports',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=5000;
 IF @lock<0 THROW 50004,'Reports busy',1;
 ${body}
 COMMIT; END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;`;
export class SqlModerationStore implements ModerationStore{
 constructor(private connect:()=>Promise<sql.ConnectionPool>){}
 private async request(player:string){return(await this.connect()).request().input('player',sql.UniqueIdentifier,player)}
 async report(r:NameReport):Promise<ReportOutcome>{
  const result=await(await this.request(r.player)).input('reporter',sql.UniqueIdentifier,r.reporter).input('board',sql.VarChar(10),r.board)
   .input('now',sql.BigInt,r.now).input('cutoff',sql.BigInt,r.now-REPORT_TTL_MS).input('day',sql.BigInt,r.now-86400000)
   .input('threshold',sql.Int,AUTO_HIDE_REPORTS).input('perDay',sql.Int,REPORTS_PER_DAY).query(transaction(`
   DELETE FROM dbo.name_reports WHERE created<=@cutoff;
   DECLARE @name nvarchar(24)=NULL,@outcome varchar(10);
   -- Only a custom name currently on that leaderboard can be reported.
   IF @board='sudoku'
    SELECT @name=name FROM dbo.sudoku_scores WHERE player=@player AND name<>'Player '+LOWER(LEFT(CONVERT(varchar(36),player),6));
   ELSE
    SELECT TOP(1) @name=display_name FROM dbo.rounds WHERE player=@player AND game=@board AND finished=1 AND display_name IS NOT NULL;
   IF @name IS NULL SET @outcome='not-found';
   ELSE IF EXISTS(SELECT 1 FROM dbo.hidden_names WHERE player=@player) SET @outcome='hidden';
   ELSE IF EXISTS(SELECT 1 FROM dbo.name_reports WHERE player=@player AND reporter=@reporter) SET @outcome='duplicate';
   ELSE IF (SELECT COUNT(*) FROM dbo.name_reports WHERE reporter=@reporter AND created>@day)>=@perDay SET @outcome='limited';
   ELSE
   BEGIN
    INSERT dbo.name_reports(player,reporter,board,name,created) VALUES(@player,@reporter,@board,@name,@now);
    IF (SELECT COUNT(*) FROM dbo.name_reports WHERE player=@player)>=@threshold
    BEGIN
     INSERT dbo.hidden_names(player,hidden_at,source) VALUES(@player,@now,'reports');
     SET @outcome='hidden';
    END
    ELSE SET @outcome='reported';
   END;
   SELECT @outcome outcome;`));
  return result.recordset[0].outcome;
 }
 async isHidden(player:string){
  return (await(await this.request(player)).query('SELECT 1 hidden FROM dbo.hidden_names WHERE player=@player')).recordset.length>0;
 }
 async list(){
  const pool=await this.connect();
  const reports=(await pool.request().input('cutoff',sql.BigInt,Date.now()-REPORT_TTL_MS).query(`
   SELECT LOWER(CONVERT(varchar(36),player)) player,board,name,created FROM dbo.name_reports WHERE created>@cutoff ORDER BY created DESC`)).recordset;
  const hidden=(await pool.request().query(`SELECT LOWER(CONVERT(varchar(36),player)) player,source FROM dbo.hidden_names ORDER BY hidden_at DESC`)).recordset;
  const byPlayer=new Map<string,ReportedName>();
  for(const h of hidden)byPlayer.set(h.player,{player:h.player,hidden:true,hiddenBy:h.source,reports:[]});
  for(const r of reports){
   const entry:ReportedName=byPlayer.get(r.player)??{player:r.player,hidden:false,reports:[]};
   entry.reports.push({board:r.board,name:r.name,created:Number(r.created)});byPlayer.set(r.player,entry);
  }
  // Unresolved reports first, then hidden names.
  return [...byPlayer.values()].sort((a,b)=>Number(a.hidden)-Number(b.hidden)||b.reports.length-a.reports.length);
 }
 async hide(player:string,now:number){
  await(await this.request(player)).input('now',sql.BigInt,now).query(transaction(`
   IF NOT EXISTS(SELECT 1 FROM dbo.hidden_names WHERE player=@player)
    INSERT dbo.hidden_names(player,hidden_at,source) VALUES(@player,@now,'moderator');
   DELETE FROM dbo.name_reports WHERE player=@player;`));
 }
 async restore(player:string){
  await(await this.request(player)).query(transaction(`
   DELETE FROM dbo.hidden_names WHERE player=@player;
   DELETE FROM dbo.name_reports WHERE player=@player;`));
 }
 async dismiss(player:string){
  await(await this.request(player)).query(transaction('DELETE FROM dbo.name_reports WHERE player=@player;'));
 }
}
