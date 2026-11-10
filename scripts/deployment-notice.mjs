// Workflow-only helper. Never print the shared authorization token.
const action=process.argv[2];
if(!['begin','end'].includes(action))throw Error('Expected begin or end');
const token=process.env.DEPLOYMENT_NOTICE_TOKEN;
if(!token){console.log('Deployment notices are not configured; skipping.');process.exit(0)}
const response=await fetch('https://www.quietmarblegames.com/api/deployment',{
 method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
 body:JSON.stringify({action,id:`${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`})
});
// Bootstrap: this endpoint is not available until the first deployment of this feature.
if(response.status===404){console.log('Notice endpoint not deployed yet; bootstrap deployment proceeds.');process.exit(0)}
if(!response.ok)throw Error(`Deployment notice ${action} failed (HTTP ${response.status}). Check schema and matching token settings.`);
if(action==='begin'){
 console.log('Notice published. Allowing 90 seconds for active players to finish.');
 await new Promise(resolve=>setTimeout(resolve,90000));
}
