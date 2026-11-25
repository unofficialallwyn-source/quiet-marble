// Colours match the website (src/styles.css) so the app and site feel the same.
export type ColorScheme='light'|'dark';
export type ThemePreference='system'|ColorScheme;

export interface Palette{
 background:string;card:string;ink:string;muted:string;line:string;
 green:string;onGreen:string;accent:string;soft:string;softLine:string;highlight:string;
 board:string;boardHole:string;lightsBoard:string;lightsTile:string;lightsLit:string;
}

export const palettes:Record<ColorScheme,Palette>={
 light:{
  background:'#f7f8f2',card:'#fffefa',ink:'#233d36',muted:'#6b756d',line:'#dde3d8',
  green:'#315d4c',onGreen:'#ffffff',accent:'#b58d53',soft:'#eaf0e3',softLine:'#dce4d3',highlight:'#648163',
  board:'#cfba89',boardHole:'#ad996d',lightsBoard:'#2d453b',lightsTile:'#3c5948',lightsLit:'#e8d59b',
 },
 dark:{
  background:'#14221e',card:'#1d3028',ink:'#e4eee5',muted:'#afc0b1',line:'#40574b',
  green:'#42785f',onGreen:'#ffffff',accent:'#d2ab6e',soft:'#2a4033',softLine:'#57705c',highlight:'#a4c69a',
  board:'#b9a77c',boardHole:'#9b8a62',lightsBoard:'#22362d',lightsTile:'#34503f',lightsLit:'#e8d59b',
 },
};

export const fonts={
 body:'DMSans_400Regular',medium:'DMSans_500Medium',bold:'DMSans_700Bold',display:'LibreCaslonDisplay_400Regular',
};

/** The colour scheme to show: the player's choice, or the device setting. */
export function resolveScheme(preference:ThemePreference,device:ColorScheme|null|undefined):ColorScheme{
 if(preference!=='system')return preference;
 return device==='dark'?'dark':'light';
}
