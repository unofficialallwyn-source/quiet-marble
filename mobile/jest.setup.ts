// Device features replaced with in-memory fakes for tests.
jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-secure-store',()=>{
 const items=new Map<string,string>();
 return {
  __items:items,
  getItemAsync:jest.fn(async(key:string)=>items.get(key)??null),
  setItemAsync:jest.fn(async(key:string,value:string)=>{items.set(key,value)}),
  deleteItemAsync:jest.fn(async(key:string)=>{items.delete(key)}),
 };
});
jest.mock('expo-audio',()=>{
 const players:any[]=[];
 return {
  __players:players,
  setAudioModeAsync:jest.fn(async()=>{}),
  createAudioPlayer:jest.fn((source:unknown)=>{
   const player={source,volume:1,play:jest.fn(),pause:jest.fn(),remove:jest.fn(),seekTo:jest.fn(async()=>{})};
   players.push(player);return player;
  }),
 };
});
jest.mock('expo-font',()=>({...jest.requireActual('expo-font'),useFonts:()=>[true,null]}));
