// Release dates are explicit so badges expire instead of remaining permanently new.
export const VARIANTS_RELEASE='2026-11-10T00:00:00+05:30';
export function isRecent(released:string,now=Date.now()){
 const age=now-Date.parse(released);return age>=0&&age<30*24*60*60*1000;
}
export function RecentlyAdded(){return isRecent(VARIANTS_RELEASE)?<span className="recent-badge">Recently added</span>:null;}
