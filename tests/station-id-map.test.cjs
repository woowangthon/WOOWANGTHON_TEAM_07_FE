const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const M=require('../Prototype-v2/js/station-id-map.js');
const w={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../Prototype-v2/js/mock-data.js'),'utf8'),{window:w,console});
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/be-stations.json'),'utf8'));
test('norm strips subtitle, spaces and trailing 역',()=>{
 assert.equal(M.norm('교대(법원, 검찰청)'),'교대');assert.equal(M.norm('강남역'),'강남');assert.equal(M.norm('서울 대입구'),'서울대입구');
});
test('conservative matching: shared line required, ambiguity never guessed',()=>{
 const be=[{station_id:1,station_name:'A',lines:[{line_id:'1'}]},{station_id:2,station_name:'A(부제)',lines:[{line_id:'1'}]},
  {station_id:3,station_name:'B',lines:[{line_id:'3'}]},{station_id:4,station_name:'C',lines:[{line_id:'2'}]}];
 const fe={a:{name:'A',lines:['1']},b:{name:'B',lines:['2']},c:{name:'C역',lines:['2']}};
 const r=M.build(be,fe);
 assert.deepEqual(r.slugToId,{c:4});assert.deepEqual(r.unmatchedFe,['b']);
 assert.deepEqual(r.ambiguous,[{slug:'a',candidates:[1,2]}]);assert.deepEqual(r.unmatchedBe,[{station_id:3,station_name:'B'}]);
 assert.equal(M.toBeId('c'),4);assert.equal(M.toSlug(4),'c');assert.equal(M.toBeId('a'),undefined);
});
test('recorded BE fixture vs real MOCK stations',()=>{
 const r=M.build(fixture.stations,w.MOCK.stations);
 assert.equal(fixture.stations.length,240);assert.equal(Object.keys(w.MOCK.stations).length,238);
 assert.equal(Object.keys(r.slugToId).length,222);
 assert.equal(Object.keys(r.idToSlug).length,222);
 assert.deepEqual(r.ambiguous,[]);
 assert.deepEqual(r.unmatchedFe,['nokcheon','wolgye','kwangwoon_univ','sinimun','hufs','hoegi','namyeong','yongsan','noryangjin','daebang','yeongdeungpo','guro','doksan','guil','gaebong','oryu_dong']);
 assert.deepEqual(r.unmatchedBe.map(b=>b.station_id),[155,112,88,234,191,193,156,111,90,91,192,189,226,190,59,159,158,157]);
 assert.equal(M.toBeId('gangnam'),fixture.stations.find(b=>b.station_name==='강남').station_id);
 assert.equal(M.toBeId('gyodae'),fixture.stations.find(b=>/^교대/.test(b.station_name)).station_id);
});
test('load() fetches full list via ApiClient and builds from MOCK',async()=>{
 const api=require('../Prototype-v2/js/api-client.js');
 const root=globalThis;root.ApiClient=api;root.MOCK=w.MOCK;
 let url;const orig=api.getJSON;api.getJSON=(b,p)=>{url=[b,p];return Promise.resolve(fixture);};
 try{const r=await M.load();assert.deepEqual(url,['be','/api/stations']);assert.equal(Object.keys(r.slugToId).length,222);}
 finally{api.getJSON=orig;delete root.ApiClient;delete root.MOCK;}
});
test('renamed station alias: 뚝섬유원지 maps to BE 자양 (7호선)',()=>{const r=M.build(fixture.stations,w.MOCK.stations);assert.equal(r.slugToId.ttukseom_park,205);});
