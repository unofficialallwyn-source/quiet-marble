import AsyncStorage from '@react-native-async-storage/async-storage';
import {Text} from 'react-native';
import {render,screen,fireEvent,waitFor} from '@testing-library/react-native';
import {colorThemes,isColorTheme,type Palette} from '../src/theme/colors';
import {SettingsProvider,useSettings} from '../src/lib/settings';
import {SoundProvider} from '../src/lib/sounds';
import {KEYS} from '../src/lib/storage';
import Settings from '../src/app/settings';

// WCAG relative luminance and contrast ratio.
const lum=(hex:string)=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4);return 0.2126*r+0.7152*g+0.0722*b};
const contrast=(a:string,b:string)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05)};

test('every theme has complete light and dark palettes, including the game boards',()=>{
 expect(Object.keys(colorThemes)).toEqual(['sage','mint','lavender','dusky','sky']);
 const keys=Object.keys(colorThemes.sage.light).sort();
 for(const theme of Object.values(colorThemes))for(const p of [theme.light,theme.dark]){
  expect(Object.keys(p).sort()).toEqual(keys);
  for(const value of Object.values(p))expect(value).toMatch(/^#[0-9a-f]{6}$/);
 }
 expect(colorThemes.mint.light.background).not.toBe(colorThemes.mint.dark.background);
 // Boards differ between themes (not one shared wood board).
 expect(new Set(Object.values(colorThemes).map(t=>t.light.board)).size).toBe(5);
 expect(new Set(Object.values(colorThemes).map(t=>t.light.marble)).size).toBe(5);
 expect(isColorTheme('lavender')).toBe(true);expect(isColorTheme('neon')).toBe(false);
});

test.each(Object.entries(colorThemes).flatMap(([id,t])=>[[id,'light',t.light],[id,'dark',t.dark]] as [string,string,Palette][]))(
 '%s (%s) keeps text readable',(_id,_scheme,p)=>{
  expect(contrast(p.ink,p.background)).toBeGreaterThanOrEqual(7);
  expect(contrast(p.ink,p.card)).toBeGreaterThanOrEqual(7);
  expect(contrast(p.ink,p.soft)).toBeGreaterThanOrEqual(7);
  for(const bg of [p.background,p.card,p.soft])expect(contrast(p.muted,bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.onPrimary,p.primary)).toBeGreaterThanOrEqual(4.5); // button text
  expect(contrast(p.primary,p.background)).toBeGreaterThanOrEqual(3);  // switches, tabs
  expect(contrast(p.highlight,p.card)).toBeGreaterThanOrEqual(3);      // game icons and Sudoku box lines
  // Game surfaces
  expect(contrast(p.sudokuEntry,p.card)).toBeGreaterThanOrEqual(4.5);  // your Sudoku numbers
  expect(contrast(p.sudokuEntry,p.soft)).toBeGreaterThanOrEqual(4.5);  // ...in the selected cell
  expect(contrast(p.marble,p.board)).toBeGreaterThanOrEqual(2.5);      // marbles stand out (plus an outline)
  expect(contrast(p.lightsLit,p.lightsTile)).toBeGreaterThanOrEqual(3); // lit vs unlit tiles
  expect(contrast(p.lightsSpark,p.lightsLit)).toBeGreaterThanOrEqual(3);
 });

function Probe(){const s=useSettings();return <Text testID="probe">{`${s.colorTheme}|${s.colors.background}`}</Text>}
beforeEach(async()=>{await AsyncStorage.clear()});

test('choosing a colour theme in Settings applies it and is remembered',async()=>{
 const ui=()=><SettingsProvider><SoundProvider><Probe/><Settings/></SoundProvider></SettingsProvider>;
 await render(ui());
 await waitFor(()=>expect(screen.getByTestId('probe')).toHaveTextContent(`sage|${colorThemes.sage.light.background}`));
 expect(screen.getByRole('radio',{name:'Sage'})).toBeChecked();
 await fireEvent.press(screen.getByRole('radio',{name:'Lavender & ivory'}));
 expect(screen.getByTestId('probe')).toHaveTextContent(`lavender|${colorThemes.lavender.light.background}`);
 expect(screen.getByRole('radio',{name:'Lavender & ivory'})).toBeChecked();
 await waitFor(async()=>expect(await AsyncStorage.getItem(KEYS.colorTheme)).toBe('lavender'));
 await fireEvent.press(screen.getByRole('radio',{name:'Dark'}));
 expect(screen.getByTestId('probe')).toHaveTextContent(`lavender|${colorThemes.lavender.dark.background}`);
 await screen.unmount();await render(ui());
 await waitFor(()=>expect(screen.getByTestId('probe')).toHaveTextContent(`lavender|${colorThemes.lavender.dark.background}`));
});

test('an unknown saved theme falls back to Sage',async()=>{
 await AsyncStorage.setItem(KEYS.colorTheme,'neon');
 await render(<SettingsProvider><Probe/></SettingsProvider>);
 await waitFor(()=>expect(screen.getByTestId('probe')).toHaveTextContent(/^sage\|/));
});

test('game boards draw with the chosen theme',async()=>{
 const {MarbleBoard,LightsBoard}=require('../src/components/boards');
 const {initial}=require('@shared/game');
 await AsyncStorage.setItem(KEYS.colorTheme,'lavender');
 await render(<SettingsProvider><Probe/>
  <MarbleBoard game="marble" board={initial('marble')} selected={-1} targets={[]} hintTarget={-1} disabled={false} onTap={()=>{}}/>
  <LightsBoard board={initial('lights')} hint={-1} disabled={false} onTap={()=>{}}/>
 </SettingsProvider>);
 await waitFor(()=>expect(screen.getByTestId('probe')).toHaveTextContent(/^lavender\|/));
 const flat=(el:any)=>Object.assign({},...[el.props.style].flat(Infinity).filter(Boolean));
 const p=colorThemes.lavender.light;
 expect(flat(screen.getByLabelText('English solitaire board')).backgroundColor).toBe(p.board);
 expect(flat(screen.getByLabelText('Lights Out board')).backgroundColor).toBe(p.lightsBoard);
 const lit=screen.getAllByLabelText(/^Tile row \d, column \d, on/)[0];
 expect(flat(lit).backgroundColor).toBe(p.lightsLit);
});
