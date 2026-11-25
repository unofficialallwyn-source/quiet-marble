// Captures Google Play phone screenshots (1080 x 1920) from the app's web build.
// 1. From mobile/: npx expo export --platform web --output-dir <dir>
// 2. Serve <dir> on http://localhost:8765 (e.g. python3 -m http.server 8765)
// 3. node store/art/screenshots.cjs
// The leaderboard API is replaced with an empty board, so no real or invented player names appear.
const {chromium}=require('playwright');const path=require('path');
const out=n=>path.join(__dirname,'../google-play/screenshots',n);
(async()=>{
 const browser=await chromium.launch();
 async function page(scheme){
  const ctx=await browser.newContext({viewport:{width:360,height:640},deviceScaleFactor:3,colorScheme:scheme,isMobile:true,hasTouch:true});
  await ctx.route('**/api/game**',route=>{const r=route.request();
   if(r.method()==='GET')return route.fulfill({json:{scores:[]}});
   const body=JSON.parse(r.postData()||'{}');
   if(body.action==='start')return route.fulfill({json:{id:'11111111-0000-4000-8000-000000000000',name:'Player 1a2b3c'}});
   return route.abort();});
  const p=await ctx.newPage();await p.goto('http://localhost:8765/');await p.waitForTimeout(1500);return p;
 }
 const open=async(p,name)=>{await p.getByText(name,{exact:true}).click();await p.waitForTimeout(1200)};
 const scrollTo=async(p,label)=>{await p.getByLabel(label).first().evaluate(e=>e.scrollIntoView({block:'start'}));await p.mouse.wheel(0,-60);await p.waitForTimeout(400)};
 const shot=async(p,n)=>{await p.screenshot({path:out(n)});console.log('wrote',n)};

 let p=await page('light');await shot(p,'1-home.png');
 await open(p,'Marble Solitaire · English');
 for(const [from,to] of [['row 2, column 4','row 4, column 4'],['row 3, column 2','row 3, column 4'],['row 1, column 3','row 3, column 3']]){
  await p.getByLabel(new RegExp(`^Hole ${from}, marble`)).click();await p.getByLabel(new RegExp(`^Hole ${to}, empty`)).click();await p.waitForTimeout(300);
 }
 await p.getByText('✧ Hint').click();await p.waitForTimeout(800);
 await scrollTo(p,'MARBLES LEFT: 29');await shot(p,'2-marble-hint.png');await p.context().close();

 p=await page('light');await open(p,'Marble Solitaire · Triangle');await scrollTo(p,'MARBLES LEFT: 14');await shot(p,'3-triangle.png');await p.context().close();

 p=await page('dark');await open(p,'Lights Out');
 for(const i of [0,3]){await p.getByLabel(new RegExp(`^Tile row ${Math.floor(i/5)+1}, column ${i%5+1},`)).click();await p.waitForTimeout(200)}
 await scrollTo(p,/^LIGHTS ON/);await shot(p,'4-lights-out-dark.png');await p.context().close();

 p=await page('light');await open(p,'Sudoku streaks');await p.getByText('Play Sudoku').click();await p.waitForTimeout(1500);
 await p.getByLabel(/^Row 3, column \d+, empty/).first().click();await p.waitForTimeout(300);
 await scrollTo(p,/^WINS IN A ROW/);await shot(p,'5-sudoku.png');await p.context().close();

 p=await page('dark');await p.getByLabel('Settings').click();await p.waitForTimeout(1000);await shot(p,'6-settings-dark.png');await p.context().close();
 await browser.close();
})();
