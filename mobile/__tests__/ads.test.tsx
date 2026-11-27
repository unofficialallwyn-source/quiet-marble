import {render,screen,waitFor,fireEvent} from '@testing-library/react-native';
import * as Ads from 'react-native-google-mobile-ads';
import {Text} from 'react-native';
import {AdsProvider,AdBanner,useAds,bannerUnitId} from '../src/lib/ads';
import {SettingsProvider} from '../src/lib/settings';
import {SoundProvider} from '../src/lib/sounds';
import {BoardGameScreen} from '../src/games/BoardGameScreen';
import {SudokuScreen} from '../src/games/SudokuScreen';
import Settings from '../src/app/settings';
const fake=Ads as any;
const calls=()=>fake.__calls as any[];
beforeEach(()=>{calls().length=0;fake.__consent={canRequestAds:true,privacyOptionsRequirementStatus:'NOT_REQUIRED'};globalThis.fetch=jest.fn(async()=>{throw TypeError('offline')}) as any});

const wrap=(ui:React.ReactElement,module:any=Ads)=>render(<SettingsProvider><SoundProvider><AdsProvider module={module}>{ui}</AdsProvider></SoundProvider></SettingsProvider>);

test('child-safe settings and consent come before the ads SDK starts',async()=>{
 await wrap(<AdBanner/>);
 await screen.findByTestId('banner-ad');
 expect(calls().map(c=>c[0]).slice(0,3)).toEqual(['config','consent','init']);
 expect(calls()[0][1]).toEqual({tagForChildDirectedTreatment:true,tagForUnderAgeOfConsent:true,maxAdContentRating:'G'});
 expect(calls()[1][1]).toEqual({tagForUnderAgeOfConsent:true});
 const banner=calls().find(c=>c[0]==='banner')[1];
 expect(banner.requestOptions).toEqual({requestNonPersonalizedAdsOnly:true});
 expect(banner.unitId).toBe('test-adaptive-banner'); // Google's test unit until real IDs are added
 expect(bannerUnitId(fake)).toBe('test-adaptive-banner');
});

test('no ads without consent, and none where the ads module is unavailable',async()=>{
 fake.__consent={canRequestAds:false,privacyOptionsRequirementStatus:'REQUIRED'};
 await wrap(<AdBanner/>);
 await waitFor(()=>expect(calls().some(c=>c[0]==='consent')).toBe(true));
 expect(calls().some(c=>c[0]==='init')).toBe(false);
 expect(screen.queryByTestId('banner-ad')).toBeNull();
 await screen.unmount();calls().length=0;
 await wrap(<AdBanner/>,null);
 expect(screen.queryByTestId('banner-ad')).toBeNull();expect(calls()).toEqual([]);
});

test('a banner that fails to load leaves no gap',async()=>{
 await wrap(<AdBanner/>);
 await screen.findByTestId('banner-ad');
 await waitFor(()=>expect(screen.getByLabelText('Advertisement')).toBeTruthy());
 const {onAdFailedToLoad}=calls().find(c=>c[0]==='banner')[1];
 await waitFor(()=>{onAdFailedToLoad(Error('no fill'));expect(screen.queryByTestId('banner-ad')).toBeNull()});
});

test('the only banner sits below the board and controls on every game',async()=>{
 for(const ui of [<BoardGameScreen key="m" game="marble"/>,<BoardGameScreen key="l" game="lights"/>,<SudokuScreen key="s"/>]){
  await wrap(ui);
  await screen.findByTestId('banner-ad');
  expect(screen.getAllByTestId('banner-ad')).toHaveLength(1);
  const order=JSON.stringify(screen.toJSON());
  const button=order.indexOf(ui.type===SudokuScreen?'Play Sudoku':'Start game');
  expect(button).toBeGreaterThan(-1);
  expect(order.indexOf('banner-ad')).toBeGreaterThan(button);
  expect(order.indexOf('banner-ad')).toBeLessThan(order.indexOf('THE OBJECTIVE'));
  await screen.unmount();
 }
});

function Probe(){const ads=useAds();return <Text>{`${ads.ready}|${ads.privacyOptionsRequired}`}</Text>}
test('ad privacy choices appear in Settings when Google requires them',async()=>{
 fake.__consent={canRequestAds:true,privacyOptionsRequirementStatus:'REQUIRED'};
 await wrap(<><Probe/><Settings/></>);
 expect(await screen.findByText('true|true')).toBeTruthy();
 await fireEvent.press(screen.getByText('Ad privacy choices'));
 expect(fake.AdsConsent.showPrivacyOptionsForm).toHaveBeenCalled();
 await screen.unmount();
 fake.__consent={canRequestAds:true,privacyOptionsRequirementStatus:'NOT_REQUIRED'};
 await wrap(<><Probe/><Settings/></>);
 expect(await screen.findByText('true|false')).toBeTruthy();
 expect(screen.queryByText('Ad privacy choices')).toBeNull();
});

test('the banner can be switched off in app.json while ads stay initialised',async()=>{
 const config=require('expo-constants').default.expoConfig;
 // expoConfig can't be replaced, so edit its extra settings for this test only.
 const originalExtra=config.extra;config.extra={...originalExtra,admob:{bannerEnabled:false}};
 try{
  await wrap(<AdBanner/>);
  await waitFor(()=>expect(calls().some(c=>c[0]==='init')).toBe(true));
  expect(screen.queryByTestId('banner-ad')).toBeNull();
 }finally{config.extra=originalExtra}
});
