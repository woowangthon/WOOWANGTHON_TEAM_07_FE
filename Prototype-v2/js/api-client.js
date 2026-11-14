/* api-client.js — BE/AI 서버용 얕은 fetch 래퍼. 의존: window.APP_CONFIG(선택, 호출 시점에 읽음)
 * ApiClient.getJSON(base, path, {timeoutMs, fetch}) / postJSON(base, path, body, opts)
 * base: 'be' | 'chat' | 전체 URL. 쿠키/인증 없음(credentials: 'omit').
 * 실패 시 Error(.status, .code, .message): BE 오류 형식 {"error":{"code","message"}}, 네트워크 'NETWORK', 시간초과 'TIMEOUT'. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ApiClient = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';
  var DEFAULT_TIMEOUT = 5000;

  function cfg(key, fallback) {
    var c = root && root.APP_CONFIG;
    return (c && c[key] !== undefined) ? c[key] : fallback;
  }
  function resolveBase(base) {
    if (base === 'be') return cfg('beBase', 'http://127.0.0.1:8000');
    if (base === 'chat') return cfg('chatBase', 'http://127.0.0.1:8001');
    return base || '';
  }
  function makeError(message, code, status) {
    var e = new Error(message); e.code = code; e.status = status || 0; return e;
  }

  async function request(base, path, method, body, opts) {
    opts = opts || {};
    var f = opts.fetch || (root && root.fetch && root.fetch.bind(root)) || (typeof fetch !== 'undefined' ? fetch : null);
    if (!f) throw makeError('fetch를 사용할 수 없습니다', 'NETWORK');
    var url = String(resolveBase(base)).replace(/\/+$/, '') + path;
    var timeoutMs = opts.timeoutMs > 0 ? opts.timeoutMs : DEFAULT_TIMEOUT;
    var ctrl = new AbortController();
    var timedOut = false;
    var timer = setTimeout(function () { timedOut = true; ctrl.abort(); }, timeoutMs);
    var init = { method: method, credentials: 'omit', signal: ctrl.signal, headers: { Accept: 'application/json' } };
    if (body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
    try {
      var res = await f(url, init);
      var text = await res.text();
      var data = null;
      if (text) { try { data = JSON.parse(text); } catch (e) { data = null; } }
      if (!res.ok) {
        var err = data && data.error;
        throw makeError((err && err.message) || ('HTTP ' + res.status), (err && err.code) || ('HTTP_' + res.status), res.status);
      }
      if (data === null && text) throw makeError('응답이 JSON이 아닙니다', 'BAD_RESPONSE', res.status);
      return data;
    } catch (e) {
      if (e && e.code) throw e;
      if (timedOut) throw makeError('요청 시간이 초과되었습니다', 'TIMEOUT');
      throw makeError((e && e.message) || '네트워크 오류', 'NETWORK');
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    DEFAULT_TIMEOUT_MS: DEFAULT_TIMEOUT,
    getJSON: function (base, path, opts) { return request(base, path, 'GET', undefined, opts); },
    postJSON: function (base, path, body, opts) { return request(base, path, 'POST', body === undefined ? {} : body, opts); }
  };
});
