
import {useEffect,useRef,useState} from 'react';

type Sound='switch-on'|'switch-off'|'marble';
const sounds:Sound[]=['switch-on','switch-off','marble'];

// Small local samples are preloaded. Playback is requested only from a user gesture.
export function useGameSounds(){
  const [enabled,setEnabled]=useState(true);
  const players=useRef<Partial<Record<Sound,HTMLAudioElement[]>>>({});
  const cursor=useRef(0);
  useEffect(()=>{
    try{setEnabled(localStorage.getItem('qm-sound')!=='off');}catch{}
    for(const sound of sounds){
      players.current[sound]=Array.from({length:3},()=>{
        const audio=new Audio(`/sounds/${sound}.wav`);
        audio.preload='auto';
        audio.volume=sound==='marble'?0.5:0.4;
        audio.load();
        return audio;
      });
    }
    return()=>{for(const pool of Object.values(players.current))for(const audio of pool){audio.pause();audio.removeAttribute('src');audio.load();}players.current={};};
  },[]);
  function play(sound:Sound){
    if(!enabled)return;
    const pool=players.current[sound];
    if(!pool)return;
    const audio=pool[cursor.current++%pool.length];
    audio.currentTime=0;
    // A blocked audio device or autoplay policy must never interrupt a move.
    void audio.play().catch(()=>{});
  }
  function toggle(){
    const next=!enabled;
    setEnabled(next);
    try{localStorage.setItem('qm-sound',next?'on':'off');}catch{}
    if(!next)for(const pool of Object.values(players.current))for(const audio of pool)audio.pause();
  }
  return {enabled,toggle,play};
}
