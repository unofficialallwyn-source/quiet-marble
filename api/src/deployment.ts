import {timingSafeEqual} from 'node:crypto';
export interface DeploymentStatus{id:string;startsAt:number;expiresAt:number}
export interface DeploymentStore{
 get():Promise<DeploymentStatus|null>;
 begin(status:DeploymentStatus):Promise<void>;
 end(id:string):Promise<void>;
}
export function deploymentHandler(store:DeploymentStore,token:string,now=Date.now){
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 return async(req:Request):Promise<Response>=>{
  try{
   if(req.method==='GET'){const status=await store.get();return json({deployment:status&&status.expiresAt>now()?status:null})}
   if(req.method!=='POST')return json({error:'Method not allowed'},405);
   const auth=req.headers.get('authorization')||'';const expected='Bearer '+token;
   if(token.length<32||Buffer.byteLength(auth)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(auth),Buffer.from(expected)))return json({error:'Unauthorized'},401);
   const raw=await req.text();if(raw.length>1000)return json({error:'Request too large'},413);
   let body:any;try{body=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
   if(!body||typeof body.id!=='string'||!/^\d{1,20}-\d{1,5}$/.test(body.id)||!['begin','end'].includes(body.action))return json({error:'Invalid deployment'},400);
   if(body.action==='begin')await store.begin({id:body.id,startsAt:now()+90000,expiresAt:now()+30*60000});
   else await store.end(body.id);
   return json({ok:true});
  }catch{return json({error:'Deployment status unavailable'},503)}
 };
}
