import {Component,type ReactNode} from 'react';
import {Linking,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SplashScreen} from 'expo-router';
import Constants from 'expo-constants';

// Last line of defence: instead of the app closing ("keeps stopping"), show what
// went wrong so the player can retry or send us a screenshot. Covers errors while
// drawing screens (error boundary) and fatal JavaScript errors elsewhere (global
// handler). Crashes inside native code still close the app.

type Listener=(error:unknown)=>void;
const listeners=new Set<Listener>();
let pending:unknown=null;

type Handler=(error:unknown,isFatal?:boolean)=>void;
const errorUtils=(globalThis as {ErrorUtils?:{getGlobalHandler():Handler;setGlobalHandler(h:Handler):void}}).ErrorUtils;
if(errorUtils){
 const previous=errorUtils.getGlobalHandler();
 errorUtils.setGlobalHandler((error,isFatal)=>{
  // Fatal errors would close the app: show the crash screen instead.
  if(isFatal&&!__DEV__){pending=error;listeners.forEach(l=>l(error));return}
  previous(error,isFatal);
 });
}

export function describeError(error:unknown){
 if(error instanceof Error)return {title:`${error.name}: ${error.message}`,stack:(error.stack??'').split('\n').slice(0,12).join('\n')};
 return {title:String(error),stack:''};
}

export class CrashGuard extends Component<{children:ReactNode},{error:unknown}>{
 state={error:pending};
 private listener:Listener=error=>this.setState({error});
 static getDerivedStateFromError(error:unknown){return {error}}
 componentDidMount(){listeners.add(this.listener);this.hideSplash()}
 componentWillUnmount(){listeners.delete(this.listener)}
 componentDidCatch(){this.hideSplash()}
 componentDidUpdate(){this.hideSplash()}
 // The splash screen is held until fonts load; it must not hide this screen.
 private hideSplash(){if(this.state.error)void SplashScreen.hideAsync().catch(()=>{})}
 render(){
  if(!this.state.error)return this.props.children;
  const {title,stack}=describeError(this.state.error);
  const version=`${Constants.expoConfig?.version??'?'}`;
  return <View style={styles.page}>
   <ScrollView contentContainerStyle={styles.body}>
    <Text style={styles.heading} accessibilityRole="header">Something went wrong</Text>
    <Text style={styles.text}>Quiet Marble hit a problem. Please take a screenshot of this screen and send it to support@quietmarblegames.com, then tap Try again.</Text>
    <Text style={styles.label}>Error (version {version})</Text>
    <Text selectable style={styles.code}>{title}</Text>
    {!!stack&&<Text selectable style={[styles.code,styles.stack]}>{stack}</Text>}
    <Pressable accessibilityRole="button" onPress={()=>{pending=null;this.setState({error:null})}} style={styles.button}><Text style={styles.buttonText}>Try again</Text></Pressable>
    <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL('mailto:support@quietmarblegames.com?subject=Quiet%20Marble%20app%20error')} style={styles.link}><Text style={styles.linkText}>Email support</Text></Pressable>
   </ScrollView>
  </View>;
 }
}

// Plain colours and system fonts: this screen must work even if theming or fonts failed.
const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:'#f7f8f2'},
 body:{padding:24,paddingTop:72,gap:14},
 heading:{fontSize:26,fontWeight:'600',color:'#233d36'},
 text:{fontSize:15,lineHeight:22,color:'#4f6158'},
 label:{fontSize:12,fontWeight:'700',letterSpacing:1,color:'#6b756d',marginTop:8},
 code:{fontFamily:'monospace',fontSize:13,color:'#9b2f22',backgroundColor:'#fffefa',borderWidth:1,borderColor:'#dde3d8',borderRadius:8,padding:10},
 stack:{fontSize:11,color:'#4f6158'},
 button:{backgroundColor:'#315d4c',borderRadius:10,minHeight:48,alignItems:'center',justifyContent:'center',marginTop:8},
 buttonText:{color:'#ffffff',fontSize:16,fontWeight:'600'},
 link:{minHeight:44,alignItems:'center',justifyContent:'center'},
 linkText:{color:'#315d4c',fontSize:15},
});
