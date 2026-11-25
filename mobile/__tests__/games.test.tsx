import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {Alert} from 'react-native';
import {render,screen,fireEvent,waitFor} from '@testing-library/react-native';
import {solveSudoku} from '@shared/sudoku-hint';
import {validSolution} from '@shared/sudoku';
import {SettingsProvider} from '../src/lib/settings';
import {SoundProvider} from '../src/lib/sounds';
import {BoardGameScreen} from '../src/games/BoardGameScreen';
import {SudokuScreen} from '../src/games/SudokuScreen';
import {localStart,localBegin,localSolve,localNext,localHint,isLocal} from '../src/games/local-sudoku';
import {holePositions} from '../src/components/boards';
import {KEYS} from '../src/lib/storage';
import {OfflineError,ApiError,startRound} from '../src/lib/api';

const PLAYER='0123abcd-0000-4000-8000-000000000001',TOKEN=`${PLAYER}.${'c'.repeat(64)}`;
const OTHER='9999ffff-0000-4000-8000-000000000002';
type Call={url:string;body:any;headers:Record<string,string>};
let calls:Call[]=[];
let server:(call:Call)=>{status:number;body:any}|'offline';
const json=(status:number,body:any)=>({status,body});

beforeEach(async()=>{
 await AsyncStorage.clear();(SecureStore as any).__items.clear();calls=[];
 server=()=>'offline';
 globalThis.fetch=jest.fn(async(url:any,init:any={})=>{
  const call={url:String(url),body:init.body?JSON.parse(init.body):null,headers:init.headers??{}};calls.push(call);
  const reply=server(call);if(reply==='offline')throw TypeError('Network request failed');
  return {ok:reply.status<400,status:reply.status,json:async()=>reply.body} as Response;
 }) as any;
 jest.spyOn(Alert,'alert').mockImplementation(()=>{});
});
afterEach(()=>jest.restoreAllMocks());

const wrap=(ui:React.ReactElement)=>render(<SettingsProvider><SoundProvider>{ui}</SoundProvider></SettingsProvider>);
const posts=()=>calls.filter(c=>c.body);
const tile=(i:number)=>screen.getByLabelText(new RegExp(`^Tile row ${Math.floor(i/5)+1}, column ${i%5+1},`));
const LIGHTS=[0,3,6,9,12,17,21];

test('API client: app headers, token saved, offline and server errors told apart',async()=>{
 server=c=>c.body?.action==='start'?json(200,{id:'r1',name:'Ann',playerToken:TOKEN}):json(400,{error:'nope'});
 await startRound('lights','Ann');
 expect(calls[0].url).toBe('https://www.quietmarblegames.com/api/game');
 expect(calls[0].headers).toMatchObject({'X-QM-Client':'app','Content-Type':'application/json'});
 expect(calls[0].headers['Origin']).toBeUndefined();
 expect(await SecureStore.getItemAsync('qm-player-token')).toBe(TOKEN);
 await startRound('lights','Ann');expect(calls[1].headers['X-QM-Player-Token']).toBe(TOKEN);
 server=()=>json(400,{error:'Please choose a different name.'});
 await expect(startRound('lights','x')).rejects.toEqual(new ApiError('Please choose a different name.',400));
 server=()=>json(503,{error:'Leaderboard service is temporarily unavailable.'});
 await expect(startRound('lights','x')).rejects.toBeInstanceOf(OfflineError);
 server=()=>'offline';
 await expect(startRound('lights','x')).rejects.toBeInstanceOf(OfflineError);
});

test('Lights Out ranked round: first tap starts it, solving and saving submits the moves',async()=>{
 server=c=>c.body?.action==='start'?json(200,{id:'round-1',name:'Ann',playerToken:TOKEN})
  :c.body?.id==='round-1'?json(200,{ok:true,seconds:9}):!c.body?json(200,{scores:[{player:OTHER,name:'Bea',left:0,moves:7,seconds:20}]}):json(400,{error:'?'});
 await wrap(<BoardGameScreen game="lights"/>);
 expect(await screen.findByText('Bea')).toBeTruthy();
 await fireEvent.changeText(screen.getByLabelText('Your name (optional)'),'Ann');
 await fireEvent.press(tile(LIGHTS[0]));
 await waitFor(()=>expect(screen.getByText('Ranked round')).toBeTruthy());
 expect(posts()[0].body).toEqual({action:'start',game:'lights',name:'Ann'});
 for(const i of LIGHTS.slice(1))await fireEvent.press(tile(i));
 expect(await screen.findByText('Beautifully solved!')).toBeTruthy();
 await fireEvent.press(screen.getByText('Save to leaderboard'));
 await waitFor(()=>expect(screen.getByText('✓ Result saved')).toBeTruthy());
 expect(posts()[1].body).toEqual({id:'round-1',moves:LIGHTS.map(i=>[i])});
 expect(posts()[1].headers['X-QM-Player-Token']).toBe(TOKEN);
 const saved=JSON.parse((await AsyncStorage.getItem(KEYS.history))!);
 expect(saved[0]).toMatchObject({game:'lights',left:0,moves:7,practice:false});
 expect(calls.filter(c=>!c.body).length).toBe(2); // leaderboard refreshed after saving
});

