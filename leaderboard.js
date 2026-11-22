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
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(0, MAX_STORED)));
    } catch (e) {
      /* storage full / private mode — leaderboard is best-effort */
    }
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
      date: entry.date || new Date().toISOString()
    };
    scores.push(clean);
    scores.sort(function (a, b) { return b.score - a.score; });
    saveScores(scores);
    return { entry: clean, rank: scores.indexOf(clean) + 1, total: scores.length };
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
  }

  function loadSettings() {
    try {
      var raw = global.localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { muted: false, lastMode: 'precision' };
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
