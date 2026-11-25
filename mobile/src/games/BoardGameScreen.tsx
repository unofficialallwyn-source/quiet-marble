import {useCallback,useEffect,useState} from 'react';
import {Alert,StyleSheet,View} from 'react-native';
import {marbleVariants,type Game,type MarbleVariant} from '@shared/game';
import {shareGame,shareRound} from '@shared/share-text';
import {Button,Card,Label,Screen} from '../components/ui';
import {MarbleBoard,LightsBoard} from '../components/boards';
import {FinishBanner,Leaderboard,NameField,ShareButton,Stats,Status,Tabs,clock,useLeaderboard} from '../components/game-parts';
import {gameInfo} from '../lib/games';
import {personalBest,readResults,useNickname,type ResultRow} from '../lib/player';
import {useColors} from '../lib/settings';
import {AdBanner} from '../lib/ads';
import {useBoardGame} from './useBoardGame';

export const HINT_EXPLANATION='Hints and undo make this a practice round, which won’t count on the public leaderboard. Start a new round to play ranked again.';

export function BoardGameScreen({game}:{game:Game}){
 const colors=useColors();
 const isMarble=game!=='lights';
 const nickname=useNickname();
 const scores=useLeaderboard(game);
 const [results,setResults]=useState<ResultRow[]>([]);
 const [tab,setTab]=useState<'leaderboard'|'mine'>('leaderboard');
 useEffect(()=>{void readResults().then(setResults)},[]);
 const onSaved=useCallback((rows:ResultRow[])=>{setResults(rows);void scores.reload()},[scores]);
 const g=useBoardGame(game,{nickname:nickname.name,onSaved,onFirstHint:()=>Alert.alert('Hints make this a practice round',HINT_EXPLANATION)});
 const info=gameInfo(game);
 const best=personalBest(results,game);
 const mode=g.offline?'Offline practice':g.practice?'Practice':g.active?'Ranked round':'Classic';
 const detail=isMarble
  ?`${g.left} marble${g.left===1?'':'s'} remaining${game==='marble'&&g.left===1&&g.board[24]===1?' · Perfect centre finish':''}`
  :`Solved in ${g.history.length} moves`;
 return <Screen>
  <View style={styles.heading}>
   <Label variant="eyebrow">{isMarble?`${marbleVariants[game as MarbleVariant].name.toUpperCase()} BOARD`:'THE CLASSIC 5 × 5 CHALLENGE'}</Label>
   <View style={[styles.pill,{borderColor:colors.softLine,backgroundColor:colors.soft}]}><Label variant="small" style={{color:colors.ink}}>{mode}</Label></View>
  </View>
  <NameField value={nickname.name} onChange={nickname.change} error={nickname.error} disabled={g.active||g.busy}/>
  <Stats items={[
   {value:String(g.left).padStart(2,'0'),label:isMarble?'MARBLES LEFT':'LIGHTS ON'},
   {value:String(g.history.length).padStart(2,'0'),label:'MOVES'},
   {value:clock(g.seconds),label:'TIME'},
  ]}/>
  {isMarble
   ?<MarbleBoard game={game as MarbleVariant} board={g.board} selected={g.selected} targets={g.targets} hintTarget={g.hintTarget} disabled={g.done||g.busy} onTap={i=>void g.tap(i)}/>
   :<LightsBoard board={g.board} hint={g.selected} disabled={g.done||g.busy} onTap={i=>void g.tap(i)}/>}
  <Label variant="small" style={{textAlign:'center'}}>{isMarble?`${marbleVariants[game as MarbleVariant].holes-1} marbles. ${game==='triangle'?'Top hole empty.':'Centre hole empty.'}`:'One switch changes everything. Can you find the pattern?'}</Label>
  {g.done&&<FinishBanner won={g.won} title={g.won?'Beautifully solved!':'No more moves'} detail={detail}/>}
  <View style={styles.controls}>
   {g.done&&<Button primary style={styles.wide} disabled={g.saved||g.busy} onPress={()=>void g.save()}
    title={g.saved?'✓ Result saved':g.practice?'Save practice result':'Save to leaderboard'}/>}
   <Button primary={!g.done} style={styles.wide} disabled={g.busy} onPress={g.start} title={g.busy?'Please wait…':g.active?'↻ Reset':'▶ Start game'}/>
   <Button style={styles.control} disabled={!g.history.length||g.saved||g.busy} onPress={g.undo} title="↶ Undo"/>
   <Button style={styles.control} disabled={!g.active||g.done||g.busy} onPress={()=>void g.hint()} title="✧ Hint"/>
  </View>
  <Status>{g.message}</Status>
  <ShareButton result={g.done} content={g.done?shareRound(game,g.left,g.history.length,g.seconds,g.practice):shareGame(game)}/>
  {/* The only ad placement: below the game area, away from the game controls. */}
  <AdBanner/>
  <Card soft>
   <Label variant="eyebrow">THE OBJECTIVE</Label>
   <Label variant="title" style={{fontSize:30,lineHeight:34}}>{info.objective}</Label>
   <Label variant="muted">{info.rules}</Label>
   <View style={[styles.divider,{backgroundColor:colors.softLine}]}/>
   <Label variant="eyebrow">YOUR PERSONAL BEST</Label>
   <Label><Label variant="title" style={{fontSize:34}}>{best??'—'}</Label>  {isMarble?'marbles remaining':'moves to solve'}</Label>
   <Label variant="small">Saved on this phone</Label>
  </Card>
  <Card>
   <Tabs<'leaderboard'|'mine'> value={tab} onChange={setTab} options={[{value:'leaderboard',label:'Leaderboard'},{value:'mine',label:'My results'}]}/>
   <Label variant="eyebrow" style={{fontSize:9}}>{isMarble?marbleVariants[game as MarbleVariant].name.toUpperCase()+' · ':''}{tab==='leaderboard'?'ALL-TIME · TOP 100 PLAYERS':'YOUR LAST 10 SAVED ROUNDS'}</Label>
   {tab==='leaderboard'
    ?<Leaderboard board={game} data={scores} empty="The board is open. Finish an unassisted round and be the first to leave your mark."
      detail={r=>`${r.moves} moves · ${r.seconds}s`} score={r=>isMarble?{value:String(r.left),unit:'left'}:{value:String(r.moves),unit:'moves'}}/>
    :<MyResults rows={results.filter(r=>r.game===game).slice(0,10)} marble={isMarble}/>}
   <Label variant="small">{isMarble?'Fewer marbles ranks higher. Ties: moves, then time.':'Fewer moves ranks higher. Ties: time.'} One best result per anonymous player. Hints and undo are practice-only.</Label>
   {g.active&&!!g.playerLabel&&<Label variant="small">Playing as {g.playerLabel}</Label>}
  </Card>
 </Screen>;
}

function MyResults({rows,marble}:{rows:ResultRow[];marble:boolean}){
 if(!rows.length)return <Label variant="muted">Your saved rounds will appear here.</Label>;
 return <View>{rows.map((r,i)=><View key={i} style={styles.result}>
  <Label variant="small">{new Date(r.date).toLocaleDateString()}{r.practice?' · practice':''}</Label>
  <Label>{marble?`${r.left} left`:`${r.moves} moves`}</Label>
 </View>)}</View>;
}

const styles=StyleSheet.create({
 heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 pill:{borderWidth:1,borderRadius:30,paddingHorizontal:12,paddingVertical:4},
 controls:{flexDirection:'row',flexWrap:'wrap',gap:8},
 wide:{flexBasis:'100%'},
 control:{flex:1,minWidth:96},
 divider:{height:1,marginVertical:10},
 result:{flexDirection:'row',justifyContent:'space-between',paddingVertical:6},
});
