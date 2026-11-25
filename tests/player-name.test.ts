import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkPlayerName,isNameAllowed,NAME_BLOCKED_ERROR,NAME_FORMAT_ERROR} from '../shared/player-name.ts';

test('blocks profanity, disguised spellings, impersonation and web addresses',()=>{
 for(const name of ['fuck','FuUuCk','f u c k','f.u.c.k','Fùck','sh1t','Sh!t head','b1tch','N1gg3r','ass','a s s','Big Ass','A55',
  'boobs','kkk','xxxx','Asshole','admin','Mod','QuietMarble','Quiet Marble Team','q u i e t marble','www.example','spam.com','Moderator Max'])
  assert.equal(isNameAllowed(name),false,name);
});

test('allows ordinary names, including ones that contain blocked letters',()=>{
 for(const name of ['Allwyn Joseph','Cassandra','Dickens','Essex','Sussex','analyst','peacock','Hancock','Cocktail','Scunthorpe',
  'Matsushita','Bobs','As','Tea as art','Shi Tao','Pen Isabel','Titanic','Kim','J. R. R. Tolkien',"O'Neil",'Ana-Maria','അല്വിൻ','李小龍','Zoë'])
  assert.equal(isNameAllowed(name),true,name);
});

test('checkPlayerName keeps the existing format rules and messages',()=>{
 assert.deepEqual(checkPlayerName('  Allwyn   Joseph '),{ok:true,name:'Allwyn Joseph'});
 assert.deepEqual(checkPlayerName(undefined),{ok:true,name:''});
 assert.deepEqual(checkPlayerName('   '),{ok:true,name:''});
 assert.deepEqual(checkPlayerName('x'.repeat(25)),{ok:false,error:NAME_FORMAT_ERROR});
 assert.deepEqual(checkPlayerName('<b>'),{ok:false,error:NAME_FORMAT_ERROR});
 assert.deepEqual(checkPlayerName(42),{ok:false,error:'Enter a valid player name'});
 assert.deepEqual(checkPlayerName('Big Ass'),{ok:false,error:NAME_BLOCKED_ERROR});
});
