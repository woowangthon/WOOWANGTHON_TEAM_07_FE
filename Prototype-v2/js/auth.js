/* auth.js — 인증 어댑터 (window.AuthService)
 * ============================================================
 * 모드 선택: index.html 의 APP_CONFIG.authMode 로 제어
 *
 *   'demo'  — 데모 어댑터 (기본값, Prototype-v2 용)
 *             실제 OAuth 없이 sessionStorage에 임시 상태 저장.
 *             ⚠️ 데모 상태는 실제 인증 토큰이나 서버 세션이 아님.
 *                백엔드 API 호출 시 인증 수단으로 사용 금지.
 *                배포 환경에서는 authMode: 'real' 로 반드시 변경.
 *
 *   'real'  — 실제 어댑터 (FastAPI 백엔드 연동)
 *             HttpOnly Secure 쿠키 기반. credentials: 'include' 사용.
 *             인증 실패 시 데모 로그인으로 자동 전환하지 않음.
 * ============================================================
 * API 키·OAuth Secret은 절대 여기에 넣지 않는다.
 * ============================================================
 */
(function () {
  'use strict';

  // ── 설정 읽기 ─────────────────────────────────────────────
  function cfg(key, fallback) {
    return (window.APP_CONFIG && window.APP_CONFIG[key] !== undefined)
      ? window.APP_CONFIG[key] : fallback;
  }
  function authMode() { return cfg('authMode', 'demo'); }
  function apiBase()  { return cfg('apiBase', ''); }

  // ── 내부 상태 ─────────────────────────────────────────────
  // session: null = 확인 전 | false = 비로그인 | object = 로그인
  var session = null;
  var listeners = [];

  function emit() {
    listeners.forEach(function (fn) {
      try { fn(session); } catch (e) { console.error('[Auth] 구독자 오류:', e); }
    });
  }
  function setSession(s) { session = s; emit(); }

  // ═══════════════════════════════════════════════════════════
  // 데모 어댑터
  // ─────────────────────────────────────────────────────────
  // 목적: UI 흐름 시연 전용. 실제 OAuth 없이 sessionStorage에
  //       임시 상태를 저장하여 로그인 화면 흐름을 테스트한다.
  //
  // ⚠️ 주의:
  //   - 이 상태는 서버가 발급한 인증 토큰이나 세션이 아님.
  //   - 백엔드 API 요청 시 인증 수단(Authorization 헤더,
  //     쿠키 등)으로 사용해서는 안 됨.
  //   - sessionStorage이므로 탭을 닫으면 초기화됨.
  //   - 배포 전 반드시 authMode: 'real' 로 교체해야 함.
  // ═══════════════════════════════════════════════════════════
  var DEMO_SESSION_KEY = 'elevSubway.demoAuth.v1'; // "demo" 명시

  var DemoAdapter = {
    init: function () {
      // 같은 탭 내 세션 복원 (새 탭·탭 닫기 후에는 초기화)
      var stored = null;
      try {
        var raw = sessionStorage.getItem(DEMO_SESSION_KEY);
        if (raw) stored = JSON.parse(raw);
      } catch (e) { /* 시크릿 창 등 */ }
      setSession(stored && stored.isDemoUser ? stored : false);
    },

    login: function (provider) {
      var labels = { google: 'Google', kakao: '카카오' };
      if (!labels.hasOwnProperty(provider)) return;
      // isDemoUser 플래그로 "실제 인증이 아님"을 명시
      var demoUser = {
        isDemoUser: true,       // ⚠️ 실제 인증 토큰 아님
        provider:   provider,
        name:       '게스트 사용자',
        email:      ''
      };
      try { sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser)); } catch (e) {}
      setSession(demoUser);
    },

    logout: function () {
      try { sessionStorage.removeItem(DEMO_SESSION_KEY); } catch (e) {}
      setSession(false);
      return Promise.resolve(true);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // 실제 어댑터 (FastAPI 백엔드 연동용)
  // ─────────────────────────────────────────────────────────
  // APP_CONFIG.authMode = 'real' 일 때만 활성화.
  // 모든 요청에 credentials: 'include' 적용 (HttpOnly 쿠키 연동).
  // 인증 실패 시 데모 로그인으로 자동 전환하지 않음.
  //
  // 아래 경로는 제안 계약이며, 백엔드 구현 전까지 확정 아님:
  //   GET  /api/auth/me
  //   GET  /api/auth/google/login
  //   GET  /api/auth/kakao/login
  //   POST /api/auth/logout
  // ═══════════════════════════════════════════════════════════
  var RealAdapter = {
    init: function () {
      return fetch(apiBase() + '/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      }).then(function (res) {
        if (res.ok) {
          return res.json().then(function (data) { setSession(data || false); });
        }
        setSession(false);
      }).catch(function (err) {
        console.warn('[Auth:real] /api/auth/me 실패:', err.message || err);
        setSession(false);
        // ⚠️ 실패 시 데모 모드로 자동 전환하지 않음
      });
    },

    login: function (provider) {
      var paths = {
        google: '/api/auth/google/login',
        kakao:  '/api/auth/kakao/login'
      };
      if (!paths.hasOwnProperty(provider)) return;
      window.location.href = apiBase() + paths[provider];
    },

    logout: function () {
      return fetch(apiBase() + '/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      }).then(function (res) {
        setSession(false);
        return res.ok;
      }).catch(function (err) {
        console.warn('[Auth:real] /api/auth/logout 실패:', err.message || err);
        setSession(false);
        return false;
      });
    }
  };

  // ── 어댑터 선택 ───────────────────────────────────────────
  var adapter = (authMode() === 'real') ? RealAdapter : DemoAdapter;
  if (authMode() === 'real') {
    console.info('[Auth] 실제 인증 모드 (FastAPI 백엔드)');
  } else {
    console.info('[Auth] 데모 인증 모드 — 실제 인증 아님. 배포 시 authMode:"real" 필요.');
  }

  // ── 공개 API ──────────────────────────────────────────────
  function getSession()  { return session; }
  function login(p)      { return adapter.login(p); }
  function logout()      { return adapter.logout(); }
  function subscribe(fn) { if (typeof fn === 'function') listeners.push(fn); }

  // ── 내보내기 및 초기화 ─────────────────────────────────────
  window.AuthService = {
    getSession: getSession,
    login:      login,
    logout:     logout,
    subscribe:  subscribe
  };
  adapter.init();
})();
