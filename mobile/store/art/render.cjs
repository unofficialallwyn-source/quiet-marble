// Renders the app's icon, splash and Play Store graphics from store/art/icon.svg.
// Run from mobile/: node store/art/render.cjs   (uses the Playwright Chromium)
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const art=fs.readFileSync(path.join(__dirname,'icon.svg'),'utf8');
const marbles=art.match(/<defs>[\s\S]*<\/defs>/)[0]+art.match(/<g id="marbles">[\s\S]*?<\/g>\s*<\/g>/)[0];
const svg=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
// Android adaptive icons crop to a circle/squircle: keep the marbles inside the central 66%
// (outermost marble edge at 0.85 scale: 352*0.85=299px from centre, under the 338px limit).
const centred=(scale,size=1024)=>`<g transform="translate(${size/2} ${size/2}) scale(${scale}) translate(-512 -512)">${marbles}</g>`;
const mono=marbles.replace(/fill="url\(#(marble|hole)\)"/g,'fill="#ffffff"').replace(/stroke="#294c33"/,'stroke="none"');
const outputs={
 'assets/icon.png':[1024,1024,art.replace('<svg ','<svg width="1024" height="1024" ')],
 'assets/android-icon-foreground.png':[1024,1024,svg(1024,1024,centred(0.85))],
 'assets/android-icon-background.png':[1024,1024,svg(1024,1024,'<defs><radialGradient id="b" cx="35%" cy="25%" r="85%"><stop offset="0" stop-color="#f3ead2"/><stop offset="1" stop-color="#e2d3ab"/></radialGradient></defs><rect width="1024" height="1024" fill="url(#b)"/>')],
 'assets/android-icon-monochrome.png':[1024,1024,svg(1024,1024,`<g transform="translate(512 512) scale(0.85) translate(-512 -512)">${mono}</g>`)],
 'assets/splash-icon.png':[1024,1024,svg(1024,1024,centred(0.9))],
 'assets/favicon.png':[48,48,art.replace('<svg ','<svg width="48" height="48" ')],
 'store/google-play/graphics/app-icon-512.png':[512,512,art.replace('<svg ','<svg width="512" height="512" ')],
 'store/google-play/graphics/feature-graphic-1024x500.png':[1024,500,svg(1024,500,`
  <defs><radialGradient id="fb" cx="30%" cy="20%" r="95%"><stop offset="0" stop-color="#f7f1df"/><stop offset="1" stop-color="#e5d7b2"/></radialGradient></defs>
  <rect width="1024" height="500" fill="url(#fb)"/>
  <g transform="translate(250 250) scale(0.42) translate(-512 -512)">${marbles}</g>
  <text x="470" y="215" font-family="Georgia,serif" font-size="78" fill="#233d36" letter-spacing="-1">Quiet Marble</text>
  <text x="474" y="280" font-family="Helvetica,Arial,sans-serif" font-size="30" fill="#4f6158">Marble Solitaire · Lights Out · Sudoku</text>
  <text x="474" y="330" font-family="Helvetica,Arial,sans-serif" font-size="26" fill="#6b756d">A little everyday focus.</text>`)],
};
(async()=>{
 const browser=await chromium.launch();
 for(const [file,[w,h,markup]] of Object.entries(outputs)){
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
  await page.screenshot({path:path.join(process.cwd(),file),omitBackground:true,clip:{x:0,y:0,width:w,height:h}});
  await page.close();console.log('wrote',file,`${w}x${h}`);
 }
 await browser.close();
})();
