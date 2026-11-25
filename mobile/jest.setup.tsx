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
jest.mock('react-native-safe-area-context',()=>require('react-native-safe-area-context/jest/mock').default);
jest.mock('react-native-google-mobile-ads',()=>{
 const calls:any[]=[];
 const mobileAds={setRequestConfiguration:jest.fn(async(c:unknown)=>{calls.push(['config',c])}),initialize:jest.fn(async()=>{calls.push(['init']);return []})};
 const {View}=require('react-native');
 return {
  __esModule:true,__calls:calls,
  __consent:{canRequestAds:true,privacyOptionsRequirementStatus:'NOT_REQUIRED'},
  default:()=>mobileAds,
  MaxAdContentRating:{G:'G',PG:'PG',T:'T',MA:'MA'},
  AdsConsentPrivacyOptionsRequirementStatus:{REQUIRED:'REQUIRED',NOT_REQUIRED:'NOT_REQUIRED',UNKNOWN:'UNKNOWN'},
  AdsConsent:{
   gatherConsent:jest.fn(async function(this:any,o:unknown){calls.push(['consent',o]);return require('react-native-google-mobile-ads').__consent}),
   showPrivacyOptionsForm:jest.fn(async()=>({canRequestAds:true,privacyOptionsRequirementStatus:'REQUIRED'})),
  },
  TestIds:{ADAPTIVE_BANNER:'test-adaptive-banner',BANNER:'test-banner'},
  BannerAdSize:{ANCHORED_ADAPTIVE_BANNER:'ANCHORED_ADAPTIVE_BANNER'},
  BannerAd:(props:any)=>{calls.push(['banner',props]);return <View testID="banner-ad"/>},
 };
});
