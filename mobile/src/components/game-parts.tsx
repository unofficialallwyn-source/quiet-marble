import {useCallback,useEffect,useRef,useState} from 'react';
import {Alert,Pressable,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import {NAME_MAX_LENGTH} from '@shared/player-name';
import {shareText,type ShareContent} from '@shared/share-text';
import {leaderboard,myPlayerId,reportName,ApiError,OfflineError,type Board} from '../lib/api';
import {useColors} from '../lib/settings';
import {fonts} from '../theme/colors';
import {Button,Card,Label} from './ui';

export function NameField({value,onChange,error,disabled}:{value:string;onChange(v:string):void;error:string;disabled:boolean}){
 const colors=useColors();
 return <View style={{gap:6}}>
  <Label variant="small" nativeID="name-label">Your name (optional)</Label>
  <TextInput accessibilityLabelledBy="name-label" accessibilityLabel="Your name (optional)" value={value} onChangeText={onChange}
   editable={!disabled} maxLength={NAME_MAX_LENGTH} autoCorrect={false} autoComplete="off" placeholder="Choose a nickname"
   placeholderTextColor={colors.muted} style={[styles.input,{borderColor:error?'#b4473a':colors.line,color:colors.ink,backgroundColor:colors.card,opacity:disabled?0.6:1}]}/>
  <Label variant="small" style={error?{color:'#b4473a'}:undefined}>{error||'Shown on the leaderboard if your score qualifies. Reset to change it.'}</Label>
 </View>;
}

export function Stats({items}:{items:{value:string;label:string}[]}){
 const colors=useColors();
 return <View style={[styles.stats,{borderColor:colors.line}]}>
  {items.map((s,i)=><View key={s.label} accessible accessibilityLabel={`${s.label}: ${s.value}`} style={[styles.stat,i>0&&{borderLeftWidth:1,borderColor:colors.line}]}>
   <Text style={{fontFamily:fonts.medium,fontSize:24,color:colors.ink,fontVariant:['tabular-nums']}}>{s.value}</Text>
   <Label variant="eyebrow" style={{fontSize:9,letterSpacing:1.4}}>{s.label}</Label>
  </View>)}
 </View>;
}

export const clock=(seconds:number)=>{const s=Math.max(0,Math.floor(seconds));const h=Math.floor(s/3600);return `${h?h+':':''}${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};

/** Status line read out by screen readers when it changes. */
export function Status({children}:{children:string}){
 return <Label variant="muted" accessibilityLiveRegion="polite" style={{textAlign:'center',minHeight:44}}>{children}</Label>;
}

export function ShareButton({content,result}:{content:ShareContent;result:boolean}){
 return <Button title={result?'Share result':'Share game'} onPress={()=>{void Share.share({message:shareText(content),title:content.title}).catch(()=>{})}}/>;
}

export function FinishBanner({won,title,detail}:{won:boolean;title?:string;detail:string}){
 const colors=useColors();
 return <Card soft style={{alignItems:'center'}}>
  <Text style={{fontSize:30,color:won?colors.accent:colors.highlight}} accessibilityElementsHidden importantForAccessibility="no">{won?'✦':'◎'}</Text>
  <Label variant="title" style={{fontSize:28,lineHeight:32,textAlign:'center'}} accessibilityRole="header">{title??(won?'You solved it!':'No more moves')}</Label>
  <Label variant="muted" style={{textAlign:'center'}}>{detail}</Label>
 </Card>;
}

type Row={player:string;name:string};
/** Top-100 leaderboard for one board, loaded from the website. Custom names can be reported. */
export function useLeaderboard(board:Board){
 const [rows,setRows]=useState<Row[]>([]);
 const [state,setState]=useState<'loading'|'ready'|'offline'>('loading');
 const [me,setMe]=useState<string|null>(null);
 const request=useRef(0);
 const fetchScores=useCallback(()=>{
  const id=++request.current;
  return Promise.all([leaderboard(board) as Promise<Row[]>,myPlayerId()]).then(([scores,mine])=>{
   if(id!==request.current)return;setRows(scores);setMe(mine);setState('ready');
  },()=>{if(id===request.current){setRows([]);setState('offline')}});
 },[board]);
 useEffect(()=>{void fetchScores()},[fetchScores]);
 const reload=useCallback(async()=>{setState('loading');await fetchScores()},[fetchScores]);
 return {rows,state,me,reload};
}

const anonymous=(row:Row)=>row.name==='Player '+row.player.slice(0,6);

export function Leaderboard({board,data,detail,score,empty}:{board:Board;data:ReturnType<typeof useLeaderboard>;
 detail(row:any):string;score(row:any):{value:string;unit:string};empty:string}){
 const colors=useColors();
 function report(row:Row){
  Alert.alert('Report this name?',`“${row.name}” will be reviewed. Names reported by several players are hidden automatically. The score stays.`,[
   {text:'Cancel',style:'cancel'},
   {text:'Report',style:'destructive',onPress:async()=>{
    try{const r=await reportName(board,row.player);Alert.alert('Thank you',r.hidden?'This name is now hidden.':'Your report was sent.');if(r.hidden)void data.reload()}
    catch(e){Alert.alert('Report not sent',e instanceof OfflineError?'You’re offline. Please try again later.':e instanceof ApiError?e.message:'Please try again later.')}
   }},
  ]);
 }
 if(data.state==='loading')return <Label variant="muted">Loading leaderboard…</Label>;
 if(data.state==='offline')return <View style={{gap:8}}>
  <Label variant="muted">The leaderboard needs an internet connection. You can still play practice rounds.</Label>
  <Button title="Retry" onPress={()=>void data.reload()}/>
 </View>;
 if(!data.rows.length)return <Label variant="muted">{empty}</Label>;
 return <View accessibilityRole="list">
  {data.rows.map((row,i)=>{const s=score(row),mine=row.player===data.me,canReport=!mine&&!anonymous(row);
   return <View key={row.player} style={[styles.row,{borderColor:colors.line}]}>
    <Text style={[styles.rank,{color:colors.muted}]}>{i+1}</Text>
    <View style={{flex:1}} accessible accessibilityLabel={`Rank ${i+1}, ${row.name}${mine?' (you)':''}, ${s.value} ${s.unit}, ${detail(row)}`}>
     <Label numberOfLines={1}>{row.name}{mine?' (you)':''}</Label>
     <Label variant="small">{detail(row)}</Label>
    </View>
    <Text style={{fontFamily:fonts.medium,fontSize:17,color:colors.ink}}>{s.value} <Text style={{fontFamily:fonts.body,fontSize:11,color:colors.muted}}>{s.unit}</Text></Text>
    {canReport?<Pressable onPress={()=>report(row)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Report the name ${row.name}`} style={styles.more}>
     <Text style={{color:colors.muted,fontSize:18}}>⋯</Text></Pressable>:<View style={styles.more}/>}
   </View>;})}
 </View>;
}

