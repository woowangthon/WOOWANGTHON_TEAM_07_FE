/* Revoke displayed instructions when any supporting evidence expires.
 * A fresh recommendation requires re-evaluation of a newly supplied snapshot. */
(function () {
  'use strict';
  var timer;
  function refresh() {
    clearTimeout(timer);
    var now = Date.now(), next = Infinity;
    document.querySelectorAll('.accessible-route--verified[data-valid-until]').forEach(function (card) {
      var expiry = Number(card.getAttribute('data-valid-until'));
      if (!Number.isFinite(expiry) || expiry <= now) {
        var group = card.closest('.accessible-routes');
        if (group) {
          // Expire only this route: other routes may have independent fresh evidence.
          var replacement = document.createElement('article');
          replacement.className = 'accessible-route accessible-route--missing';
          replacement.innerHTML = '<h4>경로 확인 필요</h4><p>이 경로의 접근성 근거가 만료되었어요. 최신 정보를 확인해 주세요.</p>';
          card.replaceWith(replacement);
          if (!group.querySelector('.accessible-route--verified')) {
            var heading = group.querySelector('.accessible-routes-heading');
            if (heading) heading.remove();
          }
        }
      } else next = Math.min(next, expiry);
    });
    if (next < Infinity) timer = setTimeout(refresh, Math.min(2147483647, Math.max(1, next - Date.now())));
  }
  function init() {
    new MutationObserver(refresh).observe(document.body, {childList: true, subtree: true});
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('pageshow', refresh);
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
