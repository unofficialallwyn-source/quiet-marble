import {app} from '@azure/functions';
import {createHandler} from './service.js';
import {unavailable} from './diagnostics.js';
import {SqlStore} from './database.js';
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
