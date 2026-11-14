const assert = require('node:assert/strict');
const fs = require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const os=require('node:os');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer');
const FILE = process.env.APP_FILE || pathToFileURL(path.resolve('Prototype-v2/index.html')).href;
const OUT = process.env.SCREENSHOT_DIR || path.join(os.tmpdir(),'woowangthon-fe-favorites');
const KEY = 'elevSubway.demoFavorites.v1';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let passed = 0, failed = 0;
async function check(label, fn) {
  try { await fn(); passed++; console.log('PASS ' + label); }
  catch (error) { failed++; console.log('FAIL ' + label + ': ' + error.message); }
}
(async () => {
  fs.mkdirSync(OUT, {recursive:true});
  const browser = await puppeteer.launch({headless:true, args:['--no-sandbox']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({width:375,height:812});
    await page.goto(FILE, {waitUntil:'domcontentloaded'});
    await page.evaluate(() => {sessionStorage.clear();localStorage.clear();});
    await page.reload({waitUntil:'domcontentloaded'});
    const tabLogin = async () => {await page.click('[data-tab="login"]');await pause(150);};
    await tabLogin();
    await page.click('[data-provider="google"]');
    await page.waitForSelector('#authUser:not([hidden])');
    const add = async name => {await page.click('#favAddBtn');await page.type('#favAddInput',name);await page.click('#favAddConfirm');await pause(100);};
    const rename = async name => {
      await page.click('.fav-rename-btn');
      await page.$eval('.fav-item .fav-rename-input', el => el.select());
      await page.type('.fav-item .fav-rename-input',name);
      await page.$eval('.fav-item', item => [...item.querySelectorAll('button')].find(button=>button.textContent==='저장').click());
      await pause(100);
    };
    const currentOnly = async expected => {
      assert.equal(await page.$eval('.fav-info',el=>el.textContent.trim()),expected);
      assert.equal(await page.$$eval('.fav-original',els=>els.length),0);
    };
    await add('코엑스');
    const originalId = await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key))[0].id,KEY);
    await page.evaluate(key=>{const list=JSON.parse(sessionStorage.getItem(key));list[0].latitude=37.512;list[0].longitude=127.059;sessionStorage.setItem(key,JSON.stringify(list));},KEY);
    await check('추가 시 현재 이름 하나',()=>currentOnly('코엑스'));
    await page.click('#favEditBtn');
    await rename('우리집');
    await check('1회 변경 후 이전 보조 이름 없음',()=>currentOnly('우리집'));
    const latest = '우리집에서가장가까운아주아주긴장소';
    await rename(latest);
    await check('반복 변경 후 최신 이름만 표시',()=>currentOnly(latest));
    await page.click('#favEditBtn');
    await check('일반 모드 재렌더 후 최신 이름만',()=>currentOnly(latest));
    await page.reload({waitUntil:'domcontentloaded'});
    await tabLogin();
    await check('새로고침 후 최신 이름만',()=>currentOnly(latest));
    await check('원본 이름·ID·좌표 보존',async()=>{
      const record=await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key))[0],KEY);
      assert.deepEqual(record,{id:originalId,placeName:'코엑스',alias:latest,latitude:37.512,longitude:127.059});
    });
    for (const level of ['normal','lg','xl','max']) {
      await page.evaluate(level=>document.documentElement.setAttribute('data-fontsize',level),level);
      await pause(120);
      for (const editing of [false,true]) {
        if (editing) await page.click('#favEditBtn');
        await check(`${level} ${editing?'편집':'일반'} 모드 장문 전체 표시·겹침 없음`,async()=>{
          const metric=await page.$eval('.fav-item',item=>{
            const title=item.querySelector('.fav-primary'),name=item.querySelector('.fav-info');
            const action=item.querySelector('.fav-detail-btn,.fav-edit-actions');
            const a=name.getBoundingClientRect(), b=action.getBoundingClientRect();
            return {titleClipped:title.scrollWidth>title.clientWidth+1||title.scrollHeight>title.clientHeight+1,
              overlap:a.right>b.left+1,overflow:item.scrollWidth>item.clientWidth+1,
              pageOverflow:document.documentElement.scrollWidth>375};
          });
          assert.deepEqual(metric,{titleClipped:false,overlap:false,overflow:false,pageOverflow:false});
        });
        if (level==='normal'||level==='max') await page.screenshot({path:`${OUT}/favorites-${level}-${editing?'edit':'view'}.png`});
        if (editing) await page.click('#favEditBtn');
      }
    }
    await check('제목 클릭은 상세 열기 아님',async()=>{
      await page.click('.fav-primary');
      assert.equal(await page.$eval('#bottomSheet',el=>el.classList.contains('open')),false);
    });
    await page.click('.fav-detail-btn');
    await pause(200);
    await check('상세 화살표 및 최신 이름',async()=>{
      assert((await page.$eval('#sheetContent .sheet-title',el=>el.textContent)).includes(latest));
      assert((await page.$eval('#sheetContent',el=>el.textContent)).includes('실제 열차 위치가 아닙니다'));
    });
    await page.click('#subwayDemoPlay');
    await check('시연 애니메이션 동작',async()=>assert(await page.$eval('#subwayDemoAnim',el=>el.classList.contains('running'))));
    await page.click('[data-act="close-sheet"]');
    await pause(400);
    await page.click('#favEditBtn');
    await page.click('.fav-delete-btn');
    await check('삭제 후 목록·저장소 비움',async()=>{
      assert.equal(await page.$$eval('.fav-item',els=>els.length),0);
      assert.deepEqual(await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)),KEY),[]);
    });
    await check('브라우저 JS 오류 없음',async()=>assert.deepEqual(errors,[]));
  } finally { await browser.close(); }
  console.log(`RESULT ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})().catch(error=>{console.error(error);process.exitCode=1;});
