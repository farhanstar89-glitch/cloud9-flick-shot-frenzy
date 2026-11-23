/* Cloud9 Flick Shot Frenzy — local leaderboard (shared by game + booth view).
 * Stored entirely in localStorage: no network, no account, booth-safe offline.
 * Key: "c9-flick-shot-frenzy.scores.v1"
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'c9-flick-shot-frenzy.scores.v1';
  var SETTINGS_KEY = 'c9-flick-shot-frenzy.settings.v1';
  var MAX_STORED = 100;

  function loadScores() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (s) {
        return s && typeof s.score === 'number' && typeof s.mode === 'string';
      });
    } catch (e) {
      return [];
    }
  }

  function saveScores(arr) {
    // Caller does the trimming; this only persists. Returns false when the
    // write itself failed (private mode, quota, file:// denial) so the
    // caller can report it instead of claiming a save that never happened.
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      return true;
    } catch (e) {
      /* storage full / private mode — leaderboard is best-effort */
      return false;
    }
  }

  function notifyScoresChanged() {
    // Live booth updates: the booth view listens for this (BroadcastChannel)
    // and for the native 'storage' event localStorage fires in other tabs.
    // The 2s poll in booth.js is only the fallback. All best-effort.
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        var bc = new BroadcastChannel('c9-frenzy-scores');
        bc.postMessage({ type: 'scores-updated', at: Date.now() });
        bc.close();
      }
    } catch (e) { /* ignore */ }
  }

  function addScore(entry) {
    var scores = loadScores();
    var clean = {
      name: String(entry.name || 'ACE').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'ACE',
      score: Math.max(0, Math.round(entry.score || 0)),
      mode: entry.mode || 'precision',
      hits: entry.hits || 0,
      shots: entry.shots || 0,
      acc: entry.acc || 0,
      bestCombo: entry.bestCombo || 0,
      durationMs: Math.round(entry.durationMs || 0),
      date: entry.date || new Date().toISOString()
    };
    scores.push(clean);
    scores.sort(function (a, b) { return b.score - a.score; });
    var rank = scores.indexOf(clean) + 1;
    // Trim to MAX_STORED overall, but never drop a mode's top 10: scores
    // are truncated globally, so a low score in a rarely played mode must
    // still survive on its own booth tab instead of vanishing silently.
    var kept = scores.slice(0, MAX_STORED);
    ['precision', 'reflex', 'chaos', 'track'].forEach(function (m) {
      var top = scores.filter(function (s) { return s.mode === m; }).slice(0, 10);
      top.forEach(function (s) { if (kept.indexOf(s) === -1) kept.push(s); });
    });
    kept.sort(function (a, b) { return b.score - a.score; });
    var written = saveScores(kept);
    notifyScoresChanged();
    var stored = written && kept.indexOf(clean) !== -1;
    return {
      entry: clean,
      rank: rank,
      total: kept.length,
      saved: stored,
      error: !written ? 'storage' : (!stored ? 'rank' : null)
    };
  }

  function topScores(mode, limit) {
    var scores = loadScores();
    if (mode && mode !== 'all') {
      scores = scores.filter(function (s) { return s.mode === mode; });
    }
    return scores.slice(0, limit || 10);
  }

  function clearScores() {
    try { global.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    notifyScoresChanged();
  }

  function loadSettings() {
    try {
      var raw = global.localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { muted: false, lastMode: 'precision', durationMs: 60000 };
  }

  function saveSettings(s) {
    try { global.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }

  global.C9Leaderboard = {
    loadScores: loadScores,
    addScore: addScore,
    topScores: topScores,
    clearScores: clearScores,
    loadSettings: loadSettings,
    saveSettings: saveSettings
  };
})(window);
