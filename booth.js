/* Cloud9 Flick Shot Frenzy — booth display view.
 * Second-monitor top-10 leaderboard. Reads the same localStorage key as the
 * game, refreshes every 2s, auto-cycles mode tabs every 8s. Fully offline.
 */
(function () {
  'use strict';

  var MODES = ['all', 'precision', 'reflex', 'chaos'];
  var current = 0;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render() {
    var mode = MODES[current];
    var list = window.C9Leaderboard.topScores(mode, 10);
    var ul = document.getElementById('booth-list');
    var empty = document.getElementById('booth-empty');
    document.querySelectorAll('.booth-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    if (!list.length) {
      ul.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    ul.innerHTML = list.map(function (s, i) {
      var d = new Date(s.date);
      var when = isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return '<li class="' + (i === 0 ? 'first' : '') + '">' +
        '<span class="rank">#' + (i + 1) + '</span>' +
        '<span class="name">' + esc(s.name) + '</span>' +
        '<span class="meta">' + esc(s.mode) + ' · ' + s.acc + '% acc · combo ' + s.bestCombo + (when ? ' · ' + when : '') + '</span>' +
        '<span class="pts">' + s.score.toLocaleString('en-US') + '</span>' +
        '</li>';
    }).join('');
  }

  function tickClock() {
    document.getElementById('booth-clock').textContent =
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  document.querySelectorAll('.booth-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      current = MODES.indexOf(btn.dataset.mode);
      render();
    });
  });

  render();
  tickClock();
  setInterval(render, 2000); // live refresh from localStorage
  setInterval(tickClock, 1000);
  setInterval(function () { // auto-cycle tabs for the booth crowd
    current = (current + 1) % MODES.length;
    render();
  }, 8000);
})();
