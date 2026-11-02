import { chromium } from '@playwright/test';
const browser = await chromium.launch({args:['--no-sandbox']});
const page = await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:3000';
const tag=Date.now().toString(36).slice(-5);
const userEmail=`ui-${tag}@forge.invalid`;
const symbol=`Q${tag.toUpperCase()}`;
const name=`UI QA ${tag}`;
let userId='';
await page.goto(base,{waitUntil:'networkidle'});
await page.waitForTimeout(800);
await page.screenshot({path:'.visual-audit/final-home-desktop.png'});
console.log('desktop home',await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,menu:getComputedStyle(document.querySelector('.menu-button')).display})));
for(const width of [390,320]) {
 await page.setViewportSize({width,height:844}); await page.waitForTimeout(200);
 console.log('home overflow',width,await page.evaluate(()=>({w:document.documentElement.scrollWidth,inner:innerWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='fixed').slice(0,8).map(e=>({tag:e.tagName,c:e.className,right:e.getBoundingClientRect().right}))})));
 await page.screenshot({path:`.visual-audit/final-home-${width}.png`});
}
await page.setViewportSize({width:1440,height:1000});
await page.getByRole('button',{name:'Sign in',exact:true}).click();
await page.getByRole('dialog').waitFor();
await page.getByRole('button',{name:'Continue as demo',exact:true}).click();
await page.waitForTimeout(700);
console.log('demo session',await page.evaluate(()=>!!document.querySelector('.app-header .network-pill')));
for(const route of ['launch','create','terminal','stoke','docs','dashboard','token/lava-cat']) {
 await page.goto(`${base}/${route}`,{waitUntil:'networkidle'}); await page.waitForTimeout(400);
 console.log('route',route,await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth})));
 await page.screenshot({path:`.visual-audit/final-${route.replaceAll('/','-')}.png`});
}
// Register an isolated test account for a complete wallet+launch flow.
const reg=await page.request.post(base+'/api/auth/register',{data:{name,email:userEmail,password:'QAPass1234'}});
const regJson=await reg.json();
if(!reg.ok()) throw new Error('register '+JSON.stringify(regJson));
userId=regJson.user.id;
await page.goto(base+'/create',{waitUntil:'networkidle'});
await page.getByLabel('Token name',{exact:true}).fill(name);
await page.getByLabel('Ticker',{exact:true}).fill(symbol);
await page.getByLabel('Description',{exact:true}).fill('QA-only token for launchpad UI and account checks.');
await page.getByRole('button',{name:'Continue',exact:true}).click();
await page.getByRole('button',{name:'Continue',exact:true}).click();
await page.getByRole('button',{name:'Review launch',exact:true}).click();
await page.getByRole('button',{name:`Deploy $${symbol}`,exact:true}).click();
await page.waitForTimeout(1200);
console.log('deploy success',await page.getByRole('heading',{name:`$${symbol} is live.`,exact:true}).isVisible());
const act=await page.request.post(base+'/api/launches/'+symbol+'/action',{data:{action:'buy',amount:0.5}});
const data=await act.json();
console.log('buy',act.status(),data.detail?.myBalance);
const payIntent=await page.request.post(base+'/api/x',{data:{action:'checkout',handle:'forge_xyz',usd:10,purpose:'stake_topup'}});
const intent=await payIntent.json();
const settle=await page.request.post(base+'/api/x',{data:{action:'confirm',reference:intent.reference,code:intent.code}});
console.log('x sandbox settled',settle.status());
const perp=await page.request.post(base+'/api/perp',{data:{action:'open',marketId:'hip3_stoke_seed',side:'long',notionalUsd:100,leverage:5}});
console.log('perp open',perp.status(),!!(await perp.json()).ok);
const stake=await page.request.post(base+'/api/stoke',{data:{action:'stake',amount:100,lockDays:30}});
console.log('stake',stake.status(),!!(await stake.json()).ok);
await page.goto(base+'/dashboard',{waitUntil:'networkidle'});
await page.waitForTimeout(600);
console.log('portfolio',await page.locator('main').innerText().then(t=>t.includes('UI QA')));
await page.screenshot({path:'.visual-audit/final-portfolio-live.png'});
for(const width of [390,320]) {
 await page.setViewportSize({width,height:844});
 for(const r of ['launch','terminal','create','stoke','docs','dashboard','token/lava-cat']) {
  await page.goto(base+'/'+r,{waitUntil:'networkidle'}); await page.waitForTimeout(300);
  console.log('mobile',width,r,await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth));
 }
}
console.log('PAGE_ERRORS',errors);
console.log('QA_USER_ID',userId);await browser.close();
