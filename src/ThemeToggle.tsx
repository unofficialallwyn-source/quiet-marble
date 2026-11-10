import {useEffect,useState} from 'react';
type Theme='light'|'dark';
export function ThemeToggle(){
 const [theme,setTheme]=useState<Theme>(()=>document.documentElement.dataset.theme==='dark'?'dark':'light');
 const [manual,setManual]=useState(()=>{try{return ['light','dark'].includes(localStorage.getItem('qm-theme')||'')}catch{return false}});
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme},[theme]);
 useEffect(()=>{
  if(manual||!window.matchMedia)return;
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  const follow=()=>setTheme(media.matches?'dark':'light');follow();
  media.addEventListener('change',follow);return()=>media.removeEventListener('change',follow);
 },[manual]);
 function toggle(){const next=theme==='dark'?'light':'dark';setManual(true);setTheme(next);try{localStorage.setItem('qm-theme',next)}catch{}}
 return <button type="button" className="theme-toggle" aria-label="Dark mode" aria-pressed={theme==='dark'} title={`Switch to ${theme==='dark'?'light':'dark'} mode`} onClick={toggle}><span aria-hidden="true">{theme==='dark'?'☾':'☀'}</span> {theme==='dark'?'Dark':'Light'}</button>;
}
