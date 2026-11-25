import {Pressable,StyleSheet,View} from 'react-native';
import {Link,router} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Card,Label,Screen} from '../components/ui';
import {games} from '../lib/games';
import {useColors} from '../lib/settings';

const icons:Record<string,string>={marble:'●',triangle:'▲',diamond:'◆',lights:'◐',sudoku:'▦'};

export default function Home(){
 const colors=useColors();const insets=useSafeAreaInsets();
 return <Screen>
  <View style={[styles.header,{paddingTop:insets.top+8}]}>
   <Label variant="heading" accessibilityRole="header">Quiet Marble<Label style={{color:colors.accent}}>.</Label></Label>
   <Link href="/settings" asChild><Pressable accessibilityRole="button" accessibilityLabel="Settings" hitSlop={12} style={styles.settings}>
    <Label variant="muted">Settings</Label>
   </Pressable></Link>
  </View>
  <View style={styles.intro}>
   <Label variant="eyebrow">THREE CLASSIC LOGIC PUZZLES</Label>
   <Label variant="title">A little everyday focus.</Label>
   <Label variant="muted">Play any game offline for practice. Ranked play and leaderboards need an internet connection.</Label>
  </View>
  {games.map(game=><Pressable key={game.key} accessibilityRole="button" accessibilityLabel={`${game.title}, ${game.subtitle}`}
   onPress={()=>router.push({pathname:'/play/[game]',params:{game:game.key}})} style={({pressed})=>({opacity:pressed?0.8:1})}>
   <Card style={styles.game}>
    <Label style={[styles.icon,{color:colors.highlight}]} accessibilityElementsHidden importantForAccessibility="no">{icons[game.key]}</Label>
    <View style={{flex:1}}>
     <Label variant="heading">{game.title}</Label>
     <Label variant="small">{game.subtitle}</Label>
    </View>
    <Label variant="muted" accessibilityElementsHidden importantForAccessibility="no">›</Label>
   </Card>
  </Pressable>)}
 </Screen>;
}

const styles=StyleSheet.create({
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 settings:{minHeight:44,justifyContent:'center'},
 intro:{gap:10,paddingVertical:12},
 game:{flexDirection:'row',alignItems:'center',gap:16},
 icon:{fontSize:28,lineHeight:34,width:36,textAlign:'center'},
});
