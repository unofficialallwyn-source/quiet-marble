// Colour themes. Sage matches the website; the others pair a colour with ivory.
// Every theme has light and dark versions, chosen by the Appearance setting.
// Text and button colours were checked against WCAG contrast (4.5:1 for body
// text, 7:1 for main text, 3:1 for controls). Game boards, marbles, Lights Out tiles
// and Sudoku entries follow the theme too.
export type ColorScheme='light'|'dark';
export type ThemePreference='system'|ColorScheme;

export interface Palette{
 background:string;card:string;ink:string;muted:string;line:string;
 primary:string;onPrimary:string;accent:string;soft:string;softLine:string;highlight:string;
 // Game surfaces: Marble Solitaire board and marbles, Lights Out panel, Sudoku entries.
 board:string;boardEdge:string;boardHole:string;marble:string;marbleEdge:string;marbleShine:string;
 lightsBoard:string;lightsTile:string;lightsTileBorder:string;lightsLit:string;lightsLitBorder:string;lightsSpark:string;
 sudokuEntry:string;
}

export const colorThemes={
 sage:{name:'Sage',
  light:{background:'#f7f8f2',card:'#fffefa',ink:'#233d36',muted:'#5f695f',line:'#dde3d8',primary:'#315d4c',onPrimary:'#ffffff',accent:'#b58d53',soft:'#eaf0e3',softLine:'#dce4d3',highlight:'#648163',
   board:'#cfba89',boardEdge:'#e9dbb8',boardHole:'#ad996d',marble:'#4c7957',marbleEdge:'#294c33',marbleShine:'#c8e3be',lightsBoard:'#2d453b',lightsTile:'#3c5948',lightsTileBorder:'#587261',lightsLit:'#e8d59b',lightsLitBorder:'#f6eac6',lightsSpark:'#7d6a2e',sudokuEntry:'#2f5f96'},
  dark:{background:'#14221e',card:'#1d3028',ink:'#e4eee5',muted:'#afc0b1',line:'#40574b',primary:'#42785f',onPrimary:'#ffffff',accent:'#d2ab6e',soft:'#2a4033',softLine:'#57705c',highlight:'#a4c69a',
   board:'#b9a77c',boardEdge:'#d4c49b',boardHole:'#9b8a62',marble:'#3a6346',marbleEdge:'#24432d',marbleShine:'#c8e3be',lightsBoard:'#22362d',lightsTile:'#34503f',lightsTileBorder:'#4b6655',lightsLit:'#e8d59b',lightsLitBorder:'#f6eac6',lightsSpark:'#7d6a2e',sudokuEntry:'#9cc2ee'}},
 mint:{name:'Mint & ivory',
  light:{background:'#fbf9f1',card:'#fffefa',ink:'#1d3a33',muted:'#5f6e68',line:'#dce8e1',primary:'#2a7560',onPrimary:'#ffffff',accent:'#b58d53',soft:'#e2f3ea',softLine:'#c6e4d5',highlight:'#3f9479',
   board:'#cfe8dc',boardEdge:'#e6f4ec',boardHole:'#a9cdbd',marble:'#2a7560',marbleEdge:'#1c5545',marbleShine:'#bfe8d6',lightsBoard:'#1f4d40',lightsTile:'#2e6655',lightsTileBorder:'#3f7d6a',lightsLit:'#f3e7b8',lightsLitBorder:'#fbf4dc',lightsSpark:'#7d6a2e',sudokuEntry:'#226650'},
  dark:{background:'#0f211c',card:'#163029',ink:'#e4f4ed',muted:'#a4c4b7',line:'#2c4a41',primary:'#2f8268',onPrimary:'#ffffff',accent:'#d9b974',soft:'#1d3c33',softLine:'#3a6255',highlight:'#86d4b6',
   board:'#2b5a4c',boardEdge:'#3d7364',boardHole:'#1e4438',marble:'#4fae8e',marbleEdge:'#2b7a62',marbleShine:'#c3f0dc',lightsBoard:'#123a30',lightsTile:'#1f4f42',lightsTileBorder:'#2f6656',lightsLit:'#e9dca6',lightsLitBorder:'#f5ecc8',lightsSpark:'#6f6026',sudokuEntry:'#86d4b6'}},
 lavender:{name:'Lavender & ivory',
  light:{background:'#fbf9f2',card:'#fffefb',ink:'#2d2843',muted:'#6a6580',line:'#e3dfeb',primary:'#5f4fa0',onPrimary:'#ffffff',accent:'#b58d53',soft:'#efebf8',softLine:'#d9d1ef',highlight:'#7a69bd',
   board:'#ddd5ef',boardEdge:'#efeaf8',boardHole:'#b9aed8',marble:'#5f4fa0',marbleEdge:'#463a7c',marbleShine:'#d8cff5',lightsBoard:'#3a3163',lightsTile:'#4b4179',lightsTileBorder:'#5e5490',lightsLit:'#f1e6bf',lightsLitBorder:'#fbf4dc',lightsSpark:'#7d6a2e',sudokuEntry:'#5646a0'},
  dark:{background:'#191624',card:'#221e31',ink:'#ece9f7',muted:'#b4aecb',line:'#3a3452',primary:'#6f5fb4',onPrimary:'#ffffff',accent:'#d9b974',soft:'#2b2641',softLine:'#4a4270',highlight:'#bdb1ee',
   board:'#3d3560',boardEdge:'#544a7e',boardHole:'#2a2446',marble:'#9a8bdc',marbleEdge:'#6a5bb0',marbleShine:'#e2dbff',lightsBoard:'#221d3a',lightsTile:'#322a52',lightsTileBorder:'#463c6c',lightsLit:'#e9dca6',lightsLitBorder:'#f5ecc8',lightsSpark:'#6f6026',sudokuEntry:'#c3b8f2'}},
 dusky:{name:'Dusky pink & ivory',
  light:{background:'#fcf8f2',card:'#fffdfa',ink:'#3b282e',muted:'#76666a',line:'#eadfdf',primary:'#9a4f62',onPrimary:'#ffffff',accent:'#b58d53',soft:'#f6e7e9',softLine:'#ebd1d6',highlight:'#b8707f',
   board:'#ecd3d6',boardEdge:'#f6e7e9',boardHole:'#cfa9b0',marble:'#9a4f62',marbleEdge:'#753a49',marbleShine:'#f2cfd7',lightsBoard:'#5a2f3b',lightsTile:'#6e3d4a',lightsTileBorder:'#84505e',lightsLit:'#f3e4c2',lightsLitBorder:'#fbf3e0',lightsSpark:'#7d6a2e',sudokuEntry:'#8f4457'},
  dark:{background:'#221a1d',card:'#2d2226',ink:'#f6eaec',muted:'#cbb4b9',line:'#4a363c',primary:'#a35a6c',onPrimary:'#ffffff',accent:'#d9b974',soft:'#39292f',softLine:'#5c4249',highlight:'#e5abb8',
   board:'#4e353c',boardEdge:'#664750',boardHole:'#36242a',marble:'#c98393',marbleEdge:'#9a5a6a',marbleShine:'#ffd9e2',lightsBoard:'#331f25',lightsTile:'#462c34',lightsTileBorder:'#5c3c45',lightsLit:'#e9dca6',lightsLitBorder:'#f5ecc8',lightsSpark:'#6f6026',sudokuEntry:'#eab3c0'}},
 sky:{name:'Sky blue & ivory',
  light:{background:'#fbfaf3',card:'#fffefa',ink:'#1c3145',muted:'#5f6d7a',line:'#dbe5ee',primary:'#2f6ea8',onPrimary:'#ffffff',accent:'#b58d53',soft:'#e5f1fb',softLine:'#c7e0f4',highlight:'#4b8fc8',
   board:'#cfe3f3',boardEdge:'#e5f1fb',boardHole:'#a6c6e0',marble:'#2f6ea8',marbleEdge:'#22507b',marbleShine:'#cfe6fa',lightsBoard:'#1f3f5e',lightsTile:'#2c5274',lightsTileBorder:'#3d6689',lightsLit:'#f3e7b8',lightsLitBorder:'#fbf4dc',lightsSpark:'#7d6a2e',sudokuEntry:'#285f93'},
  dark:{background:'#101b25',card:'#172533',ink:'#e7f0f8',muted:'#a7bccd',line:'#2d4255',primary:'#3a76ad',onPrimary:'#ffffff',accent:'#d9b974',soft:'#1d3144',softLine:'#36546e',highlight:'#9ccbef',
   board:'#294660',boardEdge:'#3a5c7a',boardHole:'#1a3045',marble:'#6aa6dc',marbleEdge:'#3f7ab0',marbleShine:'#d6ecff',lightsBoard:'#132a3d',lightsTile:'#1e3a52',lightsTileBorder:'#2d4f6b',lightsLit:'#e9dca6',lightsLitBorder:'#f5ecc8',lightsSpark:'#6f6026',sudokuEntry:'#9ccbef'}},
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
