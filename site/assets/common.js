/* Creator Topic Board: shared config, data loading and counting rules. */
(function () {
  'use strict';

  var CFG = {
    sheetId: '1nXVCA4gaxy-60Yx6S-4KNsvfkwMvUoXAGRtIIaYpUmw',
    gid: '20802834',
    sheetTz: 'America/Los_Angeles',
    formAction: 'https://docs.google.com/forms/d/e/1FAIpQLSca17gxqMz_0U4KHv1uu1dHAlyrCtjFXCGHfOSfi16130orLg/formResponse',
    entries: {
      topic_id: 'entry.1733854034',
      topic_title: 'entry.1388791013',
      game_url: 'entry.77064459',
      handle: 'entry.820236816',
      submission_id: 'entry.548946146'
    },
    target: 2,
    refreshMs: 60000,
    // Games published on Astrocade before this date (Pacific) don't count: the program wants new games.
    programStart: '2026-10-27',
    // A claim ("I'm building this") shows on the board for this long, and one handle can hold this many at once.
    claimHours: 72,
    claimsPerHandle: 2,
    // Each creator's first game on a topic counts; a second one by the same creator doesn't.
    onePerCreator: true,
    // A game sent from this browser that the Sheet still doesn't show after this long is treated as not received.
    pendingGraceMin: 20
  };

  var params = new URLSearchParams(location.search);
  var IS_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var DEMO = IS_LOCAL && params.get('demo');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Game links ---------- */
  var ULID = '[0-9A-HJKMNP-TV-Z]{26}';
  var GAME_PATH = new RegExp('^/games/([^/]+)/(' + ULID + ')(?:/v/[^/]+)?/?$', 'i');
  var SHARE_PATH = new RegExp('^/share/(' + ULID + ')/?$', 'i');
  var ULID_ONLY = new RegExp('^' + ULID + '$', 'i');
  var LINK_IN_TEXT = /(?:https?:\/\/)?(?:www\.)?astrocade\.com\/[^\s<>"']*/i;
  // Returns {id, slug, url} for an Astrocade game link, {error: 'empty'|'format'|'host'|'other-page'} otherwise.
  // Accepts a link pasted with other text around it, trailing punctuation, score-share links (/share/<id>),
  // version links (/games/<slug>/<id>/v/<n>) and creator-hub links (?g=<id>), and returns the plain game link.
  function parseGameUrl(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return { error: 'empty' };
    var found = s.match(LINK_IN_TEXT);
    if (found) s = found[0].replace(/[.,;:!)\]>'"]+$/, '');
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s.replace(/^\/+/, '');
    var u;
    try { u = new URL(s); } catch (e) { return { error: 'format' }; }
    var host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'astrocade.com') return { error: /astrocade\.com/i.test(String(raw)) ? 'other-page' : 'host' };
    var id = null, slug = 'game', m;
    if ((m = u.pathname.match(GAME_PATH))) {
      id = m[2];
      try { slug = decodeURIComponent(m[1]).toLowerCase(); } catch (e) { slug = m[1].toLowerCase(); }
    } else if ((m = u.pathname.match(SHARE_PATH))) {
      id = m[1];
    } else if (u.searchParams.get('g') && ULID_ONLY.test(u.searchParams.get('g'))) {
      id = u.searchParams.get('g');
    }
    if (!id) return { error: 'other-page' };
    id = id.toUpperCase();
    return { id: id, slug: slug, url: 'https://www.astrocade.com/games/' + encodeURIComponent(slug) + '/' + id };
  }
  function titleFromSlug(slug) {
    return String(slug || 'Untitled game').split('-').filter(Boolean).map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }
  function smallThumb(url) {
    if (!url) return '';
    return url.replace(/([?&])width=\d+/, '$1width=120');
  }

  /* ---------- Time ---------- */
  var dtfCache = {};
  function tzOffsetMs(epoch, tz) {
    var dtf = dtfCache[tz] || (dtfCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    var p = {};
    dtf.formatToParts(new Date(epoch)).forEach(function (x) { p[x.type] = x.value; });
    var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return asUTC - Math.floor(epoch / 1000) * 1000;
  }
  // gviz dates look like "Date(2026,9,28,0,34,39)" in the sheet's time zone (month is 0-based).
  function parseGvizDate(v) {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    var m = String(v).match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/);
    if (!m) { var t = Date.parse(v); return isNaN(t) ? null : t; }
    var guess = Date.UTC(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    var off = tzOffsetMs(guess, CFG.sheetTz);
    var t2 = guess - off;
    var off2 = tzOffsetMs(t2, CFG.sheetTz);
    return off2 === off ? t2 : guess - off2;
  }
  // Calendar parts of an instant in Pacific time, with day of week (0 = Sunday).
  function ptParts(ms) {
    var dtf = new Intl.DateTimeFormat('en-US', { timeZone: CFG.sheetTz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
    var p = {};
    dtf.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month, d: +p.day, dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
  }
  // "2026-11-15" -> epoch at the end of that day, Pacific time.
  function endOfDayPT(ymd) {
    var p = ymd.split('-').map(Number);
    var guess = Date.UTC(p[0], p[1] - 1, p[2], 23, 59, 59);
    return guess - tzOffsetMs(guess, CFG.sheetTz);
  }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDay(ymd) {
    var p = ymd.split('-').map(Number);
    return MONTHS[p[1] - 1] + ' ' + p[2];
  }
  function timeAgo(epoch, now) {
    if (!epoch) return '';
    var s = Math.max(0, Math.round(((now || Date.now()) - epoch) / 1000));
    if (s < 60) return 'just now';
    var m = Math.round(s / 60);
    if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
    var h = Math.round(m / 60);
    if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    var d = Math.round(h / 24);
    return d + (d === 1 ? ' day ago' : ' days ago');
  }
  function clock(epoch) {
    return new Date(epoch).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  // Deadline state for dated topics: null for evergreen ones.
  function timing(topic, now) {
    if (!topic.ship_by) return null;
    now = now || Date.now();
    var ship = endOfDayPT(topic.ship_by);
    var event = topic.event ? endOfDayPT(topic.event) : ship;
    var daysLeft = Math.ceil((ship - now) / 86400000);
    if (now > event) return { state: 'over', label: topic.event_name + ' has passed', short: topic.event_name + ' has passed', closed: true };
    if (now > ship) return { state: 'late', label: 'Ship now. ' + topic.event_name + ' is ' + fmtDay(topic.event), short: 'ship now, ' + topic.event_name + ' ' + fmtDay(topic.event), closed: false };
    var label = 'Ship by ' + fmtDay(topic.ship_by);
    return { state: daysLeft <= 7 ? 'soon' : 'open', label: label, short: 'ship by ' + fmtDay(topic.ship_by), daysLeft: daysLeft, closed: false };
  }

  /* ---------- Loading ---------- */
  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  function loadTopics() { return getJSON('data/topics.json'); }
  function loadGames() { return getJSON('data/games.json').catch(function () { return {}; }); }
  function loadSnapshot() { return getJSON('data/board.json').catch(function () { return null; }); }

  var reqId = 0;
  // Live rows from the submissions Sheet. Resolves {ok, rows, reason}.
  function loadSheetRows(sheetName) {
    if (DEMO) {
      if (sheetName) return getJSON('data/demo-' + sheetName + '.json').then(function (rows) { return { ok: true, rows: rows, source: 'demo' }; }, function () { return { ok: false, reason: 'missing' }; });
      return getJSON('data/demo-rows.json').then(function (rows) { return { ok: true, rows: rows, source: 'demo' }; });
    }
    reqId += 1;
    var url = 'https://docs.google.com/spreadsheets/d/' + CFG.sheetId + '/gviz/tq?tqx=out:json;reqId:' + reqId + '&headers=1' +
      (sheetName ? '&sheet=' + encodeURIComponent(sheetName) : '&gid=' + CFG.gid);
    return fetch(url, { credentials: 'omit', cache: 'no-store' }).then(function (r) {
      return r.text();
    }).then(function (text) {
      var start = text.indexOf('{'), end = text.lastIndexOf('}');
      if (start < 0) return { ok: false, reason: 'parse' };
      var j = JSON.parse(text.slice(start, end + 1));
      if (j.status === 'error') {
        var why = (j.errors || []).map(function (e) { return e.reason; }).join(',');
        return { ok: false, reason: /access_denied/.test(why) ? 'private' : 'error' };
      }
      var norm = function (v) { return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, '_'); };
      var cols = j.table.cols.map(function (c) { return norm(c.label); });
      var dataRows = j.table.rows || [], firstRow = 2;
      // If Google didn't detect the header row, use the first row as labels.
      var want = sheetName === 'roster' ? 'handle' : sheetName === 'topics' ? 'id' : 'topic_id';
      if (cols.indexOf(want) < 0 && dataRows.length) {
        var head = (dataRows[0].c || []).map(function (c) { return norm(c && (c.v != null ? c.v : c.f)); });
        if (head.indexOf(want) >= 0) { cols = head; dataRows = dataRows.slice(1); firstRow = 2; }
      }
      var rows = dataRows.map(function (r, i) {
        var o = { _row: i + firstRow };
        (r.c || []).forEach(function (cell, k) {
          var key = cols[k];
          if (!key) return;
          o[key] = cell == null ? null : (cell.v != null ? cell.v : cell.f);
        });
        return o;
      });
      return { ok: true, rows: rows, source: 'live' };
    }).catch(function () { return { ok: false, reason: 'network' }; });
  }

  // Sheet rows (live or snapshot) -> normalized submissions.
  function normalizeRows(rows) {
    return (rows || []).map(function (r) {
      var isClaim = String(r.game_url || '').trim().toLowerCase() === 'claim';
      var game = isClaim ? null : parseGameUrl(r.game_url);
      return {
        row: r._row || r.row || null,
        ts: typeof r.ts === 'number' ? r.ts : parseGvizDate(r.timestamp),
        kind: isClaim ? 'claim' : 'game',
        topicId: String(r.topic_id || '').trim().toLowerCase(),
        topicTitle: r.topic_title || '',
        gameUrlRaw: r.game_url || '',
        game: game && !game.error ? game : null,
        subId: String(r.submission_id || '').trim(),
        handle: String(r.handle || r.discord || '').trim().replace(/^@?/, '@').replace(/^@$/, ''),
        status: String(r.status || '').trim().toLowerCase()
      };
    }).filter(function (r) { return r.topicId || r.gameUrlRaw; });
  }

  /* ---------- Submissions made in this browser, shown until the Sheet catches up ---------- */
  var PKEY = 'ctb.pending.v1';
  var PENDING_TTL = 6 * 3600 * 1000;
  function getPending() {
    try {
      var a = JSON.parse(localStorage.getItem(PKEY) || '[]');
      var now = Date.now();
      return Array.isArray(a) ? a.filter(function (p) { return p && now - p.at < PENDING_TTL; }) : [];
    } catch (e) { return []; }
  }
  function setPending(list) { try { localStorage.setItem(PKEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ } }
  function addPending(p) { var a = getPending(); a.push(p); setPending(a); }
  function prunePending(subs, live) {
    var seen = {}, now = Date.now();
    subs.forEach(function (s) { if (s.subId) seen[s.subId] = 1; });
    var a = getPending(), b = a.filter(function (p) {
      return !seen[p.subId] && !(live && now - p.at > CFG.pendingGraceMin * 60000);
    });
    if (b.length !== a.length) setPending(b);
    return b;
  }

  /* ---------- Everything submitted from this browser, kept for the creator's own reference ---------- */
  var HKEY = 'ctb.history.v1';
  function getHistory() {
    try { var a = JSON.parse(localStorage.getItem(HKEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function addHistory(h) {
    try { var a = getHistory(); a.unshift(h); localStorage.setItem(HKEY, JSON.stringify(a.slice(0, 30))); } catch (e) { /* storage blocked */ }
  }

  /* ---------- Counting rules ---------- */
  // Only a status that starts with "remove" takes a row out. Any other note is ignored.
  var REMOVED = /^\s*remove/i;
  function computeState(topics, subs, games, pending, now, closedIds) {
    games = games || {};
    now = now || Date.now();
    closedIds = closedIds || {};
    var startMs = endOfDayPT(CFG.programStart) - 86400000 + 1000;
    var byId = {}, per = {};
    topics.forEach(function (t) { byId[t.id] = t; per[t.id] = { count: 0, entries: [], claims: [] }; });
    var seenGame = {}, all = [], creatorTopic = {}, claims = [], perHandle = {};
    var sorted = subs.slice().sort(function (a, b) {
      var ta = a.ts || Infinity, tb = b.ts || Infinity;
      return ta !== tb ? (ta < tb ? -1 : 1) : (a.row || 0) - (b.row || 0);
    });
    sorted.forEach(function (s) {
      if (s.kind === 'claim') {
        var c = { sub: s, topic: byId[s.topicId] || null, active: false, why: '' };
        if (REMOVED.test(s.status)) c.why = 'removed';
        else if (!byId[s.topicId]) c.why = closedIds[s.topicId] ? 'topic closed' : 'unknown topic';
        else if (!s.handle) c.why = 'no handle';
        else if (!s.ts || now - s.ts >= CFG.claimHours * 3600000) c.why = 'expired';
        else {
          var h = s.handle.toLowerCase();
          (perHandle[h] = perHandle[h] || []).push(c);
          c.active = true;
        }
        claims.push(c);
        return;
      }
      var flags = [], notes = [];
      var info = s.game ? games[s.game.id] : null;
      if (REMOVED.test(s.status)) flags.push('removed');
      if (!byId[s.topicId]) flags.push(closedIds[s.topicId] ? 'topic closed' : 'unknown topic');
      if (!s.game) flags.push('not a game link');
      else if (info && info.ok === false) flags.push('game not found');
      if (info && info.published && Date.parse(info.published) < startMs) flags.push('made before ' + fmtDay(CFG.programStart));
      if (s.game && seenGame[s.game.id] && flags.indexOf('removed') < 0) flags.push('duplicate');
      if (!flags.length && info && info.creator) {
        var key = info.creator.toLowerCase() + '|' + s.topicId;
        if (creatorTopic[key]) {
          if (CFG.onePerCreator) flags.push('same creator already counted here');
          else notes.push('same creator twice on this topic');
        }
        creatorTopic[key] = 1;
      }
      var counted = flags.length === 0;
      var entry = { sub: s, info: info, flags: flags, notes: notes, counted: counted };
      if (counted) { seenGame[s.game.id] = s; per[s.topicId].count += 1; per[s.topicId].entries.push(entry); }
      all.push(entry);
    });
    // Each handle keeps its newest claims, so a creator's latest claim always shows.
    Object.keys(perHandle).forEach(function (h) {
      var list = perHandle[h];
      list.forEach(function (c, i) {
        if (i < list.length - CFG.claimsPerHandle) { c.active = false; c.why = 'replaced by newer claims (limit ' + CFG.claimsPerHandle + ')'; }
      });
    });
    claims.forEach(function (c) { if (c.active) per[c.sub.topicId].claims.push(c.sub); });
    (pending || []).forEach(function (p) {
      if (!per[p.topicId] || seenGame[p.gameId] || p.kind === 'claim') return;
      var s = { ts: p.at, topicId: p.topicId, game: parseGameUrl(p.gameUrl), subId: p.subId, status: '', pending: true, kind: 'game' };
      if (!s.game || s.game.error) return;
      seenGame[p.gameId] = s;
      per[p.topicId].count += 1;
      per[p.topicId].entries.push({ sub: s, info: games[p.gameId] || null, flags: [], notes: [], counted: true, pending: true });
    });
    // People still building: active claims, minus games that arrived after the earliest claim.
    topics.forEach(function (t) {
      var c = per[t.id], first = c.claims.length ? c.claims[0].ts : 0;
      var after = first ? c.entries.filter(function (e) { return (e.sub.ts || 0) >= first; }).length : 0;
      c.building = c.count >= CFG.target ? 0 : Math.max(0, c.claims.length - after);
    });
    var totals = { complete: 0, started: 0, empty: 0, missed: 0, games: 0, open: 0 };
    topics.forEach(function (t) {
      var c = per[t.id].count, tm = timing(t, now);
      totals.games += c;
      if (c >= CFG.target) totals.complete += 1;
      else if (tm && tm.closed) totals.missed += 1;
      else { totals.open += 1; if (c > 0) totals.started += 1; else totals.empty += 1; }
    });
    return { per: per, all: all, totals: totals, seenGame: seenGame, byId: byId, claims: claims };
  }

  // A date typed into the Sheet arrives as "Date(2026,10,22)" (0-based month), as text like "2026-11-22",
  // or as "11/22/2026". Returns "YYYY-MM-DD" or ''.
  function toYmd(v) {
    var s = String(v == null ? '' : v).trim(), m;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    if ((m = s.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})/))) return m[1] + '-' + pad(+m[2] + 1) + '-' + pad(+m[3]);
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return m[3] + '-' + pad(+m[1]) + '-' + pad(+m[2]);
    return '';
  }
  // The community team can close a topic or move its ship-by date from the Sheet's "topics" tab.
  // Returns the topics still on the board and the ids that were closed.
  function applyOverrides(baseTopics, rows) {
    var over = {};
    (rows || []).forEach(function (r) {
      var id = String(r.id || '').trim().toLowerCase();
      if (id) over[id] = r;
    });
    var closed = {}, moved = {}, list = [];
    baseTopics.forEach(function (t0) {
      var r = over[t0.id];
      if (!r) { list.push(t0); return; }
      var flag = String(r.closed == null ? '' : r.closed).trim().toLowerCase();
      if (flag && !/^(no|false|0|open)$/.test(flag)) { closed[t0.id] = 1; return; }
      var t = Object.assign({}, t0), ship = toYmd(r.ship_by);
      if (ship) {
        t.ship_by = ship;
        if (!t.event || t.event < ship) { t.event = ship; t.event_name = t.event_name || 'The due date'; }
      }
      if (ship && ship !== t0.ship_by) moved[t0.id] = ship;
      list.push(t);
    });
    return { topics: list, closed: closed, moved: moved };
  }

  // Plain-language reasons for creators.
  var REASONS = {
    'removed': 'taken off by the community team',
    'unknown topic': 'the topic wasn’t found',
    'topic closed': 'the topic is closed',
    'not a game link': 'the link isn’t a game page',
    'game not found': 'we can’t open this game. Is it published?',
    'duplicate': 'this game is already on the board',
    'same creator already counted here': 'you already have a game counted on this topic'
  };
  function reasonText(flag) {
    if (REASONS[flag]) return REASONS[flag];
    if (/^made before /.test(flag)) return 'it was published before ' + fmtDay(CFG.programStart) + ', and only newer games count';
    return flag;
  }

  // Categories ordered by their earliest open deadline; evergreen categories keep their order after them.
  function orderCategories(topics, state, now) {
    now = now || Date.now();
    var order = [], map = {};
    topics.forEach(function (t, i) {
      if (!map[t.category]) { map[t.category] = { name: t.category, topics: [], first: i }; order.push(map[t.category]); }
      map[t.category].topics.push(t);
    });
    order.forEach(function (cat) {
      var due = cat.topics.filter(function (t) {
        var tm = timing(t, now), c = state && state.per[t.id] ? state.per[t.id].count : 0;
        return tm && !tm.closed && c < CFG.target;
      }).map(function (t) { return t.ship_by; }).sort();
      cat.nextDue = due[0] || null;
      cat.topics = cat.topics.map(function (t, i) { return { t: t, i: i }; }).sort(function (a, b) {
        var da = a.t.ship_by || '9999', db = b.t.ship_by || '9999';
        return da < db ? -1 : da > db ? 1 : a.i - b.i;
      }).map(function (x) { return x.t; });
    });
    return order.sort(function (a, b) {
      if (a.nextDue && b.nextDue) return a.nextDue < b.nextDue ? -1 : a.nextDue > b.nextDue ? 1 : a.first - b.first;
      if (a.nextDue) return -1;
      if (b.nextDue) return 1;
      return a.first - b.first;
    });
  }

  function newSubmissionId() {
    var a = new Uint8Array(6);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return 's-' + Date.now().toString(36) + '-' + Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  function postSubmission(fields) {
    var body = new URLSearchParams();
    Object.keys(CFG.entries).forEach(function (k) { if (fields[k] != null) body.append(CFG.entries[k], fields[k]); });
    if (DEMO) return new Promise(function (res) { setTimeout(res, 600); });
    return fetch(CFG.formAction, { method: 'POST', mode: 'no-cors', body: body });
  }

  /* ---------- Small view helpers ---------- */
  var ICON = {
    wiki: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M1 3.5h4.2v.8l-1 .2 2.3 6 1.6-3.9-.8-2.1-.9-.2v-.8h4v.8l-1 .2 2.2 6 2-5.8-1.2-.4v-.8H16v.8l-.9.3L12 13h-.8L9.5 8.4 7.6 13h-.8L3.4 4.6l-1-.3z"/></svg>',
    video: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4 2.8v10.4c0 .6.6.9 1.1.6l8-5.2c.4-.3.4-.9 0-1.2l-8-5.2C4.6 1.9 4 2.2 4 2.8z"/></svg>',
    photos: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2.5 2h11A1.5 1.5 0 0 1 15 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9A1.5 1.5 0 0 1 2.5 2zm0 1.3a.2.2 0 0 0-.2.2v6.7l3-3 2.6 2.6 1.6-1.6 4.2 4.1V3.5a.2.2 0 0 0-.2-.2zM10.5 4.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg>',
    article: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3.5 1h6.4L13 4.1v9.4c0 .8-.7 1.5-1.5 1.5h-8C2.7 15 2 14.3 2 13.5v-11C2 1.7 2.7 1 3.5 1zm0 1.3a.2.2 0 0 0-.2.2v11c0 .1.1.2.2.2h8a.2.2 0 0 0 .2-.2V5h-2.5a.7.7 0 0 1-.7-.7V2.3zM5 8h6v1.3H5zm0 2.7h6V12H5z"/></svg>',
    check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1zm3.2 4.3L7 9.5 4.8 7.3l-.9.9L7 11.3l5.1-5.1z"/></svg>',
    search: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M8.5 2a6.5 6.5 0 0 1 5.2 10.4l4 4-1.3 1.3-4-4A6.5 6.5 0 1 1 8.5 2zm0 1.8a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4z"/></svg>'
  };
  function refsHtml(refs) {
    if (!refs || !refs.length) return '';
    return '<ul class="refs" aria-label="Reference links">' + refs.map(function (r) {
      var icon = ICON[r.type] || ICON.article;
      return '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + icon + '<span>' + esc(r.label) + '</span></a></li>';
    }).join('') + '</ul>';
  }
  function meterHtml(count, extraClass) {
    var full = count >= CFG.target;
    var segs = '';
    for (var i = 0; i < CFG.target; i++) segs += '<i class="' + (i < count ? 'on' : '') + '"></i>';
    return '<span class="meter' + (full ? ' full' : '') + (extraClass ? ' ' + extraClass : '') + '" aria-hidden="true">' + segs + '</span>';
  }
  function countText(count) {
    if (count >= CFG.target) return count > CFG.target ? count + ' games' : CFG.target + ' of ' + CFG.target + ' games';
    return count + ' of ' + CFG.target + ' games';
  }

  function chipClass(tm) {
    return tm.state === 'over' ? 'chip-over' : tm.state === 'late' ? 'chip-late' : tm.state === 'soon' ? 'chip-soon' : '';
  }

  window.CTB = {
    CFG: CFG, params: params, DEMO: DEMO, esc: esc, ICON: ICON,
    parseGameUrl: parseGameUrl, titleFromSlug: titleFromSlug, smallThumb: smallThumb,
    parseGvizDate: parseGvizDate, timing: timing, fmtDay: fmtDay, timeAgo: timeAgo, clock: clock,
    loadTopics: loadTopics, loadGames: loadGames, loadSnapshot: loadSnapshot, loadSheetRows: loadSheetRows,
    normalizeRows: normalizeRows, computeState: computeState, applyOverrides: applyOverrides, reasonText: reasonText, orderCategories: orderCategories, endOfDayPT: endOfDayPT, ptParts: ptParts,
    getPending: getPending, addPending: addPending, prunePending: prunePending, getHistory: getHistory, addHistory: addHistory,
    newSubmissionId: newSubmissionId, postSubmission: postSubmission,
    refsHtml: refsHtml, meterHtml: meterHtml, countText: countText, chipClass: chipClass
  };
})();
