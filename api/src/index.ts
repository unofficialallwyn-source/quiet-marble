import {deploymentHandler} from './deployment.js';
import {SqlDeploymentStore} from './deployment-store.js';
import {app} from '@azure/functions';
import {createHandler} from './service.js';
import {unavailable} from './diagnostics.js';
import {SqlStore,pool} from './database.js';
import {moderationHandler} from './moderation.js';
import {SqlModerationStore} from './moderation-store.js';
let handler:ReturnType<typeof createHandler>|undefined;
app.http('game',{methods:['GET','POST'],authLevel:'anonymous',route:'game',handler:async(request,context)=>{
 const started=Date.now();
 try{
  handler??=createHandler(new SqlStore(),{secret:process.env.SESSION_SECRET??'',origin:process.env.ALLOWED_ORIGIN??''});
  const native=new Request(request.url,{method:request.method,headers:Object.fromEntries(request.headers.entries()),...(request.method==='POST'?{body:await request.text()}: {})});
  const response=await handler(native,entry=>context.error(JSON.stringify(entry)));
  return {status:response.status,headers:Object.fromEntries(response.headers.entries()),body:await response.text()};
 }catch(error){
  const response=unavailable(error,'configuration',started,entry=>context.error(JSON.stringify(entry)),'Game service is not configured yet');
  return {status:response.status,headers:Object.fromEntries(response.headers.entries()),body:await response.text()};
 }
}});

// Separate endpoint: deployment status never changes game or leaderboard state.
app.http('deployment',{methods:['GET','POST'],authLevel:'anonymous',route:'deployment',handler:async request=>{
 const native=new Request(request.url,{method:request.method,headers:Object.fromEntries(request.headers.entries()),...(request.method==='POST'?{body:await request.text()}:{})});
 const response=await deploymentHandler(new SqlDeploymentStore(),process.env.DEPLOYMENT_NOTICE_TOKEN??'')(native);
 return {status:response.status,headers:Object.fromEntries(response.headers.entries()),body:await response.text()};
}});

// Moderator-only: review reported leaderboard names, hide, restore or dismiss them.
// Disabled (503) until MODERATION_TOKEN is set to a secret of at least 32 characters.
app.http('moderation',{methods:['GET','POST'],authLevel:'anonymous',route:'moderation',handler:async request=>{
 const native=new Request(request.url,{method:request.method,headers:Object.fromEntries(request.headers.entries()),...(request.method==='POST'?{body:await request.text()}:{})});
 const response=await moderationHandler(new SqlModerationStore(pool),process.env.MODERATION_TOKEN??'')(native);
 return {status:response.status,headers:Object.fromEntries(response.headers.entries()),body:await response.text()};
}});
