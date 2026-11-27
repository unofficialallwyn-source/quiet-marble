import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Everything the app remembers on the device. Keys match the website's
// localStorage names where the meaning is the same.
export const KEYS={
 sound:'qm-sound',            // 'on' | 'off'
 theme:'qm-theme',            // 'system' | 'light' | 'dark'
 colorTheme:'qm-color-theme', // 'sage' | 'mint' | 'lavender' | 'dusky' | 'sky'
 name:'qm-name',              // optional nickname
 history:'qm-history',        // personal results (JSON array, newest first)
 hintExplained:'qm-hint-explained',
 sudoku:'qm-sudoku',          // current Sudoku streak and entries, to resume
} as const;
export type StorageKey=typeof KEYS[keyof typeof KEYS];

/** Reads a string; returns null if missing or if storage is unavailable. */
export async function readText(key:StorageKey):Promise<string|null>{
 try{return await AsyncStorage.getItem(key)}catch{return null}
}
/** Saves a string. Storage failures never interrupt play. */
export async function writeText(key:StorageKey,value:string):Promise<void>{
 try{await AsyncStorage.setItem(key,value)}catch{}
}
export async function readJson<T>(key:StorageKey,fallback:T,valid:(value:unknown)=>value is T):Promise<T>{
 const text=await readText(key);
 if(text==null)return fallback;
 try{const value:unknown=JSON.parse(text);return valid(value)?value:fallback}catch{return fallback}
}
export async function writeJson(key:StorageKey,value:unknown):Promise<void>{
 await writeText(key,JSON.stringify(value));
}
export async function remove(key:StorageKey):Promise<void>{
 try{await AsyncStorage.removeItem(key)}catch{}
}

// The signed leaderboard identity from the server. It is kept in the device's
// secure storage (Keychain / Keystore), never in plain storage.
const PLAYER_TOKEN='qm-player-token';
const TOKEN_PATTERN=/^[a-f0-9-]{36}\.[a-f0-9]{64}$/;
export async function readPlayerToken():Promise<string|null>{
 try{const token=await SecureStore.getItemAsync(PLAYER_TOKEN);return token&&TOKEN_PATTERN.test(token)?token:null}catch{return null}
}
export async function writePlayerToken(token:string):Promise<void>{
 if(!TOKEN_PATTERN.test(token))return;
 try{await SecureStore.setItemAsync(PLAYER_TOKEN,token)}catch{}
}
export async function clearPlayerToken():Promise<void>{
 try{await SecureStore.deleteItemAsync(PLAYER_TOKEN)}catch{}
}
