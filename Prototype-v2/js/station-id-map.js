/* station-id-map.js — FE 슬러그('gangnam') <-> BE station_id 매핑. 의존: window.ApiClient, window.MOCK(load 시)
 * 보수적 매칭: 괄호 부제/끝의 '역'/공백을 뗀 이름이 같고 노선이 하나 이상 겹칠 때만.
 * 후보가 둘 이상이거나 한 BE 역을 여러 FE 역이 주장하면 ambiguous로 두고 매핑하지 않는다. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.StationIdMap = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';
  var state = { slugToId: {}, idToSlug: {}, result: null };

  function norm(name) {
    return String(name || '').replace(/\(.*?\)/g, '').replace(/\s+/g, '').replace(/역$/, '');
  }
  function beLines(s) { return (s.lines || []).map(function (l) { return String(l.line_id); }); }

  function build(beStations, mockStations) {
    beStations = beStations || []; mockStations = mockStations || {};
    var byName = {};
    beStations.forEach(function (b) {
      var k = norm(b.station_name);
      (byName[k] = byName[k] || []).push(b);
    });
    var slugs = Object.keys(mockStations), cands = {}, claims = {};
    slugs.forEach(function (slug) {
      var fe = mockStations[slug], feLines = (fe.lines || []).map(String);
      cands[slug] = (byName[norm(fe.name)] || []).filter(function (b) {
        return beLines(b).some(function (l) { return feLines.indexOf(l) >= 0; });
      });
      cands[slug].forEach(function (b) { (claims[b.station_id] = claims[b.station_id] || []).push(slug); });
    });
    var slugToId = {}, idToSlug = {}, unmatchedFe = [], ambiguous = [], touched = {};
    slugs.forEach(function (slug) {
      var c = cands[slug];
      if (c.length === 0) { unmatchedFe.push(slug); return; }
      c.forEach(function (b) { touched[b.station_id] = true; });
      if (c.length > 1 || claims[c[0].station_id].length > 1) {
        ambiguous.push({ slug: slug, candidates: c.map(function (b) { return b.station_id; }) });
      } else {
        slugToId[slug] = c[0].station_id; idToSlug[c[0].station_id] = slug;
      }
    });
    var unmatchedBe = beStations.filter(function (b) { return !touched[b.station_id]; })
      .map(function (b) { return { station_id: b.station_id, station_name: b.station_name }; });
    var result = { slugToId: slugToId, idToSlug: idToSlug, unmatchedFe: unmatchedFe, unmatchedBe: unmatchedBe, ambiguous: ambiguous };
    state = { slugToId: slugToId, idToSlug: idToSlug, result: result };
    return result;
  }

  async function load(opts) {
    var data = await root.ApiClient.getJSON('be', '/api/stations', opts);
    return build(data.stations || [], (root.MOCK && root.MOCK.stations) || {});
  }

  return {
    norm: norm,
    build: build,
    load: load,
    toBeId: function (slug) { return state.slugToId[slug]; },
    toSlug: function (beId) { return state.idToSlug[beId]; },
    getResult: function () { return state.result; }
  };
});
