import {randomUUID} from 'node:crypto';
export type FailureOperation='configuration'|'request'|'leaderboard'|'start'|'get-round'|'save-score'|'activity';
export type FailureLog=(entry:Record<string,unknown>)=>void;
const codes=new Set(['ETIMEOUT','ESOCKET','ECONNCLOSED','ENOTOPEN','ELOGIN','EINSTLOOKUP','EREQUEST','ECANCEL','EABORT','ENOCONN']);
const names=new Set(['ConnectionError','RequestError','TransactionError','TypeError','Error']);
// Deliberately exclude messages, stacks, SQL text, connection settings and request data.
export function unavailable(error:unknown,operation:FailureOperation,started:number,log?:FailureLog,message='Leaderboard service is temporarily unavailable. Please retry.'){
 const e=error&&typeof error==='object'?error as Record<string,any>:{};
 const number=e.number??e.originalError?.info?.number;
 const requestId=randomUUID();
 const entry={event:'game_api_failure',requestId,operation,durationMs:Math.max(0,Date.now()-started),
  errorType:names.has(e.name)?e.name:'UnknownError',code:codes.has(e.code)?e.code:'UNKNOWN',
  ...(Number.isSafeInteger(number)?{sqlNumber:number}:{})};
 // A failed logger must never replace the controlled API response.
 try{log?.(entry)}catch{}
 return Response.json({error:message,requestId},{status:503,headers:{'Cache-Control':'no-store','X-Request-ID':requestId}});
}
