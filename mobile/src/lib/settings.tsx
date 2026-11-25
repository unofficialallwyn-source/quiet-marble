import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {useColorScheme} from 'react-native';
import {KEYS,readText,writeText} from './storage';
import {palettes,resolveScheme,type ColorScheme,type Palette,type ThemePreference} from '../theme/colors';

interface Settings{
 /** False until saved settings have been read, to avoid a flash of the wrong theme. */
 ready:boolean;
 soundOn:boolean;setSoundOn(on:boolean):void;
 theme:ThemePreference;setTheme(theme:ThemePreference):void;
 scheme:ColorScheme;colors:Palette;
}
const SettingsContext=createContext<Settings|null>(null);
const isTheme=(value:unknown):value is ThemePreference=>value==='system'||value==='light'||value==='dark';

export function SettingsProvider({children}:{children:ReactNode}){
 const device=useColorScheme();
 const [ready,setReady]=useState(false);
 const [soundOn,setSound]=useState(true);
 const [theme,setThemeState]=useState<ThemePreference>('system');
 useEffect(()=>{
  let live=true;
  Promise.all([readText(KEYS.sound),readText(KEYS.theme)]).then(([sound,savedTheme])=>{
   if(!live)return;
   setSound(sound!=='off');
   if(isTheme(savedTheme))setThemeState(savedTheme);
   setReady(true);
  });
  return()=>{live=false};
 },[]);
 const setSoundOn=useCallback((on:boolean)=>{setSound(on);void writeText(KEYS.sound,on?'on':'off')},[]);
 const setTheme=useCallback((next:ThemePreference)=>{setThemeState(next);void writeText(KEYS.theme,next)},[]);
 const scheme=resolveScheme(theme,device);
 const value=useMemo(()=>({ready,soundOn,setSoundOn,theme,setTheme,scheme,colors:palettes[scheme]}),[ready,soundOn,setSoundOn,theme,setTheme,scheme]);
 return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(){
 const settings=useContext(SettingsContext);
 if(!settings)throw Error('useSettings must be used inside SettingsProvider');
 return settings;
}
export const useColors=()=>useSettings().colors;
