import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react';
import {Platform,View} from 'react-native';
import Constants,{ExecutionEnvironment} from 'expo-constants';
import {Label} from '../components/ui';

// Google AdMob, set up for an all-ages audience:
// - every request is tagged child-directed and under the age of consent,
// - ad content is capped at G (general audiences),
// - only non-personalised ads are requested, and there is no tracking prompt.
// Ads need the native module, so they are off in Expo Go, on the web and in tests.
type Ads=typeof import('react-native-google-mobile-ads');
function loadAds():Ads|null{
 if(Platform.OS==='web'||Constants.executionEnvironment===ExecutionEnvironment.StoreClient)return null;
 // Loaded lazily so Expo Go and the web never touch the missing native module.
 // eslint-disable-next-line @typescript-eslint/no-require-imports
 try{return require('react-native-google-mobile-ads') as Ads}catch{return null}
}

export const CHILD_SAFE={tagForChildDirectedTreatment:true,tagForUnderAgeOfConsent:true} as const;

/** Banner unit for this platform from app.json (extra.admob); Google's test unit until real IDs are added. */
export function bannerUnitId(ads:Ads){
 const ids=(Constants.expoConfig?.extra as {admob?:{iosBannerId?:string|null;androidBannerId?:string|null}}|undefined)?.admob;
 const real=Platform.OS==='ios'?ids?.iosBannerId:ids?.androidBannerId;
 return __DEV__||!real?ads.TestIds.ADAPTIVE_BANNER:real;
}

interface AdsState{ready:boolean;privacyOptionsRequired:boolean;showPrivacyOptions():Promise<void>}
const AdsContext=createContext<AdsState>({ready:false,privacyOptionsRequired:false,showPrivacyOptions:async()=>{}});

export function AdsProvider({children,module:injected}:{children:ReactNode;module?:Ads|null}){
 const [ads]=useState(()=>injected===undefined?loadAds():injected);
 const [ready,setReady]=useState(false);
 const [privacyOptionsRequired,setPrivacyOptionsRequired]=useState(false);
 useEffect(()=>{
  if(!ads)return;
  let live=true;
  (async()=>{
   // Settings first, then Google's consent message (shown only where the law requires it).
   await ads.default().setRequestConfiguration({...CHILD_SAFE,maxAdContentRating:ads.MaxAdContentRating.G});
   const info=await ads.AdsConsent.gatherConsent({tagForUnderAgeOfConsent:true});
   if(!live)return;
   setPrivacyOptionsRequired(info.privacyOptionsRequirementStatus===ads.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED);
   if(!info.canRequestAds)return;
   await ads.default().initialize();
   if(live)setReady(true);
  })().catch(()=>{}); // No ads is always an acceptable outcome.
  return()=>{live=false};
 },[ads]);
 const showPrivacyOptions=useCallback(async()=>{
  if(!ads)return;
  try{
   const info=await ads.AdsConsent.showPrivacyOptionsForm();
   if(info.canRequestAds&&!ready){await ads.default().initialize();setReady(true)}
  }catch{}
 },[ads,ready]);
 return <AdsContext.Provider value={{ready:ready&&!!ads,privacyOptionsRequired,showPrivacyOptions}}>
  <AdsModule.Provider value={ads}>{children}</AdsModule.Provider>
 </AdsContext.Provider>;
}
const AdsModule=createContext<Ads|null>(null);
export const useAds=()=>useContext(AdsContext);

/** One banner, placed below a game's board and controls. Hidden if no ad loads. */
export function AdBanner(){
 const {ready}=useAds();const ads=useContext(AdsModule);
 const [failed,setFailed]=useState(false);
 if(!ready||!ads||failed)return null;
 const {BannerAd,BannerAdSize}=ads;
 return <View style={{alignItems:'center',gap:4,marginTop:8}} accessibilityLabel="Advertisement">
  <Label variant="eyebrow" style={{fontSize:9}}>ADVERTISEMENT</Label>
  <BannerAd unitId={bannerUnitId(ads)} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
   requestOptions={{requestNonPersonalizedAdsOnly:true}} onAdFailedToLoad={()=>setFailed(true)}/>
 </View>;
}
