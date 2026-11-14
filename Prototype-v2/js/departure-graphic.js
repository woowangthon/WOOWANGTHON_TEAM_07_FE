/* Shared departure → boarding sequence. Inputs are already formatted display text. */
(function (root) {
  'use strict';

  function escapeText(value, fallback) {
    return String(value == null || value === '' ? fallback : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function render(options) {
    var data = options || {};
    var departureTime = escapeText(data.departureTime, '시각 확인 필요');
    var boardingTime = escapeText(data.boardingTime, '시각 확인 필요');
    var stationName = escapeText(data.stationName, '출발역');

    return '<div class="departure-graphic">' +
      '<div class="departure-graphic-track" aria-hidden="true">' +
        '<svg class="departure-graphic-train" viewBox="0 0 40 28" aria-hidden="true" focusable="false">' +
          '<path d="M5 5h22c4 0 8 5 8 10v5H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="currentColor"/>' +
          '<path d="M9 9h6v6H9zm10 0h6v6h-6zm10 1 3 5h-3Z" class="departure-graphic-window"/>' +
          '<path d="M10 23h21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
          '<circle cx="11" cy="21" r="2" fill="currentColor"/><circle cx="28" cy="21" r="2" fill="currentColor"/>' +
        '</svg>' +
      '</div>' +
      '<ol class="departure-graphic-steps" aria-label="이동 순서" role="list">' +
        '<li class="departure-step" data-step="departure">' +
          '<span class="departure-step-point" aria-hidden="true">1</span>' +
          '<span class="departure-step-label">출발</span>' +
          '<strong class="departure-step-time">' + departureTime + '</strong>' +
        '</li>' +
        '<li class="departure-step" data-step="boarding">' +
          '<span class="departure-step-point" aria-hidden="true">2</span>' +
          '<span class="departure-step-label">탑승</span>' +
          '<strong class="departure-step-time">' + boardingTime + '</strong>' +
          '<span class="departure-step-station">' + stationName + '</span>' +
        '</li>' +
      '</ol>' +
      '<p class="departure-graphic-note">실제 열차 위치가 아닌 이동 순서 안내입니다.</p>' +
    '</div>';
  }

  var api = { render: render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.DepartureGraphic = api;
})(typeof window !== 'undefined' ? window : null);
