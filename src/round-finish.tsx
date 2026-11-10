import type {CSSProperties} from 'react';

// Mounted only while a round is finished; saving a result does not restart it.
export function RoundFinish({won}:{won:boolean}){
 return <div className={`round-finish ${won?'round-won':'round-stopped'}`}>
  {won&&<div className="confetti" aria-hidden="true">{Array.from({length:36},(_,i)=><i key={i} style={{
   left:`${(i*29)%100}%`,background:['#315d4c','#c89a49','#db806e','#81a99c'][i%4],
   '--delay':`${(i%9)*.08}s`,'--drift':`${(i%2?1:-1)*(25+i%5*14)}px`,
   '--spin':`${(i%2?1:-1)*(240+i*23)}deg`
  } as CSSProperties}/>)}</div>}
  <div className="finish-notice" role="status" aria-live="polite">
   <span className="finish-symbol" aria-hidden="true">{won?'✦':'◎'}</span>
   <strong>{won?'You solved it!':'No more moves'}</strong>
   <span>{won?'A lovely finish. Well played.':'This round is complete. Save your result or try again.'}</span>
  </div>
 </div>;
}
