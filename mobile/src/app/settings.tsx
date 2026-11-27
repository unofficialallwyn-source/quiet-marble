import {Linking,Platform,Pressable,StyleSheet,Switch,Text,View} from 'react-native';
import Constants from 'expo-constants';
import {Button,Card,Choice,Label,Screen} from '../components/ui';
import {useSettings} from '../lib/settings';
import {useSound} from '../lib/sounds';
import {useAds} from '../lib/ads';
import {colorThemes,fonts,type ColorThemeId,type ThemePreference} from '../theme/colors';

const SITE='https://www.quietmarblegames.com';
const SOUND_NOTE=Platform.OS==='android'
 ?'Marble and switch sounds, at your media volume.'
 :'Marble and switch sounds. Your phone’s silent switch also mutes them.';

export default function Settings(){
 const {soundOn,setSoundOn,theme,setTheme,colorTheme,setColorTheme,colors,scheme}=useSettings();
 const play=useSound();
 const ads=useAds();
 return <Screen>
  <Card>
   <View style={styles.row}>
    <View style={{flex:1}}>
     <Label variant="heading" nativeID="sound-label">Sound</Label>
     <Label variant="small">{SOUND_NOTE}</Label>
    </View>
    <Switch accessibilityLabelledBy="sound-label" accessibilityLabel="Sound" value={soundOn}
     onValueChange={on=>{setSoundOn(on)}} trackColor={{true:colors.primary,false:colors.line}} thumbColor="#ffffff"/>
   </View>
   {soundOn&&<Button title="Play a test sound" onPress={()=>play('marble')}/>}
  </Card>
  <Card>
   <Label variant="heading">Appearance</Label>
   <Choice<ThemePreference> label="Appearance" value={theme} onChange={setTheme} options={[
    {value:'system',label:'Automatic'},{value:'light',label:'Light'},{value:'dark',label:'Dark'}]}/>
   <Label variant="small">Automatic follows your phone’s light or dark setting.</Label>
  </Card>
  <Card>
   <Label variant="heading" nativeID="colour-label">Colour theme</Label>
   <View accessibilityRole="radiogroup" accessibilityLabelledBy="colour-label" style={styles.swatches}>
    {(Object.keys(colorThemes) as ColorThemeId[]).map(id=>{
     const chosen=id===colorTheme,sample=colorThemes[id][scheme];
     return <Pressable key={id} accessibilityRole="radio" accessibilityState={{checked:chosen}} accessibilityLabel={colorThemes[id].name}
      onPress={()=>setColorTheme(id)} style={[styles.swatch,{borderColor:chosen?colors.primary:colors.line,borderWidth:chosen?2:1}]}>
      <View style={[styles.sample,{backgroundColor:sample.background,borderColor:sample.line}]}>
       <View style={[styles.dot,{backgroundColor:sample.primary}]}/>
       <View style={[styles.dot,{backgroundColor:sample.soft,borderWidth:1,borderColor:sample.softLine}]}/>
      </View>
      <Text style={{flex:1,fontFamily:chosen?fonts.medium:fonts.body,fontSize:14,color:colors.ink}}>{colorThemes[id].name}</Text>
      {chosen&&<Text style={{color:colors.primary,fontSize:16}} accessibilityElementsHidden importantForAccessibility="no">✓</Text>}
     </Pressable>;
    })}
   </View>
   <Label variant="small">Each theme has a light and a dark version.</Label>
  </Card>
  <Card>
   <Label variant="heading">About</Label>
   <Label variant="muted">Quiet Marble: Marble Solitaire, Lights Out and Sudoku. No account needed. Sounds by Kenney (CC0).</Label>
   <Label variant="small">Ads are suitable for all ages and are not personalised. The app does not track you across other apps.</Label>
   <Button title="Privacy policy" onPress={()=>void Linking.openURL(`${SITE}/privacy.html`)}/>
   <Button title="Contact us" onPress={()=>void Linking.openURL(`${SITE}/contact.html`)}/>
   {ads.privacyOptionsRequired&&<Button title="Ad privacy choices" onPress={()=>void ads.showPrivacyOptions()}/>}
   <Label variant="small">Version {Constants.expoConfig?.version??'1.0.0'}</Label>
  </Card>
 </Screen>;
}

const styles=StyleSheet.create({
 row:{flexDirection:'row',alignItems:'center',gap:12},
 swatches:{gap:8},
 swatch:{flexDirection:'row',alignItems:'center',gap:12,minHeight:52,borderRadius:12,paddingHorizontal:12,paddingVertical:8},
 sample:{flexDirection:'row',gap:4,padding:6,borderRadius:10,borderWidth:1},
 dot:{width:18,height:18,borderRadius:9},
});
