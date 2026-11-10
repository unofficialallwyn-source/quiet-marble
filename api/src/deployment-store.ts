import sql from 'mssql';
import {pool} from './database.js';
import type {DeploymentStatus,DeploymentStore} from './deployment.js';
export class SqlDeploymentStore implements DeploymentStore{
 constructor(private connect:()=>Promise<sql.ConnectionPool>=pool){}
 async get(){const r=await(await this.connect()).request().query('SELECT run_id id,starts_at startsAt,expires_at expiresAt FROM dbo.deployment_notice WHERE singleton=1 AND run_id IS NOT NULL');const row=r.recordset[0];return row?{id:row.id,startsAt:Number(row.startsAt),expiresAt:Number(row.expiresAt)}:null}
 async begin(s:DeploymentStatus){await(await this.connect()).request().input('id',sql.VarChar(32),s.id).input('start',sql.BigInt,s.startsAt).input('expiry',sql.BigInt,s.expiresAt).query('UPDATE dbo.deployment_notice SET run_id=@id,starts_at=@start,expires_at=@expiry WHERE singleton=1')}
 async end(id:string){await(await this.connect()).request().input('id',sql.VarChar(32),id).query('UPDATE dbo.deployment_notice SET run_id=NULL,starts_at=NULL,expires_at=NULL WHERE singleton=1 AND run_id=@id')}
}