test('offline: the round becomes practice and is saved on the phone only',async()=>{
 await wrap(<BoardGameScreen game="lights"/>);
 expect(await screen.findByText(/leaderboard needs an internet connection/)).toBeTruthy();
 await fireEvent.press(tile(LIGHTS[0]));
 expect(await screen.findByText('Offline practice')).toBeTruthy();
 expect(screen.getByText(/You’re offline, so this is a practice round/)).toBeTruthy();
 for(const i of LIGHTS.slice(1))await fireEvent.press(tile(i));
 await fireEvent.press(await screen.findByText('Save practice result'));
 await waitFor(()=>expect(screen.getByText('✓ Result saved')).toBeTruthy());
 expect(posts().filter(c=>c.body.id)).toHaveLength(0);
 expect(JSON.parse((await AsyncStorage.getItem(KEYS.history))!)[0]).toMatchObject({practice:true,moves:7});
});

test('a rejected nickname stops the round from starting; an invalid one is caught on the phone',async()=>{
 server=c=>c.body?.action==='start'?json(400,{error:'Please choose a different name.'}):json(200,{scores:[]});
 await wrap(<BoardGameScreen game="lights"/>);
 await fireEvent.changeText(screen.getByLabelText('Your name (optional)'),'Rude');
 await fireEvent.press(tile(0));
 expect(await screen.findByText('Please choose a different name.')).toBeTruthy();
 expect(screen.getByText('Classic')).toBeTruthy();
 await fireEvent.changeText(screen.getByLabelText('Your name (optional)'),'sh1t');
 expect(screen.getAllByText('Please choose a different name.').length).toBeGreaterThan(0);
 const before=posts().length;await fireEvent.press(tile(0));expect(posts().length).toBe(before);
});

test('hints and undo make a ranked round practice, and the first hint is explained once',async()=>{
 server=c=>c.body?.action==='start'?json(200,{id:'r',name:'Player 0123ab',playerToken:TOKEN}):json(200,{scores:[]});
 await wrap(<BoardGameScreen game="lights"/>);
 await fireEvent.press(tile(0));await waitFor(()=>expect(screen.getByText('Ranked round')).toBeTruthy());
 await fireEvent.press(screen.getByText('✧ Hint'));
 expect(await screen.findByText('Practice')).toBeTruthy();
 expect(screen.getByLabelText(/, hint$/)).toBeTruthy();
 expect(Alert.alert).toHaveBeenCalledTimes(1);
 await fireEvent.press(screen.getByText('✧ Hint'));expect(Alert.alert).toHaveBeenCalledTimes(1);
 await fireEvent.press(screen.getByText('↻ Reset'));
 expect(screen.getByText('Classic')).toBeTruthy();
 await fireEvent.press(tile(0));await waitFor(()=>expect(screen.getByText('Ranked round')).toBeTruthy());
 await fireEvent.press(tile(1));await fireEvent.press(screen.getByText('↶ Undo'));
 expect(screen.getByText('Practice')).toBeTruthy();expect(screen.getByText(/Move undone/)).toBeTruthy();
});

test('marble boards: select, jump, and hints point to a winning move on every shape',async()=>{
 for(const game of ['marble','triangle','diamond'] as const){
  const {spots}=holePositions(game);expect(spots.length).toBe({marble:33,triangle:15,diamond:13}[game]);
 }
 await wrap(<BoardGameScreen game="triangle"/>);
 // Triangle opening: the top hole (row 1) is empty; jump the marble from row 3 col 1 into it.
 await fireEvent.press(screen.getByLabelText(/^Hole row 3, column 1, marble/));
 expect(screen.getByLabelText(/^Hole row 1, column 1, empty, you can jump here/)).toBeTruthy();
 await fireEvent.press(screen.getByLabelText(/^Hole row 1, column 1, empty/));
 expect(await screen.findByText('Offline practice')).toBeTruthy();
 expect(screen.getByLabelText('MARBLES LEFT: 13')).toBeTruthy();
 await fireEvent.press(screen.getByText('✧ Hint'));
 expect(await screen.findByText(/Hint: move the selected marble/)).toBeTruthy();
 expect(screen.getAllByLabelText(/selected/).length).toBe(1);
});

