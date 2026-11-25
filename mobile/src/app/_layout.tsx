import {useEffect} from 'react';
import {Stack,SplashScreen} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {useFonts} from 'expo-font';
import {DMSans_400Regular,DMSans_500Medium,DMSans_700Bold} from '@expo-google-fonts/dm-sans';
import {LibreCaslonDisplay_400Regular} from '@expo-google-fonts/libre-caslon-display';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {SettingsProvider,useSettings} from '../lib/settings';
import {SoundProvider} from '../lib/sounds';
import {AdsProvider} from '../lib/ads';
import {fonts} from '../theme/colors';

void SplashScreen.preventAutoHideAsync().catch(()=>{});

function Navigator(){
 const {ready,colors,scheme}=useSettings();
 const [fontsLoaded,fontError]=useFonts({DMSans_400Regular,DMSans_500Medium,DMSans_700Bold,LibreCaslonDisplay_400Regular});
 // If fonts fail to load, carry on with system fonts rather than stay on the splash screen.
 const loaded=ready&&(fontsLoaded||!!fontError);
 useEffect(()=>{if(loaded)void SplashScreen.hideAsync().catch(()=>{})},[loaded]);
 if(!loaded)return null;
 return <>
  <StatusBar style={scheme==='dark'?'light':'dark'}/>
  <Stack screenOptions={{
   headerStyle:{backgroundColor:colors.background},headerTintColor:colors.ink,headerShadowVisible:false,
   headerTitleStyle:{fontFamily:fonts.medium},contentStyle:{backgroundColor:colors.background},
  }}>
   <Stack.Screen name="index" options={{headerShown:false}}/>
   <Stack.Screen name="play/[game]" options={{title:''}}/>
   <Stack.Screen name="settings" options={{title:'Settings'}}/>
  </Stack>
 </>;
}

export default function RootLayout(){
 return <SafeAreaProvider>
  <SettingsProvider>
   <SoundProvider>
    <AdsProvider>
     <Navigator/>
    </AdsProvider>
   </SoundProvider>
  </SettingsProvider>
 </SafeAreaProvider>;
}
