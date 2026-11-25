import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Audio from 'expo-audio';
import {Text,Pressable} from 'react-native';
import {render,screen,fireEvent,waitFor} from '@testing-library/react-native';
import {renderRouter,screen as routerScreen} from 'expo-router/testing-library';
import {resolveScheme,palettes} from '../src/theme/colors';
import {KEYS,readJson,writeJson,readPlayerToken,writePlayerToken,clearPlayerToken} from '../src/lib/storage';
import {SettingsProvider,useSettings} from '../src/lib/settings';
import {SoundProvider,useSound} from '../src/lib/sounds';
import {games,isGameKey} from '../src/lib/games';
import {initial,remaining} from '@shared/game';
import {solveMarble} from '@shared/marble-solver';
import Home from '../src/app/index';
import Settings from '../src/app/settings';
import Play from '../src/app/play/[game]';
import Layout from '../src/app/_layout';

beforeEach(async()=>{await AsyncStorage.clear();(SecureStore as any).__items.clear();(Audio as any).__players.length=0});

test('theme follows the device unless the player chooses',()=>{
 expect(resolveScheme('system','dark')).toBe('dark');
 expect(resolveScheme('system',null)).toBe('light');
 expect(resolveScheme('light','dark')).toBe('light');
 expect(resolveScheme('dark','light')).toBe('dark');
 expect(palettes.light.background).toBe('#f7f8f2');expect(palettes.dark.background).toBe('#14221e');
});

test('stored JSON falls back safely when missing, corrupt or the wrong shape',async()=>{
 const isList=(v:unknown):v is number[]=>Array.isArray(v)&&v.every(n=>typeof n==='number');
 expect(await readJson(KEYS.history,[],isList)).toEqual([]);
 await writeJson(KEYS.history,[3,2]);expect(await readJson(KEYS.history,[],isList)).toEqual([3,2]);
 await AsyncStorage.setItem(KEYS.history,'{not json');expect(await readJson(KEYS.history,[],isList)).toEqual([]);
 await writeJson(KEYS.history,{a:1});expect(await readJson(KEYS.history,[],isList)).toEqual([]);
 (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(Error('disk'));
 expect(await readJson(KEYS.history,[9],isList)).toEqual([9]);
});

test('player token lives in secure storage and only accepts the server format',async()=>{
 const token=`${'a'.repeat(8)}-aaaa-aaaa-aaaa-${'a'.repeat(12)}.${'b'.repeat(64)}`;
 expect(await readPlayerToken()).toBeNull();
 await writePlayerToken('not a token');expect(await readPlayerToken()).toBeNull();
 await writePlayerToken(token);expect(await readPlayerToken()).toBe(token);
 expect(await AsyncStorage.getAllKeys()).toEqual([]); // never in plain storage
 await clearPlayerToken();expect(await readPlayerToken()).toBeNull();
});

function Probe(){
 const s=useSettings();const play=useSound();
 return <>
  <Text testID="state">{`${s.ready}|${s.soundOn}|${s.theme}|${s.scheme}`}</Text>
  <Pressable testID="mute" onPress={()=>s.setSoundOn(!s.soundOn)}/>
  <Pressable testID="dark" onPress={()=>s.setTheme('dark')}/>
  <Pressable testID="play" onPress={()=>play('marble')}/>
 </>;
}
const renderProbe=()=>render(<SettingsProvider><SoundProvider><Probe/></SoundProvider></SettingsProvider>);

test('settings load, change and are remembered',async()=>{
 await renderProbe();
 await waitFor(()=>expect(screen.getByTestId('state')).toHaveTextContent('true|true|system|light'));
 await fireEvent.press(screen.getByTestId('mute'));await fireEvent.press(screen.getByTestId('dark'));
 expect(screen.getByTestId('state')).toHaveTextContent('true|false|dark|dark');
 await waitFor(async()=>expect(await AsyncStorage.getItem(KEYS.sound)).toBe('off'));
 expect(await AsyncStorage.getItem(KEYS.theme)).toBe('dark');
 await screen.unmount();await renderProbe();
 await waitFor(()=>expect(screen.getByTestId('state')).toHaveTextContent('true|false|dark|dark'));
});

test('sounds respect the silent switch, the mute setting, and overlap quick taps',async()=>{
 await renderProbe();
 await waitFor(()=>expect(screen.getByTestId('state')).toHaveTextContent(/^true\|true\|/));
 expect(Audio.setAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({playsInSilentMode:false,interruptionMode:'mixWithOthers'}));
 const players=(Audio as any).__players as any[];
 expect(players).toHaveLength(6);
 const marble=players.filter(p=>p.volume===0.5);
 await fireEvent.press(screen.getByTestId('play'));await fireEvent.press(screen.getByTestId('play'));
 expect(marble[0].play).toHaveBeenCalledTimes(1);expect(marble[1].play).toHaveBeenCalledTimes(1);
 await fireEvent.press(screen.getByTestId('mute'));
 expect(marble[0].pause).toHaveBeenCalled();
 await fireEvent.press(screen.getByTestId('play'));
 expect(marble[0].play.mock.calls.length+marble[1].play.mock.calls.length).toBe(2);
 await screen.unmount();expect(players.every(p=>p.remove.mock.calls.length===1)).toBe(true);
});

test('shared website game logic works in the app',()=>{
 expect(games.map(g=>g.key)).toEqual(['marble','triangle','diamond','lights','sudoku']);
 expect(isGameKey('lights')).toBe(true);expect(isGameKey('chess')).toBe(false);
 expect(remaining(initial('marble'))).toBe(32);
 expect(solveMarble(initial('triangle'),250000,'triangle').status).toBe('solved');
});

const routes={_layout:Layout,index:Home,settings:Settings,'play/[game]':Play};

test('home lists every game and opens one',async()=>{
 await renderRouter(routes,{initialUrl:'/'});
 expect(await routerScreen.findByText('Lights Out')).toBeTruthy();
 expect(routerScreen.getByText('Sudoku streaks')).toBeTruthy();
 await fireEvent.press(routerScreen.getByLabelText('Lights Out, The classic 5 × 5 challenge'));
 expect(await routerScreen.findByText('Turn every light off.')).toBeTruthy();
 expect(routerScreen).toHavePathname('/play/lights');
});

test('unknown game links return to the home screen',async()=>{
 await renderRouter(routes,{initialUrl:'/play/chess'});
 expect(await routerScreen.findByText('Sudoku streaks')).toBeTruthy();
 expect(routerScreen).toHavePathname('/');
});

test('settings screen changes sound and appearance',async()=>{
 await renderRouter(routes,{initialUrl:'/settings'});
 const sound=await routerScreen.findByLabelText('Sound');
 await fireEvent(sound,'valueChange',false);
 await waitFor(async()=>expect(await AsyncStorage.getItem(KEYS.sound)).toBe('off'));
 await fireEvent.press(routerScreen.getByRole('radio',{name:'Dark'}));
 await waitFor(()=>expect(routerScreen.getByRole('radio',{name:'Dark'})).toBeChecked());
 await waitFor(async()=>expect(await AsyncStorage.getItem(KEYS.theme)).toBe('dark'));

});
