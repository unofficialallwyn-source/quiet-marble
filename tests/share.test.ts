import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gameFromLink,gameLink,shareRound,shareSudoku,shareText,whatsappLink} from '../src/share-result.ts';
test('share links select only known games and carry no player data or score writes',()=>{
 for(const game of ['marble','triangle','diamond','lights','sudoku'] as const){const u=new URL(gameLink(game));assert.equal(u.hostname,'www.quietmarblegames.com');assert.equal(gameFromLink(u.search),game);assert.deepEqual([...u.searchParams.keys()],['game']);}
 for(const search of ['', '?game=unknown','?game=__proto__','?game=https://evil.test'])assert.equal(gameFromLink(search),'marble');
});
test('result messages distinguish boards, outcomes and practice without claiming leaderboard rank',()=>{
 const diamond=shareRound('diamond',4,8,65,true);assert.match(diamond.text,/Mini Diamond/);assert.match(diamond.text,/4 marbles left in 8 moves/);assert.match(diamond.text,/1m 05s/);assert.match(diamond.text,/Practice round/);
 const lights=shareRound('lights',0,7,23,false);assert.match(lights.text,/All lights off in 7 moves/);assert.match(lights.text,/Unassisted/);
 assert.match(shareRound('triangle',1,13,30,false).text,/1 marble left/);
 assert.equal(new URL(whatsappLink(diamond)).searchParams.get('text'),shareText(diamond));
 const sudoku=shareSudoku({id:'secret-session',name:'Private nickname',startLevel:0,level:2,wins:3,seconds:185,puzzle:[],started:0,solved:true,practice:true});
 assert.match(sudoku.text,/3 consecutive puzzles solved/);assert.match(sudoku.text,/3m 05s total/);assert.match(sudoku.text,/Started Easy · latest puzzle Hard/);assert.match(sudoku.text,/Practice streak/);assert(!shareText(sudoku).includes('secret-session'));assert(!shareText(sudoku).includes('Private nickname'));
});
