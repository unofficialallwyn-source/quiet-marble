import {useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import {useBoardSize} from '../components/boards';
import {difficulties} from '@shared/sudoku';
import {shareGame,shareSudoku} from '@shared/share-text';
import {Button,Card,Choice,Label,Screen} from '../components/ui';
import {FinishBanner,Leaderboard,NameField,ShareButton,Stats,Status,clock,useLeaderboard} from '../components/game-parts';
import {useNickname} from '../lib/player';
import {useColors} from '../lib/settings';
import {fonts} from '../theme/colors';
import {useSudoku} from './useSudoku';

const HINT_EXPLANATION='Using a hint makes the rest of this streak practice-only, so its wins won’t go on the leaderboard. Earlier unassisted wins stay saved. Start a new streak to play ranked again.';

export function SudokuScreen(){
 const colors=useColors();
 const nickname=useNickname();
 const scores=useLeaderboard('sudoku');
 const s=useSudoku({nickname:nickname.name,onWin:()=>void scores.reload(),onFirstHint:()=>Alert.alert('Hints make this a practice streak',HINT_EXPLANATION)});
 const [cell,setCell]=useState(-1);
 const session=s.session;
 const editing=!session||s.confirm;
 return <Screen>
  <View style={styles.heading}>
   <Label variant="eyebrow">NINE NUMBERS. ONE CLEAR MIND.</Label>
   <View style={[styles.pill,{borderColor:colors.softLine,backgroundColor:colors.soft}]}>
    <Label variant="small" style={{color:colors.ink}}>{s.local?'Offline · ':session?.practice?'Practice · ':''}{session?difficulties[session.level]:'Choose your challenge'}</Label>
   </View>
  </View>
  <NameField value={nickname.name} onChange={nickname.change} error={nickname.error} disabled={s.busy||!editing}/>
  <View style={{gap:6,opacity:editing?1:0.6}} pointerEvents={editing?'auto':'none'}>
   <Label variant="small">Starting difficulty</Label>
   <Choice label="Starting difficulty" value={String(s.level)} onChange={v=>s.setLevel(Number(v))} options={difficulties.map((d,i)=>({value:String(i),label:d}))}/>
  </View>
  <Stats items={[{value:String(session?.wins??0),label:'WINS IN A ROW'},{value:clock(session?.seconds??0),label:'SAVED TIME'},{value:clock(s.elapsed),label:'THIS PUZZLE'}]}/>
  {!session?<Card style={{alignItems:'center'}}>
   <Label variant="muted">A fresh puzzle, a growing challenge.</Label>
   <Button primary title={s.busy?'Loading…':'Play Sudoku'} disabled={s.busy} onPress={()=>void s.start()} style={{alignSelf:'stretch'}}/>
  </Card>:<>
   {session.solved&&<FinishBanner won detail={`${session.wins} in a row · ${clock(session.seconds)} total`}/>}
   <SudokuGrid puzzle={session.puzzle} values={s.values} selected={cell} conflict={s.conflict} hint={s.hintCell}
    disabled={session.solved||s.busy} onSelect={i=>{if(s.hintCell?.index===i)s.enter(i,s.hintCell.value);setCell(i)}}/>
   {!session.solved&&<NumberPad disabled={s.busy||cell<0||!!session.puzzle[cell]} onPick={n=>s.enter(cell,n)}/>}
   <Label variant="small" style={{textAlign:'center'}}>Bold numbers are fixed. Tap a cell, then a number.</Label>
   <View style={styles.controls}>
    {session.solved
     ?<Button primary style={styles.wide} disabled={s.busy||s.confirm} onPress={()=>void s.next()} title={`Next puzzle · ${difficulties[Math.min(3,session.startLevel+session.wins)]}`}/>
     :<Button primary style={styles.wide} disabled={s.busy||s.confirm||s.values.some(n=>!n)} onPress={()=>void s.solve()} title={session.practice?'Check practice win':'Check & save win'}/>}
    <Button style={styles.control} disabled={s.busy||session.solved||s.confirm} onPress={()=>void s.hint()} title="✧ Hint"/>
    <Button style={styles.control} disabled={s.busy} onPress={()=>{s.setConfirm(!s.confirm);s.setLevel(session.startLevel)}} title={s.confirm?'Keep playing':'New streak'}/>
    {!s.local&&<Button style={styles.wide} disabled={s.busy} onPress={()=>void s.resume()} title="Resume saved streak"/>}
   </View>
  </>}
  {s.confirm&&<Card soft>
   <Label variant="muted">A new streak resets your wins in a row and the current puzzle. Your best saved score stays on the leaderboard. Choose a difficulty above.</Label>
   <Button primary title="Start new streak" disabled={s.busy} onPress={()=>{setCell(-1);void s.start()}}/>
  </Card>}
  <Status>{s.busy?'Please wait…':s.message}</Status>
  <ShareButton result={!!session?.solved} content={session?.solved?shareSudoku(session):shareGame('sudoku')}/>
  <Card soft>
   <Label variant="eyebrow">THE OBJECTIVE</Label>
   <Label variant="title" style={{fontSize:30,lineHeight:34}}>Nine numbers. No repeats.</Label>
   <Label variant="muted">Fill each row, column and 3 × 3 box with the numbers 1–9, exactly once. Win to advance: Easy → Medium → Hard → Expert. Expert wins continue with fresh Expert puzzles.</Label>
  </Card>
  <Card>
   <Label variant="heading">Sudoku streak leaderboard</Label>
   <Label variant="eyebrow" style={{fontSize:9}}>TOP 100 · BEST STREAK PER PLAYER</Label>
   <Leaderboard board="sudoku" data={scores} empty="Complete a puzzle to start your winning streak."
    detail={r=>`${clock(r.seconds)} total · started ${difficulties[r.startLevel]??''}`} score={r=>({value:String(r.wins),unit:'wins'})}/>
   <Label variant="small">Most wins in a row ranks first; ties use the shortest total solving time. Each unassisted verified win saves automatically. Using a hint makes the rest of that streak practice-only.</Label>
  </Card>
 </Screen>;
}

function SudokuGrid({puzzle,values,selected,conflict,hint,disabled,onSelect}:{puzzle:number[];values:number[];selected:number;
 conflict(i:number):boolean;hint:{index:number;value:number}|null;disabled:boolean;onSelect(i:number):void}){
 const colors=useColors();
 const {size,onLayout}=useBoardSize(460);
 const cell=Math.floor((size-4)/9);
 return <View style={{width:'100%',alignItems:'center'}} onLayout={onLayout}>
  {size>0&&<View accessibilityLabel="Sudoku puzzle" style={[styles.grid,{width:cell*9+4,borderColor:colors.ink,backgroundColor:colors.card}]}>
   {puzzle.map((given,i)=>{
    const r=Math.floor(i/9),c=i%9,value=values[i],bad=conflict(i),hinted=hint?.index===i,chosen=selected===i;
    return <Pressable key={i} disabled={disabled} onPress={()=>onSelect(i)} accessibilityRole="button"
     accessibilityLabel={`Row ${r+1}, column ${c+1}, ${value?value:'empty'}${given?', given':''}${bad?', repeated number':''}${hinted?`, hint ${hint!.value}`:''}`}
     accessibilityState={{selected:chosen}}
     style={[styles.cell,{width:cell,height:cell,borderColor:colors.line,
      borderRightWidth:c===8?0:c%3===2?2:StyleSheet.hairlineWidth,borderBottomWidth:r===8?0:r%3===2?2:StyleSheet.hairlineWidth},
      (c%3===2&&c<8)&&{borderRightColor:colors.ink},(r%3===2&&r<8)&&{borderBottomColor:colors.ink},
      chosen&&{backgroundColor:colors.soft},bad&&{backgroundColor:'#f6d6d0'},hinted&&{backgroundColor:'#fff0bd'}]}>
     <Text style={{fontSize:cell*0.5,fontFamily:given?fonts.bold:fonts.body,color:bad?'#9b2f22':hinted&&!value?'#72500f':given?colors.ink:'#3267a3'}}>
      {value||(hinted?hint!.value:'')}
     </Text>
    </Pressable>;
   })}
  </View>}
 </View>;
}

function NumberPad({disabled,onPick}:{disabled:boolean;onPick(n:number):void}){
 const colors=useColors();
 return <View style={styles.pad}>
  {[1,2,3,4,5,6,7,8,9,0].map(n=><Pressable key={n} disabled={disabled} onPress={()=>onPick(n)} accessibilityRole="button" accessibilityLabel={n?`Enter ${n}`:'Clear cell'}
   style={({pressed})=>[styles.key,{borderColor:colors.line,backgroundColor:colors.card,opacity:disabled?0.45:pressed?0.7:1}]}>
   <Text style={{fontFamily:fonts.medium,fontSize:n?20:14,color:colors.ink}}>{n||'Clear'}</Text>
  </Pressable>)}
 </View>;
}

const styles=StyleSheet.create({
 heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'},
 pill:{borderWidth:1,borderRadius:30,paddingHorizontal:12,paddingVertical:4},
 grid:{flexDirection:'row',flexWrap:'wrap',borderWidth:2},
 cell:{alignItems:'center',justifyContent:'center'},
 pad:{flexDirection:'row',flexWrap:'wrap',gap:6,justifyContent:'center'},
 key:{width:'18%',minHeight:48,borderWidth:1,borderRadius:10,alignItems:'center',justifyContent:'center'},
 controls:{flexDirection:'row',flexWrap:'wrap',gap:8},
 wide:{flexBasis:'100%'},
 control:{flex:1,minWidth:120},
});
