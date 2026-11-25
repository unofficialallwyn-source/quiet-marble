import {useState} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions,type LayoutChangeEvent} from 'react-native';
import {valid,marbleVariants,type MarbleVariant} from '@shared/game';
import {fonts} from '../theme/colors';

const HINT='#c48722';

/** Where each hole sits, in board units, for the three marble boards. */
export function holePositions(game:MarbleVariant){
 const spots:{i:number;x:number;y:number}[]=[];
 for(let i=0;i<49;i++){
  if(!valid(i,game))continue;
  const r=Math.floor(i/7),c=i%7;
  // Triangle rows are centred: row r has r+1 holes.
  spots.push(game==='triangle'?{i,x:c+(4-r)/2,y:r*0.87}:{i,x:c,y:r});
 }
 const minX=Math.min(...spots.map(s=>s.x)),minY=Math.min(...spots.map(s=>s.y));
 const width=Math.max(...spots.map(s=>s.x))-minX+1,height=Math.max(...spots.map(s=>s.y))-minY+1;
 return {spots:spots.map(s=>({...s,x:s.x-minX,y:s.y-minY})),width,height};
}

/** Square area that fills the available width. Starts from the screen width
 * (less page padding) and is corrected once the real width is measured. */
export function useBoardSize(max:number){
 const {width}=useWindowDimensions();
 const [measured,setMeasured]=useState(0);
 return {size:Math.min(max,measured||width-40),onLayout:(e:LayoutChangeEvent)=>setMeasured(e.nativeEvent.layout.width)};
}

export function MarbleBoard({game,board,selected,targets,hintTarget,disabled,onTap}:{
 game:MarbleVariant;board:number[];selected:number;targets:number[];hintTarget:number;disabled:boolean;onTap(i:number):void;
}){
 const {size,onLayout}=useBoardSize(420);
 const {spots,width,height}=holePositions(game);
 // The board is as tall as its shape needs (the triangle is shorter than wide).
 const pad=size*0.09,cell=(size-2*pad)/Math.max(width,height),hole=cell*0.78;
 const boardHeight=2*pad+height*cell,offsetX=(Math.max(width,height)-width)*cell/2,offsetY=0;
 return <View onLayout={onLayout} style={styles.area}>
  {size>0&&<View accessibilityLabel={`${marbleVariants[game].name} solitaire board`}
   style={[styles.wood,{width:size,height:boardHeight,borderRadius:game==='marble'?size/2:24}]}>
   {spots.map(({i,x,y})=>{
    const filled=board[i]===1,isTarget=targets.includes(i),isSelected=selected===i,hinted=hintTarget===i;
    return <Pressable key={i} disabled={disabled} onPress={()=>onTap(i)} accessibilityRole="button"
     accessibilityLabel={`Hole row ${Math.floor(i/7)+1}, column ${i%7+1}, ${filled?'marble':'empty'}${isSelected?', selected':''}${isTarget?', you can jump here':''}`}
     accessibilityState={{selected:isSelected,disabled}}
     style={[styles.hole,{left:pad+offsetX+x*cell+(cell-hole)/2,top:pad+offsetY+y*cell+(cell-hole)/2,width:hole,height:hole,borderRadius:hole/2},
      isSelected&&{borderWidth:3,borderColor:'#fff7c3'},isTarget&&!hinted&&{borderWidth:2,borderColor:'#51734b',borderStyle:'dashed'},hinted&&{borderWidth:3,borderColor:HINT}]}>
     {filled?<View style={[styles.marble,{width:hole*0.9,height:hole*0.9,borderRadius:hole}]}><View style={[styles.shine,{width:hole*0.28,height:hole*0.22,borderRadius:hole}]}/></View>
      :isTarget?<View style={styles.dot}/>:null}
    </Pressable>;
   })}
  </View>}
 </View>;
}

export function LightsBoard({board,hint,disabled,onTap}:{board:number[];hint:number;disabled:boolean;onTap(i:number):void}){
 const {size,onLayout}=useBoardSize(380);
 const gap=size*0.025,pad=size*0.06,tile=(size-2*pad-4*gap)/5;
 return <View onLayout={onLayout} style={styles.area}>
  {size>0&&<View accessibilityLabel="Lights Out board" style={[styles.lights,{width:size,height:size,padding:pad,gap}]}>
   {[0,1,2,3,4].map(r=><View key={r} style={{flexDirection:'row',gap}}>
    {[0,1,2,3,4].map(c=>{const i=r*5+c,lit=board[i]===1,hinted=hint===i;
     return <Pressable key={i} disabled={disabled} onPress={()=>onTap(i)} accessibilityRole="button"
      accessibilityLabel={`Tile row ${r+1}, column ${c+1}, ${lit?'on':'off'}${hinted?', hint':''}`} accessibilityState={{disabled}}
      style={({pressed})=>[styles.tile,{width:tile,height:tile},lit&&styles.lit,hinted&&{borderWidth:3,borderColor:HINT},pressed&&{opacity:0.8}]}>
      {lit&&<Text style={[styles.spark,{fontSize:tile*0.36}]}>✦</Text>}
      {hinted&&<Text style={styles.hintLabel}>Hint</Text>}
     </Pressable>;})}
   </View>)}
  </View>}
 </View>;
}

const styles=StyleSheet.create({
 area:{width:'100%',alignItems:'center'},
 wood:{backgroundColor:'#cfba89',borderWidth:2,borderColor:'#e9dbb8',shadowColor:'#50451d',shadowOpacity:0.25,shadowRadius:12,shadowOffset:{width:0,height:8},elevation:6},
 hole:{position:'absolute',backgroundColor:'#ad996d',alignItems:'center',justifyContent:'center'},
 marble:{backgroundColor:'#4c7957',borderWidth:1,borderColor:'#294c33',shadowColor:'#4f4f38',shadowOpacity:0.45,shadowRadius:2,shadowOffset:{width:1,height:2},elevation:3},
 shine:{position:'absolute',top:'16%',left:'20%',backgroundColor:'#c8e3be',opacity:0.7},
 dot:{width:8,height:8,borderRadius:4,backgroundColor:'#f4efd2'},
 lights:{backgroundColor:'#2d453b',borderRadius:20,elevation:6,shadowColor:'#20352b',shadowOpacity:0.35,shadowRadius:10,shadowOffset:{width:0,height:6}},
 tile:{borderRadius:8,borderWidth:1,borderColor:'#587261',backgroundColor:'#3c5948',alignItems:'center',justifyContent:'center'},
 lit:{backgroundColor:'#e8d59b',borderColor:'#f6eac6'},
 spark:{color:'#a48942'},
 hintLabel:{position:'absolute',bottom:2,fontFamily:fonts.bold,fontSize:9,color:'#433b22',backgroundColor:'#fff6da',paddingHorizontal:4,borderRadius:3,overflow:'hidden'},
});
