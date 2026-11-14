const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../Prototype-v2/js/api-client.js');
const resp=(status,body)=>({ok:status>=200&&status<300,status,text:async()=>typeof body==='string'?body:JSON.stringify(body)});
test('getJSON success: URL join, no credentials, accept header',async()=>{
 let seen;const f=async(u,i)=>{seen={u,i};return resp(200,{a:1});};
 assert.deepEqual(await api.getJSON('http://x:1/','/api/stations',{fetch:f}),{a:1});
 assert.equal(seen.u,'http://x:1/api/stations');assert.equal(seen.i.method,'GET');assert.equal(seen.i.credentials,'omit');
});
test('postJSON sends JSON body',async()=>{
 let seen;const f=async(u,i)=>{seen={u,i};return resp(200,{ok:true});};
 await api.postJSON('http://x','/p',{q:'안녕'},{fetch:f});
 assert.equal(seen.i.method,'POST');assert.equal(seen.i.headers['Content-Type'],'application/json');assert.deepEqual(JSON.parse(seen.i.body),{q:'안녕'});
});
test('BE error shape becomes Error with status/code/message',async()=>{
 const f=async()=>resp(404,{error:{code:'STATION_NOT_FOUND',message:'없는 역'}});
 await assert.rejects(api.getJSON('http://x','/a',{fetch:f}),e=>e.status===404&&e.code==='STATION_NOT_FOUND'&&e.message==='없는 역');
 const g=async()=>resp(502,'<html>');
 await assert.rejects(api.getJSON('http://x','/a',{fetch:g}),e=>e.status===502&&e.code==='HTTP_502');
});
test('network failure -> NETWORK, non-JSON 200 -> BAD_RESPONSE',async()=>{
 await assert.rejects(api.getJSON('http://x','/a',{fetch:async()=>{throw new TypeError('fail');}}),e=>e.code==='NETWORK');
 await assert.rejects(api.getJSON('http://x','/a',{fetch:async()=>resp(200,'nope')}),e=>e.code==='BAD_RESPONSE');
});
test('timeout aborts and yields TIMEOUT',async()=>{
 const f=(u,i)=>new Promise((_,rej)=>i.signal.addEventListener('abort',()=>rej(new Error('aborted'))));
 await assert.rejects(api.getJSON('http://x','/a',{fetch:f,timeoutMs:20}),e=>e.code==='TIMEOUT');
});
test('named bases read APP_CONFIG lazily',async()=>{
 global.window=undefined;
 const urls=[];const f=async u=>{urls.push(u);return resp(200,{});};
 await api.getJSON('be','/a',{fetch:f});await api.getJSON('chat','/b',{fetch:f});
 assert.deepEqual(urls,['http://127.0.0.1:8000/a','http://127.0.0.1:8001/b']);
});
