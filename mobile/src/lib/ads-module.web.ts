import type {Ads} from './ads-module';
/** No ads on the web: the AdMob module is native-only. */
export function loadAds():Ads|null{return null}
