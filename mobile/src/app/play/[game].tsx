import {Stack,useLocalSearchParams,Redirect} from 'expo-router';
import {Button,Card,Label,Screen} from '../../components/ui';
import {gameInfo,isGameKey} from '../../lib/games';
import {useSound} from '../../lib/sounds';

// Placeholder until the playable boards arrive in the next update. It already
// shows each game's rules and lets the sound setup be tried on a real phone.
export default function Play(){
 const {game}=useLocalSearchParams<{game:string}>();
 const play=useSound();
 if(!isGameKey(game))return <Redirect href="/"/>;
 const info=gameInfo(game);
 return <Screen>
  <Stack.Screen options={{title:info.title}}/>
  <Card soft>
   <Label variant="eyebrow">THE OBJECTIVE</Label>
   <Label variant="title" style={{fontSize:32,lineHeight:36}}>{info.objective}</Label>
   <Label variant="muted">{info.rules}</Label>
  </Card>
  <Card>
   <Label variant="heading">Coming soon</Label>
   <Label variant="muted">The playable board arrives in the next update. Meanwhile, you can check that game sounds work on this phone.</Label>
   <Button title="Play a test sound" onPress={()=>play(game==='lights'?'switch-on':'marble')}/>
  </Card>
 </Screen>;
}
