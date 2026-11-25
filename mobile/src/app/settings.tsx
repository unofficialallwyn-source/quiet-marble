import {Linking,StyleSheet,Switch,View} from 'react-native';
import Constants from 'expo-constants';
import {Button,Card,Choice,Label,Screen} from '../components/ui';
import {useSettings} from '../lib/settings';
import {useSound} from '../lib/sounds';
import type {ThemePreference} from '../theme/colors';

const SITE='https://www.quietmarblegames.com';

export default function Settings(){
 const {soundOn,setSoundOn,theme,setTheme,colors}=useSettings();
 const play=useSound();
 return <Screen>
  <Card>
   <View style={styles.row}>
    <View style={{flex:1}}>
     <Label variant="heading" nativeID="sound-label">Sound</Label>
     <Label variant="small">Marble and switch sounds. Your phone’s silent mode also mutes them.</Label>
    </View>
    <Switch accessibilityLabelledBy="sound-label" accessibilityLabel="Sound" value={soundOn}
     onValueChange={on=>{setSoundOn(on)}} trackColor={{true:colors.green,false:colors.line}} thumbColor="#ffffff"/>
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
   <Label variant="heading">About</Label>
   <Label variant="muted">Quiet Marble: Marble Solitaire, Lights Out and Sudoku. No account needed. Sounds by Kenney (CC0).</Label>
   <Button title="Privacy policy" onPress={()=>void Linking.openURL(`${SITE}/privacy.html`)}/>
   <Button title="Contact us" onPress={()=>void Linking.openURL(`${SITE}/contact.html`)}/>
   <Label variant="small">Version {Constants.expoConfig?.version??'1.0.0'}</Label>
  </Card>
 </Screen>;
}

const styles=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',gap:12}});
