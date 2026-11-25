import Constants,{ExecutionEnvironment} from 'expo-constants';
export type Ads=typeof import('react-native-google-mobile-ads');
/** The AdMob native module, or null where it isn't available (Expo Go). */
export function loadAds():Ads|null{
 if(Constants.executionEnvironment===ExecutionEnvironment.StoreClient)return null;
 // Loaded lazily so Expo Go never touches the missing native module.
 // eslint-disable-next-line @typescript-eslint/no-require-imports
 try{return require('react-native-google-mobile-ads') as Ads}catch{return null}
}