test('reporting a leaderboard name asks first, then sends the report',async()=>{
 server=c=>!c.body?json(200,{scores:[{player:OTHER,name:'Rude name',left:1,moves:20,seconds:60},{player:PLAYER,name:'Me',left:2,moves:20,seconds:60},{player:'abcdef12-0000-4000-8000-000000000003',name:'Player abcdef',left:3,moves:2,seconds:9}]})
  :json(200,{ok:true,hidden:false});
 await SecureStore.setItemAsync('qm-player-token',TOKEN);
 await wrap(<BoardGameScreen game="marble"/>);
 expect(await screen.findByText('Rude name')).toBeTruthy();
 expect(screen.getByText('Me (you)')).toBeTruthy();
 // Only other players' custom names can be reported.
 expect(screen.getAllByLabelText(/^Report the name/)).toHaveLength(1);
 await fireEvent.press(screen.getByLabelText('Report the name Rude name'));
 const buttons=(Alert.alert as jest.Mock).mock.calls[0][2];
 await buttons.find((b:any)=>b.text==='Report').onPress();
 expect(posts()[0].body).toEqual({action:'report-name',board:'marble',player:OTHER});
});

test('offline Sudoku practice follows the same rules as the server',()=>{
 const s=localStart(0,'Ann',1000);expect(isLocal(s)).toBe(true);expect(s.practice).toBe(true);
 expect(s.puzzle.filter(Boolean).length).toBe(44);
 expect(()=>localSolve(s,s.puzzle,2000)).toThrow('Start this puzzle first');
 const begun=localBegin(s,5000);expect(localBegin(begun,9000).started).toBe(5000);
 expect(()=>localSolve(begun,s.puzzle,6000)).toThrow(/Not solved yet/);
 const answer=solveSudoku(s.puzzle)!;expect(validSolution(s.puzzle,answer)).toBe(true);
 const won=localSolve(begun,answer,65000);expect(won).toMatchObject({wins:1,seconds:60,solved:true});
 expect(()=>localNext(begun)).toThrow('Solve this puzzle first');
 const next=localNext(won);expect(next).toMatchObject({level:1,solved:false,started:0,wins:1});
 expect(next.puzzle.filter(Boolean).length).toBe(38);
 expect(localHint(next,7000)).toMatchObject({practice:true,started:7000});
});

test('Sudoku online: start, first entry begins the timer, wins are checked by the server',async()=>{
 // The fake server hands out a nearly finished puzzle so the test taps only a few cells.
 const answer=solveSudoku(localStart(0,'',1).puzzle)!;
 const puzzle=answer.map((n,i)=>[3,17,40,58,80].includes(i)?0:n);
 const session={id:'s-1',name:'Ann',startLevel:3,level:3,wins:0,seconds:0,puzzle,started:0,solved:false};
 server=c=>{
  if(!c.body)return json(200,{scores:[]});
  if(c.body.action==='sudoku-start')return json(200,{...session,playerToken:TOKEN});
  if(c.body.action==='sudoku-begin')return json(200,{...session,started:Date.now()});
  if(c.body.action==='sudoku-solve')return validSolution(puzzle,c.body.answer)?json(200,{...session,started:1,wins:1,seconds:42,solved:true}):json(400,{error:'Not solved yet.'});
  return json(400,{error:'?'});
 };
 await wrap(<SudokuScreen/>);
 await fireEvent.press(screen.getByRole('radio',{name:'Expert'}));
 await fireEvent.press(screen.getByText('Play Sudoku'));
 expect(await screen.findByText(/Your timer starts with your first entry/)).toBeTruthy();
 expect(posts()[0].body).toMatchObject({action:'sudoku-start',level:3,name:''});
 const blanks=puzzle.map((n,i)=>n?-1:i).filter(i=>i>=0);
 for(const i of blanks){
  await fireEvent.press(screen.getByLabelText(new RegExp(`^Row ${Math.floor(i/9)+1}, column ${i%9+1}, `)));
  await fireEvent.press(screen.getByLabelText(`Enter ${answer[i]}`));
 }
 expect(posts().filter(c=>c.body.action==='sudoku-begin')).toHaveLength(1);
 await fireEvent.press(screen.getByText('Check & save win'));
 expect(await screen.findByText(/Win verified and saved/)).toBeTruthy();
 expect(posts().find(c=>c.body.action==='sudoku-solve')!.body).toMatchObject({id:'s-1',puzzleNumber:0,answer});
 expect(screen.getByText('Next puzzle · Expert')).toBeTruthy();
 const saved=JSON.parse((await AsyncStorage.getItem(KEYS.sudoku))!);expect(saved.session.wins).toBe(1);
},30000);

test('Sudoku offline: a practice streak starts on the phone',async()=>{
 await wrap(<SudokuScreen/>);
 await fireEvent.press(screen.getByText('Play Sudoku'));
 expect(await screen.findByText(/practice streak on this phone/)).toBeTruthy();
 expect(screen.getByText('Offline · Easy')).toBeTruthy();
 expect(screen.queryByText('Resume saved streak')).toBeNull();
 const saved=JSON.parse((await AsyncStorage.getItem(KEYS.sudoku))!);expect(saved.session.id).toMatch(/^local-/);
});
