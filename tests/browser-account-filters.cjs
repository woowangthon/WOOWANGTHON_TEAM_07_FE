const assert=require('node:assert/strict');
const path=require('node:path');const {pathToFileURL}=require('node:url');
const puppeteer=require(process.env.PUPPETEER_MODULE||'puppeteer');
(async()=>{const b=await puppeteer.launch({headless:true,args:['--no-sandbox']});let n=0;const check=(value,label)=>{assert(value,label);n++;};try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:375,height:812});
 const url=process.env.APP_FILE||pathToFileURL(path.resolve('Prototype-v2/index.html')).href;await p.goto(url,{waitUntil:'domcontentloaded'});
 await p.evaluate(()=>{localStorage.clear();sessionStorage.clear();});await p.reload({waitUntil:'domcontentloaded'});
 const pause=()=>new Promise(r=>setTimeout(r,160));
 await p.evaluate(()=>App.switchTab('login'));check(await p.$eval('#authGuest',e=>!e.hidden),'guest login');check(await p.$eval('#addFilterBtn',e=>e.hidden),'guest filter gate');
 await p.click('[data-provider="google"]');await p.waitForSelector('#authUser:not([hidden])');
 check(await p.$eval('.tab[data-tab="login"]',e=>e.textContent.includes('마이페이지')),'signed-in tab');
 await p.click('#editNameBtn');await p.$eval('#nameEditInput',e=>e.value='새 사용자');await p.click('#nameEditConfirm');
 check(await p.$eval('#authProfileName',e=>e.textContent==='새 사용자'),'profile renamed');
 for(const size of ['normal','lg','xl','max']){await p.click('.fontsize-chip[data-fontsize="'+size+'"]');check(await p.evaluate(size=>(localStorage.getItem('elevSubway.fontSize.v1')===size)&&document.documentElement.scrollWidth<=375,size),'font '+size);}
 check(await p.$eval('[data-auth="signout"]',e=>getComputedStyle(e).backgroundColor==='rgb(37, 99, 235)'),'dedicated logout blue');
 await p.evaluate(()=>App.switchTab('elevator'));await pause();check(await p.$eval('#addFilterBtn',e=>!e.hidden),'signed-in add filter');
 const open=async()=>{await p.click('#addFilterBtn');await p.waitForSelector('#filterPicker');};
 const apply=async()=>{await p.click('#filterPickerDone');await pause();};
 await open();await p.click('[data-pick-line="2"]');await apply();
 check(await p.evaluate(()=>JSON.stringify(JSON.parse(sessionStorage.getItem('elevSubway.elevFilters.v1')))==='["2"]'),'selected line stored');
 await p.$eval('[data-filter="problem"]',e=>e.click());
 const filtered=await p.$$eval('#elevatorList .station-row',rows=>rows.map(r=>r.dataset.id));
 const expected=await p.evaluate(()=>ElevatorService.getAllStations().filter(s=>ElevatorService.hasElevatorData(s.id)&&s.lines.includes('2')&&['PARTIAL','UNAVAILABLE'].includes(ElevatorService.getStationStatus(s.id))).map(s=>s.id));
 check(filtered.length>0&&filtered.length===expected.length&&filtered.every(id=>expected.includes(id)),'base status + custom line compose');
 await p.evaluate(()=>ElevatorService.getAllStations().filter(s=>s.lines.includes('2')).forEach(s=>ElevatorService.getElevators(s.id).forEach(e=>{if(e.status!=='AVAILABLE')ElevatorService.toggleElevator(s.id,e.id);})));
 check(await p.$eval('#elevatorList',e=>e.textContent.includes('선택한 조건')&&!e.textContent.includes('고장·점검 중인 엘리베이터가 없어요')),'empty filtered result stays scoped');
 await p.evaluate(()=>ElevatorService.reset());
 for(let i=0;i<4;i++){await open();await p.click('[data-pick-line="2"]');await p.click('[data-pick-line="2"]');await apply();}
 check(await p.$$eval('[data-custom-filter]',els=>els.length===1),'fresh dialog handlers do not duplicate');
 await open();await p.$$eval('[data-pick-line]',els=>els.forEach(e=>{if(!e.classList.contains('selected'))e.click();}));await apply();
 for(const font of ['normal','lg','xl','max']){
  await p.evaluate(font=>document.documentElement.setAttribute('data-fontsize',font),font);await pause();
  await p.$eval('#elevatorFilterScroll',e=>e.scrollLeft=0);await pause();
  const left=await p.evaluate(()=>{const a=document.querySelector('#addFilterBtn').getBoundingClientRect(),s=document.querySelector('#elevatorFilterScroll').getBoundingClientRect();return {x:a.x,right:a.right,w:a.width,h:a.height,scrollRight:s.right,canScroll:document.querySelector('#elevatorFilterScroll').scrollWidth>s.width,fade:!document.querySelector('#elevatorFilterFade').hidden};});
  await p.$eval('#elevatorFilterScroll',e=>e.scrollLeft=e.scrollWidth);await pause();
  const right=await p.$eval('#addFilterBtn',e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right};});
  check(left.w>=43.99&&left.h>=43.99&&left.scrollRight<=left.x+1&&left.right<=375,font+' fixed button touch and no overlap');
  check(left.canScroll&&left.fade&&Math.abs(left.x-right.x)<1,font+' horizontal overflow/fade + fixed button');
  check(await p.$eval('#elevatorFilterFade',e=>e.hidden),font+' right edge fade hides');
 }
 await p.evaluate(()=>App.switchTab('login'));await p.click('[data-auth="signout"]');await p.waitForSelector('#authGuest:not([hidden])');
 check(await p.$eval('#addFilterBtn',e=>e.hidden),'logout hides custom filter');
 check(await p.evaluate(()=>JSON.parse(sessionStorage.getItem('elevSubway.elevFilters.v1')).length===0),'logout clears filter state');
 check(await p.evaluate(()=>JSON.parse(sessionStorage.getItem('elevSubway.demoFavorites.v1')).length===0),'logout clears favorites');
 await p.click('[data-provider="kakao"]');await p.waitForSelector('#authUser:not([hidden])');check(await p.$eval('#authProviderBadge',e=>e.textContent==='카카오'),'second provider demo');
 const q=await b.newPage();await q.setViewport({width:375,height:812});q.on('pageerror',e=>errors.push(e.message));
 await q.evaluateOnNewDocument(()=>{
  sessionStorage.setItem('elevSubway.elevFilters.v1','["2"]');
  Object.defineProperty(window,'APP_CONFIG',{get:()=>({authMode:'real',apiBase:'https://auth-check.invalid'}),set:()=>{},configurable:true});
 });
 await q.setRequestInterception(true);
 q.on('request',request=>{
  if(request.url().startsWith('https://auth-check.invalid/'))setTimeout(()=>request.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'null','Access-Control-Allow-Credentials':'true'},body:JSON.stringify({id:'restored',name:'복구 사용자',provider:'google'})}),500);
  else if(/^https?:/.test(request.url()))request.abort();else request.continue();
 });
 await q.goto(url,{waitUntil:'domcontentloaded'});await q.waitForSelector('#authUser:not([hidden])');
 check(await q.evaluate(()=>[...document.querySelectorAll('#elevatorList .station-row')].length>0&&[...document.querySelectorAll('#elevatorList .station-row')].every(e=>ElevatorService.getStation(e.dataset.id).lines.includes('2'))),'async authenticated restore applies saved filters');
 await q.evaluate(()=>App.openTime({originId:'sindorim',destId:'gangnam',arriveBy:'15:07'}));await q.click('#originSearch');
 const last=await q.$eval('#originResults [role="option"]:last-child',e=>e.id);await q.keyboard.press('ArrowUp');
 check(await q.$eval('#originSearch',(e,id)=>e.getAttribute('aria-activedescendant')===id,last),'initial ArrowUp selects last option');
 await q.close();
 check(errors.length===0,'page errors '+JSON.stringify(errors));console.log('PASS account/filter browser assertions: '+n);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
