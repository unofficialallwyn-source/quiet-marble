import {Stack,useLocalSearchParams,Redirect} from 'expo-router';
import {gameInfo,isGameKey} from '../../lib/games';
import {BoardGameScreen} from '../../games/BoardGameScreen';
import {SudokuScreen} from '../../games/SudokuScreen';

export default function Play(){
 const {game}=useLocalSearchParams<{game:string}>();
 if(!isGameKey(game))return <Redirect href="/"/>;
 return <>
  <Stack.Screen options={{title:gameInfo(game).title}}/>
  {game==='sudoku'?<SudokuScreen/>:<BoardGameScreen key={game} game={game}/>}
 </>;
}
