import type {ReactNode} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,type PressableProps,type StyleProp,type TextProps,type ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useColors} from '../lib/settings';
import {fonts} from '../theme/colors';

/** Scrollable page with the theme background and safe-area padding. */
export function Screen({children,scroll=true}:{children:ReactNode;scroll?:boolean}){
 const colors=useColors();
 const body=<View style={styles.page}>{children}</View>;
 return <SafeAreaView edges={['left','right','bottom']} style={{flex:1,backgroundColor:colors.background}}>
  {scroll?<ScrollView contentContainerStyle={styles.scroll}>{body}</ScrollView>:body}
 </SafeAreaView>;
}

type Variant='body'|'muted'|'title'|'heading'|'eyebrow'|'small';
export function Label({variant='body',style,...props}:TextProps&{variant?:Variant}){
 const colors=useColors();
 const look={
  body:{fontFamily:fonts.body,fontSize:15,lineHeight:23,color:colors.ink},
  muted:{fontFamily:fonts.body,fontSize:14,lineHeight:22,color:colors.muted},
  small:{fontFamily:fonts.body,fontSize:12,lineHeight:18,color:colors.muted},
  title:{fontFamily:fonts.display,fontSize:40,lineHeight:44,color:colors.ink,letterSpacing:-1},
  heading:{fontFamily:fonts.medium,fontSize:17,lineHeight:24,color:colors.ink},
  eyebrow:{fontFamily:fonts.bold,fontSize:11,letterSpacing:2,color:colors.muted},
 }[variant];
 return <Text {...props} style={[look,style]}/>;
}

export function Card({children,style,soft}:{children:ReactNode;style?:StyleProp<ViewStyle>;soft?:boolean}){
 const colors=useColors();
 return <View style={[styles.card,{backgroundColor:soft?colors.soft:colors.card,borderColor:soft?colors.softLine:colors.line},style]}>{children}</View>;
}

export function Button({title,primary,style,...props}:PressableProps&{title:string;primary?:boolean;style?:StyleProp<ViewStyle>}){
 const colors=useColors();
 return <Pressable accessibilityRole="button" {...props} style={({pressed})=>[styles.button,
  {borderColor:primary?colors.green:colors.line,backgroundColor:primary?colors.green:'transparent',opacity:props.disabled?0.45:pressed?0.75:1},style]}>
  <Text style={{fontFamily:fonts.medium,fontSize:15,color:primary?colors.onGreen:colors.ink}}>{title}</Text>
 </Pressable>;
}

/** A row of mutually exclusive choices (for example Light / Dark / System). */
export function Choice<T extends string>({options,value,onChange,label}:{options:{value:T;label:string}[];value:T;onChange(value:T):void;label:string}){
 const colors=useColors();
 return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.choice,{borderColor:colors.line}]}>
  {options.map(o=>{const chosen=o.value===value;return <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{checked:chosen}}
   onPress={()=>onChange(o.value)} style={[styles.option,chosen&&{backgroundColor:colors.green}]}>
   <Text style={{fontFamily:chosen?fonts.medium:fonts.body,fontSize:14,color:chosen?colors.onGreen:colors.ink}}>{o.label}</Text>
  </Pressable>})}
 </View>;
}

const styles=StyleSheet.create({
 scroll:{flexGrow:1},
 page:{flex:1,width:'100%',maxWidth:640,alignSelf:'center',padding:20,gap:16},
 card:{borderWidth:1,borderRadius:16,padding:18,gap:8},
 button:{minHeight:48,borderWidth:1,borderRadius:10,paddingHorizontal:18,alignItems:'center',justifyContent:'center'},
 choice:{flexDirection:'row',borderWidth:1,borderRadius:10,padding:3,gap:3},
 option:{flex:1,minHeight:42,borderRadius:8,alignItems:'center',justifyContent:'center'},
});
