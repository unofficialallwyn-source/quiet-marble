import sql from 'mssql';
import {readFile} from 'node:fs/promises';
const required=name=>{if(!process.env[name])throw Error(`Missing ${name}`);return process.env[name]};
const pool=await new sql.ConnectionPool({server:required('SQL_SERVER'),database:required('SQL_DATABASE'),user:required('SQL_USER'),password:required('SQL_PASSWORD'),options:{encrypt:true,trustServerCertificate:false}}).connect();
try{await pool.request().batch(await readFile(new URL('../../infra/schema.sql',import.meta.url),'utf8'));if(process.env.APP_SQL_PASSWORD){
 const password=process.env.APP_SQL_PASSWORD;
 if(password.length<24)throw Error('APP_SQL_PASSWORD must contain at least 24 characters');
 const escaped=password.replaceAll("'","''");
 await pool.request().batch(`IF DATABASE_PRINCIPAL_ID('qm_app') IS NULL CREATE USER qm_app WITH PASSWORD='${escaped}'; `);
 console.log('Database schema and restricted qm_app user ready. Existing user passwords are unchanged.');
}else console.log('Database schema ready. Set APP_SQL_PASSWORD to create the restricted runtime user.');
await pool.request().batch("IF DATABASE_PRINCIPAL_ID('qm_app') IS NOT NULL BEGIN GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.rounds TO qm_app; GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.player_activity TO qm_app; GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.sudoku_sessions TO qm_app; GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.sudoku_scores TO qm_app; END;");}finally{await pool.close()}
