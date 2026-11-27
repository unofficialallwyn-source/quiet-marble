// Colour themes. Sage matches the website; the others pair a colour with ivory.
// Every theme has light and dark versions, chosen by the Appearance setting.
// Text and button colours were checked against WCAG contrast (4.5:1 for body
// text, 7:1 for main text, 3:1 for controls). Game boards look the same in all themes.
export type ColorScheme='light'|'dark';
export type ThemePreference='system'|ColorScheme;

export interface Palette{
 background:string;card:string;ink:string;muted:string;line:string;
 primary:string;onPrimary:string;accent:string;soft:string;softLine:string;highlight:string;
 board:string;boardHole:string;lightsBoard:string;lightsTile:string;lightsLit:string;
}

const boards={
 light:{board:'#cfba89',boardHole:'#ad996d',lightsBoard:'#2d453b',lightsTile:'#3c5948',lightsLit:'#e8d59b'},
 dark:{board:'#b9a77c',boardHole:'#9b8a62',lightsBoard:'#22362d',lightsTile:'#34503f',lightsLit:'#e8d59b'},
};

export const colorThemes={
 sage:{name:'Sage',
  light:{background:'#f7f8f2',card:'#fffefa',ink:'#233d36',muted:'#5f695f',line:'#dde3d8',primary:'#315d4c',onPrimary:'#ffffff',accent:'#b58d53',soft:'#eaf0e3',softLine:'#dce4d3',highlight:'#648163',...boards.light},
  dark:{background:'#14221e',card:'#1d3028',ink:'#e4eee5',muted:'#afc0b1',line:'#40574b',primary:'#42785f',onPrimary:'#ffffff',accent:'#d2ab6e',soft:'#2a4033',softLine:'#57705c',highlight:'#a4c69a',...boards.dark}},
 mint:{name:'Mint & ivory',
  light:{background:'#fbf9f1',card:'#fffefa',ink:'#1d3a33',muted:'#5f6e68',line:'#dce8e1',primary:'#2a7560',onPrimary:'#ffffff',accent:'#b58d53',soft:'#e2f3ea',softLine:'#c6e4d5',highlight:'#3f9479',...boards.light},
  dark:{background:'#0f211c',card:'#163029',ink:'#e4f4ed',muted:'#a4c4b7',line:'#2c4a41',primary:'#2f8268',onPrimary:'#ffffff',accent:'#d9b974',soft:'#1d3c33',softLine:'#3a6255',highlight:'#86d4b6',...boards.dark}},
 lavender:{name:'Lavender & ivory',
  light:{background:'#fbf9f2',card:'#fffefb',ink:'#2d2843',muted:'#6a6580',line:'#e3dfeb',primary:'#5f4fa0',onPrimary:'#ffffff',accent:'#b58d53',soft:'#efebf8',softLine:'#d9d1ef',highlight:'#7a69bd',...boards.light},
  dark:{background:'#191624',card:'#221e31',ink:'#ece9f7',muted:'#b4aecb',line:'#3a3452',primary:'#6f5fb4',onPrimary:'#ffffff',accent:'#d9b974',soft:'#2b2641',softLine:'#4a4270',highlight:'#bdb1ee',...boards.dark}},
 dusky:{name:'Dusky pink & ivory',
  light:{background:'#fcf8f2',card:'#fffdfa',ink:'#3b282e',muted:'#76666a',line:'#eadfdf',primary:'#9a4f62',onPrimary:'#ffffff',accent:'#b58d53',soft:'#f6e7e9',softLine:'#ebd1d6',highlight:'#b8707f',...boards.light},
  dark:{background:'#221a1d',card:'#2d2226',ink:'#f6eaec',muted:'#cbb4b9',line:'#4a363c',primary:'#a35a6c',onPrimary:'#ffffff',accent:'#d9b974',soft:'#39292f',softLine:'#5c4249',highlight:'#e5abb8',...boards.dark}},
 sky:{name:'Sky blue & ivory',
  light:{background:'#fbfaf3',card:'#fffefa',ink:'#1c3145',muted:'#5f6d7a',line:'#dbe5ee',primary:'#2f6ea8',onPrimary:'#ffffff',accent:'#b58d53',soft:'#e5f1fb',softLine:'#c7e0f4',highlight:'#4b8fc8',...boards.light},
  dark:{background:'#101b25',card:'#172533',ink:'#e7f0f8',muted:'#a7bccd',line:'#2d4255',primary:'#3a76ad',onPrimary:'#ffffff',accent:'#d9b974',soft:'#1d3144',softLine:'#36546e',highlight:'#9ccbef',...boards.dark}},
} satisfies Record<string,{name:string;light:Palette;dark:Palette}>;
export type ColorThemeId=keyof typeof colorThemes;
export const DEFAULT_COLOR_THEME:ColorThemeId='sage';
export const isColorTheme=(value:unknown):value is ColorThemeId=>typeof value==='string'&&value in colorThemes;
/** The default (Sage) palettes. */
export const palettes=colorThemes.sage;

export const fonts={
 body:'DMSans_400Regular',medium:'DMSans_500Medium',bold:'DMSans_700Bold',display:'LibreCaslonDisplay_400Regular',
};

/** The colour scheme to show: the player's choice, or the device setting. */
export function resolveScheme(preference:ThemePreference,device:ColorScheme|null|undefined):ColorScheme{
 if(preference!=='system')return preference;
 return device==='dark'?'dark':'light';
}
