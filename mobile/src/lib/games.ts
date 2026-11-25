import {marbleVariants,type Game,type MarbleVariant} from '@shared/game';

// Every game the app offers, in menu order. Keys match the website's ?game= links.
export type GameKey=Game|'sudoku';
export interface GameInfo{key:GameKey;title:string;subtitle:string;objective:string;rules:string}

const marble=(key:MarbleVariant):GameInfo=>({
 key,title:`Marble Solitaire · ${marbleVariants[key].name}`,subtitle:`${marbleVariants[key].holes} holes`,
 objective:'Leave just one marble.',rules:`${marbleVariants[key].rules} Finish with one marble anywhere.`,
});
export const games:GameInfo[]=[
 marble('marble'),marble('triangle'),marble('diamond'),
 {key:'lights',title:'Lights Out',subtitle:'The classic 5 × 5 challenge',objective:'Turn every light off.',
  rules:'Tap a tile to toggle it and its horizontal and vertical neighbours. Find the switches that leave a dark board.'},
 {key:'sudoku',title:'Sudoku streaks',subtitle:'Easy to Expert',objective:'Win as many puzzles in a row as you can.',
  rules:'Use 1–9 once per row, column and box. Each win moves you up a level; at Expert, keep winning to extend your streak.'},
];
export const isGameKey=(value:unknown):value is GameKey=>games.some(g=>g.key===value);
export const gameInfo=(key:GameKey)=>games.find(g=>g.key===key)!;
