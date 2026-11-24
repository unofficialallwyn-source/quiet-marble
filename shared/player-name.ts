// Nickname rules shared by the API, website and mobile app. The server is the
// authority; clients may call this only to show the same message sooner.
// This is a best-effort filter for a friendly, all-ages leaderboard, not a
// guarantee: players can still report names and moderators can hide them.

export const NAME_MAX_LENGTH=24;
export const NAME_FORMAT_ERROR='Use up to 24 characters: letters, numbers, spaces, dots, apostrophes or hyphens.';
export const NAME_BLOCKED_ERROR='Please choose a different name.';

// Matched anywhere inside a word, after accents and look-alike characters
// ("sh1t") are normalised; letters may repeat ("fuuuck"). Only words that are not normally part of
// innocent longer words belong here (see WORDS for short or ambiguous terms).
const FRAGMENTS=[
 'fuck','fuk','fck','shit','cunt','bitch','biatch','nigger','nigga','faggot','whore','slut','penis','vagina',
 'dildo','porn','rapist','hitler','nazi','wank','bastard','pussy','twat','retard','wetback','tranny',
 'pedophil','paedo','molest','jizz','blowjob','handjob','asshole','arsehole','dickhead','motherf','xxx','kkk',
 'killyourself','bollock','puta','mierda','cabron','pendejo','scheisse','salope','connard','cazzo','vaffancul',
 'chutiya','chutia','bhenchod','behenchod','madarchod','bhosdi',
 // Impersonation of staff.
 'moderator','administrator',
];
// Real words and names that contain a fragment above.
const INNOCENT=/scunthorpe|matsushita|shiitake|shitake|penistone|cockburn|lightwater|dickens/g;
// Matched only as whole words (or spelled out letter by letter), so
// "Cassandra", "Dickens", "Essex", "analyst" and "peacock" are not affected.
const WORDS=[
 'ass','arse','cock','dick','tit','tits','boob','boobs','sex','sexy','anal','cum','spic','chink','kike','fag','fags',
 'rape','raped','hoe','hoes','nazis','kys','admin','mod','mods','official','staff','support','gandu','puto',
];

const LOOKALIKES:Record<string,string>={'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','@':'a','$':'s','!':'i','|':'i'};
// Each letter may repeat ("fuuuck"), but a doubled letter in a term must stay
// doubled, so "ass" does not match "as" and "boobs" does not match "Bobs".
const repeatable=(terms:string[])=>terms.map(t=>t.split('').map(c=>c+'+').join('')).join('|');
const FRAGMENT_PATTERN=new RegExp(repeatable(FRAGMENTS)),WORD_PATTERN=new RegExp(`^(?:${repeatable(WORDS)})$`);

function simplify(name:string){
 return name.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[0134578@$!|]/g,c=>LOOKALIKES[c]);
}

export function isNameAllowed(name:string){
 // Names must not advertise websites.
 if(/\bwww\b|\.\s*(com|net|org|io|gg|co|ly|me|xyz|app|dev|tv|info|biz|in|uk|ru|live|link|shop)\b/i.test(name))return false;
 // Impersonation of the game itself, however it is spaced.
 if(simplify(name).replace(/[^\p{L}]/gu,'').includes('quietmarble'))return false;
 const words=simplify(name).replace(INNOCENT,' ').split(/[^\p{L}]+/u).filter(Boolean);
 // Runs of single letters ("f u c k", "a.s.s") are joined back into one word.
 // Ordinary words are checked separately so "Shi Tao" is not read as "shitao".
 const tokens=[...words];let run='';
 for(const word of [...words,'']){
  if(word.length===1)run+=word;
  else{if(run.length>1)tokens.push(run);run=''}
 }
 return !tokens.some(t=>WORD_PATTERN.test(t)||FRAGMENT_PATTERN.test(t));
}

export type NameCheck={ok:true;name:string}|{ok:false;error:string};
/** Normalises an optional nickname. An empty result means "use the anonymous label". */
export function checkPlayerName(raw:unknown):NameCheck{
 if(raw!=null&&typeof raw!=='string')return {ok:false,error:'Enter a valid player name'};
 const name=(raw??'').trim().replace(/ +/g,' ');
 if(name.length>NAME_MAX_LENGTH||(name&&!/^[\p{L}\p{M}\p{N} .'-]+$/u.test(name)))return {ok:false,error:NAME_FORMAT_ERROR};
 if(name&&!isNameAllowed(name))return {ok:false,error:NAME_BLOCKED_ERROR};
 return {ok:true,name};
}

export const anonymousName=(player:string)=>`Player ${player.slice(0,6)}`;