export function Tabs<T extends string>({value,onChange,options}:{value:T;onChange(v:T):void;options:{value:T;label:string}[]}){
 const colors=useColors();
 return <View accessibilityRole="tablist" style={[styles.tabs,{borderColor:colors.line}]}>
  {options.map(o=>{const on=o.value===value;return <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{selected:on}} onPress={()=>onChange(o.value)}
   style={[styles.tab,on&&{borderBottomColor:colors.green}]}><Label style={{fontFamily:on?fonts.medium:fonts.body,color:on?colors.ink:colors.muted}}>{o.label}</Label></Pressable>})}
 </View>;
}

const styles=StyleSheet.create({
 input:{minHeight:48,borderWidth:1,borderRadius:10,paddingHorizontal:14,fontFamily:fonts.body,fontSize:16},
 stats:{flexDirection:'row',borderTopWidth:1,borderBottomWidth:1,paddingVertical:12},
 stat:{flex:1,alignItems:'center',gap:4},
 row:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,borderBottomWidth:1},
 rank:{width:26,fontFamily:fonts.body,fontSize:13},
 more:{width:32,minHeight:32,alignItems:'center',justifyContent:'center'},
 tabs:{flexDirection:'row',gap:20,borderBottomWidth:1},
 tab:{paddingVertical:10,borderBottomWidth:2,borderBottomColor:'transparent'},
});
