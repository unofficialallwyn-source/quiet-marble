import {createContext,useCallback,useContext,useEffect,useRef,type ReactNode} from 'react';
import {Platform} from 'react-native';
import {createAudioPlayer,setAudioModeAsync,type AudioPlayer} from 'expo-audio';
import {useSettings} from './settings';

// The same CC0 samples as the website (see assets/sounds/CREDITS.md).
export type Sound='switch-on'|'switch-off'|'marble';
const sources:Record<Sound,number>={
 'switch-on':require('../../assets/sounds/switch-on.wav'),
 'switch-off':require('../../assets/sounds/switch-off.wav'),
 marble:require('../../assets/sounds/marble.wav'),
};
const volumes:Record<Sound,number>={'switch-on':0.4,'switch-off':0.4,marble:0.5};
/** Whether sounds play while the phone is silent: on Android yes (media volume controls them). */
export const SILENT_MODE_PLAYS=Platform.OS==='android';
const POOL=2; // Two players per sound so quick taps can overlap.

type Play=(sound:Sound)=>void;
const SoundContext=createContext<Play>(()=>{});

export function SoundProvider({children}:{children:ReactNode}){
 const {soundOn}=useSettings();
 const players=useRef<Partial<Record<Sound,AudioPlayer[]>>>({});
 const cursor=useRef(0);
 useEffect(()=>{
  // Game effects never pause the player's music. On iPhone they respect the silent
  // switch. On Android, playsInSilentMode:false would also mute them whenever the
  // phone is on vibrate, so they follow the media volume like other Android games.
  void setAudioModeAsync({playsInSilentMode:SILENT_MODE_PLAYS,interruptionMode:'mixWithOthers',shouldPlayInBackground:false}).catch(()=>{});
  for(const sound of Object.keys(sources) as Sound[]){
   players.current[sound]=Array.from({length:POOL},()=>{
    const player=createAudioPlayer(sources[sound]);
    player.volume=volumes[sound];
    return player;
   });
  }
  return()=>{
   for(const pool of Object.values(players.current))for(const player of pool??[])player.remove();
   players.current={};
  };
 },[]);
 useEffect(()=>{
  if(!soundOn)for(const pool of Object.values(players.current))for(const player of pool??[])player.pause();
 },[soundOn]);
 const play=useCallback<Play>(sound=>{
  if(!soundOn)return;
  const pool=players.current[sound];
  if(!pool?.length)return;
  const player=pool[cursor.current++%pool.length];
  // A sound problem must never interrupt a move.
  try{void player.seekTo(0).catch(()=>{});player.play()}catch{}
 },[soundOn]);
 return <SoundContext.Provider value={play}>{children}</SoundContext.Provider>;
}

/** Returns play(sound). Does nothing while sound is off. */
export const useSound=()=>useContext(SoundContext);
