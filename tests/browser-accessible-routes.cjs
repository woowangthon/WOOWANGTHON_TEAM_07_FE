// Fixture-only accessibility integration checks. No fixture enters product data.
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer');
const {route, keys} = require('./accessible-route-fixtures.cjs');
function fresh(id, extra = {}) {
  const r = route({route_id:id, origin_station_id:'sindorim',destination_station_id:'gangnam',affected_station_id:'gangnam',...extra});
  r.nodes[0].station_id=r.origin_station_id; r.nodes.at(-1).station_id=r.destination_station_id;
  const past=new Date(Date.now()-60000).toISOString(), future=new Date(Date.now()+600000).toISOString();
  r.verified_at=past; r.valid_until=future;
  Object.values(r.checks).forEach(c=>Object.assign(c,{verified_at:past,valid_until:future}));
  r.elevators.forEach(e=>Object.assign(e,{fetched_at:past,valid_until:future}));
  return r;
}
(async()=>{
  const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']}); let count=0;
  function check(condition,label){assert(condition,label);count++;}
  try {
    const page=await browser.newPage(); const errors=[];
    page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('net::')) errors.push(m.text());});
    await page.setViewport({width:375,height:812});
    await page.goto(process.env.APP_FILE||pathToFileURL(path.resolve('Prototype-v2/index.html')).href,{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>{
      window.__mapCalls=0; MetroMap.highlightAlternative=()=>window.__mapCalls++;
      App.openStation('gangnam'); document.getElementById('demoStationBreak').click();
    });
    for (const font of ['normal','lg','xl','max']) {
      await page.evaluate(font=>document.documentElement.setAttribute('data-fontsize',font),font);
      const state=await page.$eval('#sheetContent',el=>({text:el.textContent,verified:el.querySelectorAll('.accessible-route--verified').length,checks:el.querySelectorAll('.accessible-route-check--unknown').length,overflow:el.scrollWidth>el.clientWidth+1,details:el.querySelector('.accessible-route-checks').open}));
      check(!state.verified&&state.checks===7,font+' default seven unknown');
      check(state.text.includes('확인 필요'),font+' unknown status');
      check(!/추천 대체역|도보 약|버스로|대체역 보기/.test(state.text),font+' no invented alternative');
      check(!state.overflow&&state.details,font+' wrapping and available checks');
    }
    await page.$eval('#sheetContent .accessible-route-checks summary',el=>el.focus());
    await page.keyboard.press('Enter');
    check(await page.$eval('#sheetContent .accessible-route-checks',el=>!el.open),'keyboard Enter collapses checks');
    await page.keyboard.press('Space');
    check(await page.$eval('#sheetContent .accessible-route-checks',el=>el.open),'keyboard Space expands checks');
    check(await page.evaluate(()=>window.__mapCalls===0),'demo does not highlight unverified path');
    const chats=await page.evaluate(async()=>{
      const output=[];
      for(const q of ['강남역 고장났는데 어디로 가야 해?','강남역 엘리베이터 돼?','신도림에서 강남 가는 길','신도림에서 강남까지 3시까지 가려면?']) {
        AIAgent.reset(); const r=await AIAgent.processMessage(q); const el=document.createElement('div');el.innerHTML=r.html;
        output.push({q,text:r.text+' '+el.textContent,verified:el.querySelectorAll('.accessible-route--verified').length,pending:el.querySelectorAll('.accessible-route--missing').length,actions:r.actions.map(a=>a.type)});
      } return output;
    });
    for(const r of chats){check(!r.verified&&r.pending>0,r.q+' pending');check(!/도보 약|추천드려|편하게 이용|모두 이용 가능/.test(r.text),r.q+' truthful text');check(!r.actions.includes('showAlternative'),r.q+' no unsafe map action');}
    await page.evaluate(()=>App.openTime({originId:'sindorim',destId:'gangnam',arriveBy:null}));
    check(await page.$eval('#timeResult',el=>el.querySelectorAll('.accessible-route--verified').length===0&&el.textContent.includes('확인 필요')&&!el.textContent.includes('도보 약')),'calculation default pending');
    // Real policy + view + actual station sheet, using an explicit test-only adapter.
    const good=fresh('valid',{additional_stops:9});
    good.checks.provider_metadata={note:'ignored metadata must not revoke valid route'};
    good.elevators.push({elevator_id:'unused',status:'UNKNOWN'});
    const pending=fresh('unknown');delete pending.checks.platform_step_free;
    const bad=fresh('failed');bad.elevators[0].status='UNAVAILABLE';
    const bus=fresh('bus',{mode:'BUS',duration_minutes:1});
    const payload={schema_version:1,routes:[bus,pending,bad,good]};
    await page.evaluate(payload=>{ElevatorService.getAccessibleRouteSnapshot=()=>payload;App.openStation('gangnam');},payload);
    const view=await page.$eval('#sheetContent',el=>({verified:el.querySelectorAll('.accessible-route--verified').length,candidates:el.querySelectorAll('.accessible-route--unconfirmed').length,rejected:el.querySelectorAll('.accessible-route--rejected').length,text:el.textContent,first:el.querySelector('.accessible-routes article').className,itinerary:el.querySelectorAll('.accessible-route--unconfirmed ol').length}));
    check(view.verified===1&&view.candidates>=1&&view.rejected===1,'three route states distinguished');
    check(view.first.includes('--verified')&&view.itinerary===0,'verified subway first and candidate not actionable');
    for(const text of ['9개 역','4분','북행','남행','el-1','승강장','exit-2','검증 완료','추가로 지날 역'])check(view.text.includes(text),'route details '+text);
    // Every missing condition must fail closed in the actual renderer.
    for(const key of keys){const r=fresh(key);delete r.checks[key];const result=await page.evaluate(payload=>{const html=AccessibleRouteView.render(payload,{affectedStationId:'gangnam'});return {verified:html.includes('accessible-route--verified'),pending:html.includes('확인 필요')};},{schema_version:1,routes:[r]});check(!result.verified&&result.pending,key+' renderer fail closed');}
    // Both origin and destination context are enforced in result and chatbot.
    const mismatch=fresh('wrong-origin',{origin_station_id:'wrong'});
    await page.evaluate(payload=>{ElevatorService.getAccessibleRouteSnapshot=()=>payload;App.openTime({originId:'sindorim',destId:'gangnam',arriveBy:null});},{schema_version:1,routes:[mismatch]});
    check(await page.$eval('#timeResult',el=>!el.querySelector('.accessible-route--verified')),'result request origin mismatch');
    const chatMismatch=await page.evaluate(async()=>{AIAgent.reset();const r=await AIAgent.processMessage('신도림에서 강남까지 3시까지 가려면?');return r.html;});check(!chatMismatch.includes('accessible-route--verified'),'chat request origin mismatch');
    // Supplied transfer/alternate exit and long detour are accepted without invented topology.
    const transfer=fresh('transfer',{additional_stops:7});
    transfer.nodes.splice(2,0,{node_id:'transfer',station_id:3,station_name:'우회 환승역',platform_id:'p3'});
    transfer.steps.splice(1,0,{from_node_id:'b',to_node_id:'transfer',kind:'TRANSFER',line_id:'다른 노선',elevator_ids:['el-1']});transfer.steps[2].from_node_id='transfer';
    transfer.nodes.at(-1).exit_id='alternate-exit';transfer.destination_exit={exit_id:'alternate-exit',description:'접근 가능한 다른 출구'};
    await page.evaluate(payload=>{ElevatorService.getAccessibleRouteSnapshot=()=>payload;App.openStation('gangnam');},{schema_version:1,routes:[transfer]});
    for(const font of ['normal','lg','xl','max']){
      await page.evaluate(font=>document.documentElement.setAttribute('data-fontsize',font),font);
      const m=await page.$eval('#sheetContent',el=>({overflow:el.scrollWidth>el.clientWidth+1,text:el.textContent,size:parseFloat(getComputedStyle(el.querySelector('.accessible-routes')).fontSize)}));
      check(!m.overflow&&m.text.includes('환승 · 우회')&&m.text.includes('alternate-exit'),font+' transfer/exit/wrap');check(m.size==={normal:15,lg:16.875,xl:18.75,max:22.5}[font],font+' scale');
    }
    // Freshness expires while the UI remains mounted; instructions must be withdrawn.
    const expiring=fresh('short-lived');expiring.checks.train_direction.valid_until=new Date(Date.now()+1300).toISOString();
    await page.evaluate(payload=>{ElevatorService.getAccessibleRouteSnapshot=()=>payload;App.openStation('gangnam');},{schema_version:1,routes:[expiring]});
    check(await page.$eval('#sheetContent',el=>!!el.querySelector('.accessible-route--verified')),'initial fresh badge');
    await page.waitForFunction(()=>!document.querySelector('#sheetContent .accessible-route--verified'),{timeout:5000});
    check(await page.$eval('#sheetContent',el=>!el.querySelector('.accessible-route-itinerary')&&!el.textContent.includes('추천 대체 경로')&&el.textContent.includes('확인 필요')),'expired badge and directions revoked');
    const short=fresh('short'), steady=fresh('steady');
    short.valid_until=new Date(Date.now()+1000).toISOString();
    await page.evaluate(payload=>{ElevatorService.getAccessibleRouteSnapshot=()=>payload;App.openStation('gangnam');},{schema_version:1,routes:[short,steady]});
    check(await page.$$eval('#sheetContent .accessible-route--verified',els=>els.length===2),'independent fresh routes');
    await page.waitForFunction(()=>document.querySelectorAll('#sheetContent .accessible-route--verified').length===1,{timeout:5000});
    check(await page.$eval('#sheetContent',el=>!!el.querySelector('.accessible-routes-heading')&&el.textContent.includes('이 경로의 접근성 근거가 만료')),'only expired route revoked');
    // Restore actual missing-data default for evidence capture.
    await page.evaluate(()=>{ElevatorService.getAccessibleRouteSnapshot=()=>null;App.openStation('gangnam');});
    if(process.env.SCREENSHOT)await page.screenshot({path:process.env.SCREENSHOT});
    check(errors.length===0,'page/console errors: '+JSON.stringify(errors));
    console.log('PASS accessible routes browser assertions: '+count);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
