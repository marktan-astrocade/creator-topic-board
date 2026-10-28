/* Creator Topic Board: board page. */
(function () {
  'use strict';
  var C = window.CTB, esc = C.esc, T = C.CFG.target;
  var $ = function (id) { return document.getElementById(id); };

  var baseTopics = [], topics = [], closedIds = {}, movedIds = {}, cats = [], catSig = '', games = {}, state = null, lastSource = null, lastChecked = 0, roster = null;
  var adminMode = C.params.has('admin');
  var lastLatest = '';
  var lastHtml = {};

  function slugify(s) { return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function known() { return state && !state.unknown; }
  function countOf(id) { return state ? state.per[id].count : 0; }
  function buildingOf(id) { return state && state.per[id] ? state.per[id].building : 0; }
  function fmtPlays(n) {
    if (n == null) return '';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M plays';
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K plays';
    return n + (n === 1 ? ' play' : ' plays');
  }

  function categories() {
    return C.orderCategories(topics, known() ? state : null).map(function (c) {
      c.id = 'cat-' + slugify(c.name);
      return c;
    });
  }

  /* ---------- Board (hero): one loading bar for all topics, then one per category ---------- */
  function catStats(cat) {
    var done = 0, started = 0, closed = 0;
    cat.topics.forEach(function (t) {
      var c = countOf(t.id), tm = C.timing(t);
      if (c >= T) done += 1; else if (tm && tm.closed) closed += 1; else if (c > 0) started += 1;
    });
    return { done: done, started: started, closed: closed, total: cat.topics.length };
  }
  function catRisk(cat) {
    if (!known() || !cat.nextDue) return '';
    var days = Math.ceil((C.endOfDayPT(cat.nextDue) - Date.now()) / 86400000);
    var st = catStats(cat);
    return days <= 14 && st.done * 2 < st.total ? ' at-risk' : '';
  }
  function catDue(cat) {
    if (cat.nextDue) return C.endOfDayPT(cat.nextDue) < Date.now() ? 'Ship now' : 'Ship by ' + C.fmtDay(cat.nextDue);
    if (known() && catStats(cat).done === cat.topics.length) return '';
    return cat.topics.some(function (t) { return t.ship_by; }) ? 'Dates passed' : 'Any time';
  }
  function progressOf(list) { return C.progress(list, known() ? state.per : null); }
  function buildBoard() {
    var board = $('board');
    board.innerHTML = cats.map(function (cat, i) {
      return '<li><a class="cbar" href="#' + cat.id + '" data-cat="' + cat.id + '" style="--i:' + i + '">' +
        '<span class="cb-name">' + esc(cat.name) + '</span>' +
        '<span class="cb-track" aria-hidden="true"><i class="cb-fill"></i></span>' +
        '<span class="cb-count"></span><span class="cb-due"></span></a></li>';
    }).join('');
    void board.offsetWidth; // start new bars from empty so they fill in
    updateBoard();
  }
  function updateBoard() {
    var k = known(), unknown = !!state && !k, all = progressOf(topics), bar = $('loadbar');
    bar.className = 'loadbar' + (unknown ? ' is-unknown' : '') + (k && all.have >= all.need ? ' is-done' : '');
    bar.style.setProperty('--p', (k ? 100 * all.pct : 0) + '%');
    $('lb-pct').textContent = k ? C.pctText(all) : '';
    bar.setAttribute('aria-valuemax', String(all.need));
    if (k) {
      bar.setAttribute('aria-valuenow', String(all.have));
      bar.setAttribute('aria-valuetext', all.have + ' of ' + all.need + ' games in, ' + C.pctText(all));
    } else {
      bar.removeAttribute('aria-valuenow');
      bar.setAttribute('aria-valuetext', state ? 'Count not available' : 'Loading');
    }
    cats.forEach(function (cat) {
      var a = $('board').querySelector('.cbar[data-cat="' + cat.id + '"]');
      if (!a) return;
      var p = progressOf(cat.topics), done = k && p.have >= p.need;
      a.className = 'cbar' + catRisk(cat) + (done ? ' is-done' : '') + (unknown ? ' is-unknown' : '');
      a.style.setProperty('--p', (k ? 100 * p.pct : 0) + '%');
      a.querySelector('.cb-count').textContent = !k ? '' : done ? 'Complete' : p.have + ' of ' + p.need + ' games';
      a.querySelector('.cb-due').textContent = catDue(cat);
    });
  }

  /* ---------- Topic list ---------- */
  function chipHtml(tm) { return '<span class="chip ' + C.chipClass(tm) + '">' + esc(tm.label) + '</span>'; }
  function statusPill(t) {
    if (!known()) return '';
    var c = countOf(t.id), b = buildingOf(t.id), out = '';
    if (c < T && b > 0) out += '<span class="chip chip-building">' + b + ' building</span>';
    out += '<span class="chip chip-status">' + (c >= T ? 'Complete' : c > 0 ? c + ' of ' + T : 'Open') + '</span>';
    return out;
  }
  function gamesHtml(t) {
    if (!state) return '';
    var entries = state.per[t.id].entries;
    if (!entries.length) return '';
    return '<ul class="games" aria-label="Submitted games">' + entries.map(function (e) {
      var s = e.sub, info = e.info || {}, g = s.game;
      var title = info.title || C.titleFromSlug(g.slug);
      var by = e.pending ? 'Sent from this device, not confirmed yet' : info.creator ? '@' + info.creator : 'Details soon';
      if (info.plays != null) by += '. ' + fmtPlays(info.plays);
      var thumb = info.thumb ? '<img class="thumb" src="' + esc(C.smallThumb(info.thumb)) + '" alt="" width="30" height="45" loading="lazy">' :
        '<span class="thumb" aria-hidden="true"></span>';
      var when = s.ts ? 'Submitted ' + new Date(s.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
      return '<li class="game"><a href="' + esc(g.url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(when) + '">' + thumb +
        '<span class="g-text"><span class="g-title">' + esc(title) + '</span><span class="g-by">' + esc(by) + '</span></span></a></li>';
    }).join('') + '</ul>';
  }
  function submitBtn(t) {
    return '<a class="btn btn-ghost btn-small" href="submit.html?topic=' + encodeURIComponent(t.id) + '">Submit a game<span class="sr-only"> for ' + esc(t.title) + '</span></a>';
  }
  function sideHtml(t) {
    var c = countOf(t.id), tm = C.timing(t);
    if (!state) return '<div class="progress">' + C.meterHtml(0) + '<span class="meter-text loading">Loading…</span></div>';
    if (tm && tm.closed && c < T) return '';
    if (!known()) return submitBtn(t);
    var out = '<div class="progress">' + C.meterHtml(c) + '<span class="meter-text">' + C.countText(c) + '</span></div>';
    out += c >= T ? '<span class="done-mark">' + C.ICON.check + 'Complete</span>' : submitBtn(t) +
      '<a class="build-link" href="submit.html?topic=' + encodeURIComponent(t.id) + '&amp;claim=1">Building it? Tell others</a>';
    return out;
  }
  function rowClass(t) {
    var c = countOf(t.id), tm = C.timing(t);
    return 'topic' + (known() && c >= T ? ' is-complete' : '') + (tm && tm.closed && c < T ? ' is-closed' : '');
  }
  function titleRowHtml(t) {
    var tm = C.timing(t);
    return '<h3 class="topic-title">' + esc(t.title) + '</h3>' + (tm ? chipHtml(tm) : '') + '<span class="pills">' + statusPill(t) + '</span>';
  }
  function rowHtml(t) {
    return '<li class="' + rowClass(t) + '" id="t-' + esc(t.id) + '" data-id="' + esc(t.id) + '">' +
      '<div class="topic-main">' +
      '<div class="topic-title-row">' + titleRowHtml(t) + '</div>' +
      '<p class="topic-desc">' + esc(t.desc) + '</p>' +
      '<div class="games-slot">' + gamesHtml(t) + '</div>' +
      '</div>' +
      '<div class="topic-side">' + sideHtml(t) + '</div>' +
      '</li>';
  }
  function catMeta(cat) {
    if (!known()) return '';
    var st = catStats(cat);
    return st.done + ' of ' + st.total + ' complete' + (st.closed ? ', ' + st.closed + ' missed' : '');
  }
  function renderList() {
    lastHtml = {};
    $('list').innerHTML = cats.map(function (cat) {
      return '<section class="cat" id="' + cat.id + '" aria-labelledby="' + cat.id + '-h">' +
        '<header class="cat-head"><h2 id="' + cat.id + '-h">' + esc(cat.name) + '</h2><span class="cat-meta">' + catMeta(cat) + '</span></header>' +
        '<ol class="topics">' + cat.topics.map(rowHtml).join('') + '</ol></section>';
    }).join('');
  }
  // Update counts in place so focus and scroll position survive a refresh.
  function updateList() {
    cats.forEach(function (cat) {
      var sec = $(cat.id);
      if (!sec) return;
      sec.querySelector('.cat-meta').textContent = catMeta(cat);
      cat.topics.forEach(function (t) {
        var li = $('t-' + t.id);
        if (!li) return;
        var keepFlash = li.classList.contains('flash');
        li.className = rowClass(t) + (keepFlash ? ' flash' : '');
        var th = titleRowHtml(t), gh = gamesHtml(t), sh = sideHtml(t), prev = lastHtml[t.id] || {};
        if (prev.t !== th) li.querySelector('.topic-title-row').innerHTML = th;
        if (prev.g !== gh) li.querySelector('.games-slot').innerHTML = gh;
        if (prev.s !== sh) li.querySelector('.topic-side').innerHTML = sh;
        lastHtml[t.id] = { t: th, g: gh, s: sh };
      });
    });
  }

  /* ---------- Hero numbers ---------- */
  function nextDeadline() {
    var open = topics.filter(function (t) { var tm = C.timing(t); return tm && tm.state !== 'late' && !tm.closed && countOf(t.id) < T; });
    if (!open.length) return null;
    var first = open.map(function (t) { return t.ship_by; }).sort()[0];
    var same = topics.filter(function (t) { var tm = C.timing(t); return t.ship_by === first && !(tm && tm.closed && countOf(t.id) < T); });
    var cats2 = {};
    same.forEach(function (t) { cats2[t.category] = 1; });
    var names = Object.keys(cats2);
    return { date: first, total: same.length, done: same.filter(function (t) { return countOf(t.id) >= T; }).length, cat: names.length === 1 ? names[0] : null };
  }
  // Games that moved the loading bar since ms: each topic's first T games. Extra games on a complete topic don't.
  function toward(t) { return state.per[t.id].entries.slice(0, T); }
  function gamesSince(ms) {
    return topics.reduce(function (n, t) {
      return n + toward(t).filter(function (e) { return e.pending || (e.sub.ts || 0) >= ms; }).length;
    }, 0);
  }
  function renderTotals() {
    if (!state) return;
    var tt = state.totals, n = topics.length;
    $('hero-title').textContent = n + ' game topics, two games each';
    if (state.unknown) {
      $('statline').textContent = '';
      $('paceline').textContent = '';
      return;
    }
    var all = progressOf(topics);
    var html = '<b>' + all.have + '</b> of ' + all.need + ' games in. <b>' + tt.complete + '</b> of ' + n + ' topics complete. ';
    html += tt.empty ? '<b>' + tt.empty + '</b> ' + (tt.empty === 1 ? 'topic still needs' : 'topics still need') + ' a first game.' : 'Every open topic has at least one game.';
    if (tt.missed) html += ' <b>' + tt.missed + '</b> missed ' + (tt.missed === 1 ? 'its date.' : 'their dates.');
    $('statline').innerHTML = html;
    var nd = nextDeadline(), week = gamesSince(Date.now() - 7 * 86400000), pace = '';
    var overdue = topics.filter(function (t) { var tm = C.timing(t); return tm && tm.state === 'late' && countOf(t.id) < T; }).length;
    if (nd) pace = 'Next deadline ' + C.fmtDay(nd.date) + ': ' + nd.done + ' of ' + nd.total + (nd.cat ? ' ' + nd.cat + ' topics' : ' topics') + ' done. ';
    if (overdue) pace += (overdue === 1 ? '1 topic is' : overdue + ' topics are') + ' past its ship date but still open. ';
    pace += week + (week === 1 ? ' game' : ' games') + ' in the last 7 days.';
    $('paceline').textContent = pace;
    renderLatest();
  }
  // The newest games, so anyone can see what is coming in.
  function renderLatest() {
    var box = $('latest');
    var list = [];
    topics.forEach(function (t) { state.per[t.id].entries.forEach(function (e) { list.push({ e: e, t: t }); }); });
    list = list.filter(function (x) { return x.e.info && x.e.info.thumb; }).sort(function (a, b) { return (b.e.sub.ts || 0) - (a.e.sub.ts || 0); }).slice(0, 6);
    if (!list.length) { box.hidden = true; return; }
    var html = '<h2 class="latest-h">Latest games</h2><ul>' + list.map(function (x) {
      var info = x.e.info;
      return '<li><a href="' + esc(x.e.sub.game.url) + '" target="_blank" rel="noopener noreferrer"><img src="' + esc(C.smallThumb(info.thumb).replace('width=120', 'width=240')) + '" alt="" width="96" height="144" loading="lazy">' +
        '<span class="l-title">' + esc(info.title || '') + '</span><span class="l-meta">' + esc(x.t.title) + '</span><span class="l-meta">' + esc((info.creator ? '@' + info.creator : '') + (info.plays != null ? '. ' + fmtPlays(info.plays) : '')) + '</span></a></li>';
    }).join('') + '</ul>';
    if (html !== lastLatest) { box.innerHTML = html; lastLatest = html; }
    box.hidden = false;
  }

  /* ---------- Filters ---------- */
  function applyFilters() {
    var q = $('q').value.trim().toLowerCase();
    var hideDone = $('hide-done').checked;
    var shown = 0;
    cats.forEach(function (cat) {
      var visible = 0;
      cat.topics.forEach(function (t) {
        var li = $('t-' + t.id);
        if (!li) return;
        var hay = (t.title + ' ' + t.desc + ' ' + cat.name).toLowerCase();
        var tm = C.timing(t);
        var ok = (!q || hay.indexOf(q) >= 0) && !(hideDone && (countOf(t.id) >= T || (tm && tm.closed)));
        li.hidden = !ok;
        if (ok) visible += 1;
      });
      $(cat.id).hidden = visible === 0;
      shown += visible;
    });
    var empty = $('empty');
    if (!shown) {
      empty.hidden = false;
      empty.textContent = q ? 'No topics match “' + $('q').value.trim() + '”. Try a shorter word, like turkey or school.' : 'Every topic is complete or closed. Untick “Hide complete” to see them.';
    } else empty.hidden = true;
    $('result-note').textContent = (q || hideDone) ? shown + (shown === 1 ? ' topic shown' : ' topics shown') : '';
    syncUrl();
  }
  // Keep search and filter in the URL so a filtered view can be shared.
  function syncUrl() {
    if (!window.history || !history.replaceState) return;
    var p = new URLSearchParams(location.search);
    var q = $('q').value.trim();
    if (q) p.set('q', q); else p.delete('q');
    if ($('hide-done').checked) p.set('hide', '1'); else p.delete('hide');
    var qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }
  function revealTopic(id) {
    var li = $('t-' + id);
    if (!li) return;
    if (li.hidden) { $('q').value = ''; $('hide-done').checked = false; applyFilters(); }
    li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash');
    setTimeout(function () { li.classList.remove('flash'); }, 1700);
  }

  // A category bar jumps to that category's topics, clearing filters that would hide it.
  function wireBoard() {
    $('board').addEventListener('click', function (e) {
      var a = e.target.closest('.cbar');
      if (!a) return;
      var sec = document.getElementById(a.getAttribute('href').slice(1));
      if (sec && sec.hidden) { $('q').value = ''; $('hide-done').checked = false; applyFilters(); }
    });
  }

  /* ---------- Community team view (?admin) ---------- */
  var SITE = location.origin + location.pathname.replace(/[^\/]*$/, '');
  function weekStart(ms) {
    var p = C.ptParts(ms);
    var utc = Date.UTC(p.y, p.m - 1, p.d) - ((p.dow + 6) % 7) * 86400000;
    return new Date(utc).toISOString().slice(0, 10);
  }
  function completedAt(t) {
    var e = state.per[t.id].entries.filter(function (x) { return !x.pending; }).map(function (x) { return x.sub.ts || 0; }).sort(function (a, b) { return a - b; });
    return e.length >= T ? e[T - 1] : null;
  }
  // One row per Pacific week (Monday start) from the program start to this week, empty weeks included.
  function weeks() {
    var wk = {}, first = weekStart(C.endOfDayPT(C.CFG.programStart)), last = weekStart(Date.now());
    for (var d = first; d <= last; d = new Date(Date.parse(d + 'T00:00:00Z') + 7 * 86400000).toISOString().slice(0, 10)) wk[d] = { games: 0, done: 0 };
    topics.forEach(function (t) { toward(t).forEach(function (e) { if (!e.pending && e.sub.ts) { var k = weekStart(e.sub.ts); wk[k] = wk[k] || { games: 0, done: 0 }; wk[k].games += 1; } }); });
    topics.forEach(function (t) { var at = completedAt(t); if (at) { var k = weekStart(at); wk[k] = wk[k] || { games: 0, done: 0 }; wk[k].done += 1; } });
    var keys = Object.keys(wk).sort(), cum = 0;
    return keys.map(function (k) { cum += wk[k].done; return { week: k, games: wk[k].games, done: wk[k].done, cum: cum, current: k === last }; });
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function atRisk() {
    var now = Date.now();
    return topics.filter(function (t) {
      var tm = C.timing(t);
      return tm && !tm.closed && countOf(t.id) < T && C.endOfDayPT(t.ship_by) - now <= 14 * 86400000;
    }).sort(function (a, b) { return a.ship_by < b.ship_by ? -1 : 1; });
  }
  function rosterHas(handle) {
    if (!roster || !handle) return false;
    var h = '@' + String(handle).replace(/^@/, '').toLowerCase();
    return roster.some(function (r) { return r.handle.toLowerCase() === h; });
  }
  function creators() {
    var by = {}, pending = 0;
    topics.forEach(function (t) {
      state.per[t.id].entries.forEach(function (e) {
        if (!e.info || !e.info.creator) { pending += 1; return; }
        var k = e.info.creator.toLowerCase();
        by[k] = by[k] || { who: '@' + e.info.creator, games: 0, topics: [] };
        by[k].games += 1; by[k].topics.push(t.title);
      });
    });
    (roster || []).forEach(function (r) {
      var k = r.handle.slice(1).toLowerCase();
      by[k] = by[k] || { who: r.handle, games: 0, topics: [] };
      by[k].onRoster = true;
    });
    var list = Object.keys(by).map(function (k) { return { who: by[k].who, games: by[k].games, topics: by[k].topics, onRoster: !!by[k].onRoster }; })
      .sort(function (a, b) { return b.games - a.games || (a.who.toLowerCase() < b.who.toLowerCase() ? -1 : 1); });
    return { list: list, pending: pending };
  }
  function discordPost() {
    var now = new Date(), day = Math.floor(now / 86400000);
    var open = topics.filter(function (t) { var tm = C.timing(t); return countOf(t.id) < T && !(tm && tm.closed); });
    var link = function (t) {
      var tm = C.timing(t);
      return '- [' + t.title + '](<' + SITE + 'submit.html?topic=' + t.id + '>)' + (tm ? ', ' + tm.short : '');
    };
    var perCat = {}, due = [];
    open.filter(function (t) { return t.ship_by; }).sort(function (a, b) { return a.ship_by < b.ship_by ? -1 : a.ship_by > b.ship_by ? 1 : 0; })
      .forEach(function (t) { perCat[t.category] = (perCat[t.category] || 0) + 1; if (perCat[t.category] <= 2 && due.length < 5) due.push(t); });
    var anyCats = {}, any = [];
    open.filter(function (t) { return !t.ship_by; }).forEach(function (t) { (anyCats[t.category] = anyCats[t.category] || []).push(t); });
    var catNames = Object.keys(anyCats), n = catNames.length;
    catNames.forEach(function (cat, i) {
      var list = anyCats[cat].slice().sort(function (a, b) { return countOf(a.id) - countOf(b.id); });
      var low = list.filter(function (t) { return countOf(t.id) === countOf(list[0].id); });
      // rot: categories take turns day by day, so ties don't always favor the same ones
      any.push({ t: low[(day + i) % low.length], c: countOf(list[0].id), rot: (i - day % n + n) % n });
    });
    any = any.sort(function (a, b) { return a.c - b.c || a.rot - b.rot; }).slice(0, 5).map(function (x) { return x.t; });
    var lines = ['**Open topics on the Creator Topic Board**', 'Two games complete a topic. Pick one, build it, then submit your link.'];
    if (due.length) { lines.push('', '__Due soon__'); due.forEach(function (t) { lines.push(link(t)); }); }
    if (any.length) { lines.push('', '__Any time__'); any.forEach(function (t) { lines.push(link(t)); }); }
    lines.push('', 'All ' + open.length + ' open topics: <' + SITE + '>');
    var text = lines.join('\n');
    while (text.length > 1900 && lines.length > 6) { lines.splice(lines.length - 3, 1); text = lines.join('\n'); }
    return text;
  }
  function weeklySummary() {
    var w = weeks(), cur = w.filter(function (r) { return r.current; })[0], nd = nextDeadline(), risk = atRisk(), cr = creators();
    var out = ['Creator Topic Board, ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }) + ':'];
    var all = progressOf(topics), extra = state.totals.games - all.have;
    out.push('- ' + state.totals.complete + ' of ' + topics.length + ' topics complete, ' + all.have + ' of ' + all.need + ' games in' + (extra > 0 ? ' plus ' + plural(extra, 'extra game', 'extra games') + ' on complete topics' : '') + (state.totals.missed ? ', ' + state.totals.missed + ' topics missed their date' : '') + '.');
    out.push('- Last 7 days: ' + plural(gamesSince(Date.now() - 7 * 86400000), 'game', 'games') + '.' + (cur ? ' This week so far: ' + plural(cur.games, 'game', 'games') + ', ' + plural(cur.done, 'topic', 'topics') + ' completed.' : ''));
    if (nd) out.push('- Next deadline ' + C.fmtDay(nd.date) + ': ' + nd.done + ' of ' + nd.total + ' topics done.');
    if (risk.length) out.push('- At risk (due within 14 days): ' + risk.slice(0, 8).map(function (t) { return t.title + ' (' + countOf(t.id) + '/' + T + ', ' + C.fmtDay(t.ship_by) + ')'; }).join('; ') + (risk.length > 8 ? '; +' + (risk.length - 8) + ' more' : '') + '.');
    var idle = cr.list.filter(function (c) { return c.onRoster && c.games === 0; }).map(function (c) { return c.who; });
    if (roster) out.push('- Not submitted yet: ' + (idle.length ? idle.join(', ') : 'nobody') + '.');
    return out.join('\n');
  }
  function copyText(text, noteId) {
    var note = $(noteId);
    var done = function () { note.textContent = 'Copied.'; setTimeout(function () { note.textContent = ''; }, 4000); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { window.prompt('Copy this:', text); });
    else window.prompt('Copy this:', text);
  }
  var adminFilter = false, lastAdminHtml = '';
  function renderAdmin() {
    if (!adminMode || !state) return;
    var box = $('admin');
    box.hidden = false;
    var sheetUrl = 'https://docs.google.com/spreadsheets/d/' + C.CFG.sheetId + '/edit#gid=' + C.CFG.gid;
    var html = '<h2>Community team view</h2>' +
      '<p>To take a game off the board, open the <a href="' + esc(sheetUrl) + '" target="_blank" rel="noopener">submissions Sheet</a> and type <b>remove</b> in that row’s status cell. To move a game, change its topic_id cell to one of the ids at the bottom of this section. Changes show here within a minute.</p>';
    if (state.unknown) html += '<p class="notice">Counts are off because the submissions Sheet isn’t shared. Ask Mark to set the Sheet’s sharing to “Anyone with the link: Viewer”.</p>';
    else if (lastSource === 'snapshot') html += '<p class="notice">The live Sheet didn’t answer, so these numbers come from the last saved copy.</p>';
    html += '<div class="admin-tools"><button class="btn btn-ghost btn-small" type="button" id="copy-discord">Copy a Discord post of open topics</button>' +
      '<button class="btn btn-ghost btn-small" type="button" id="copy-weekly">Copy a weekly summary</button><span class="copy-note" id="copy-note" aria-live="polite"></span></div>';
    var w = weeks().slice(-8).reverse();
    html += '<h3>Week by week</h3>' + (w.length ? '<div class="table-scroll"><table class="compact"><thead><tr><th>Week of</th><th>Games in</th><th>Topics completed</th><th>Complete so far</th></tr></thead><tbody>' +
      w.map(function (r) { return '<tr><td class="num">' + esc(C.fmtDay(r.week)) + '</td><td class="num">' + r.games + '</td><td class="num">' + r.done + '</td><td class="num">' + r.cum + '</td></tr>'; }).join('') +
      '</tbody></table></div>' : '<p>No games counted yet.</p>');
    var risk = atRisk();
    html += '<h3>Due within 14 days and not complete</h3>' + (risk.length ? '<ul class="plain">' + risk.map(function (t) {
      return '<li><a href="#t-' + esc(t.id) + '">' + esc(t.title) + '</a>: ' + countOf(t.id) + ' of ' + T + ', ship by ' + esc(C.fmtDay(t.ship_by)) + '</li>';
    }).join('') + '</ul>' : '<p>Nothing due in the next 14 days.</p>');
    var cr = creators();
    html += '<h3>Creators</h3>';
    if (!roster) html += '<p>To see who hasn’t submitted yet, fill in the <b>roster</b> tab of the submissions Sheet: one Astrocade handle per row under <b>handle</b>. Anyone with the Sheet’s link, or this page’s link, can see the roster.</p>';
    html += cr.list.length ? '<div class="table-scroll"><table class="compact"><thead><tr><th>Creator</th><th>Games counted</th><th>Topics</th></tr></thead><tbody>' +
      cr.list.map(function (c) {
        return '<tr><td>' + esc(c.who) + (roster && !c.onRoster ? '<br><span class="flag">not on roster</span>' : '') + '</td><td class="num">' + c.games + '</td><td>' +
          (c.topics.length ? '<ul class="plain">' + c.topics.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<span class="flag">nothing yet</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '';
    if (cr.pending) html += '<p>' + cr.pending + (cr.pending === 1 ? ' game is' : ' games are') + ' waiting for creator details. They fill in within 15 minutes.</p>';
    var cl = (state.claims || []).slice().reverse().filter(function (c) { return c.active || c.why !== 'expired'; });
    html += '<h3>Building now</h3>' + (cl.length ? '<p>Creators who said they’re building a topic. A claim lasts ' + C.CFG.claimHours + ' hours, and each creator can hold ' + C.CFG.claimsPerHandle + ' at once. To clear one, type <b>remove</b> in its status cell (find it by its code).</p>' +
      '<div class="table-scroll"><table class="compact"><thead><tr><th>Topic</th><th>Creator</th><th>Claimed</th><th>Status</th><th>Code</th></tr></thead><tbody>' +
      cl.map(function (c) {
        return '<tr><td>' + esc(c.topic ? c.topic.title : c.sub.topicId) + '</td><td>' + esc(c.sub.handle || '') + '</td><td class="num">' + esc(c.sub.ts ? C.timeAgo(c.sub.ts) : '') + '</td><td>' +
          (c.active ? '<span class="flag ok">active</span>' : '<span class="flag">' + esc(c.why) + '</span>') + '</td><td class="num">' + esc(c.sub.subId || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<p>Nobody has said they’re building a topic.</p>');
    var rows = state.all.slice().reverse();
    rows.forEach(function (e) {
      var who = e.info && e.info.creator;
      e.notes = e.notes.filter(function (n) { return n !== 'not on roster'; });
      if (roster && e.counted && who && !rosterHas(who)) e.notes.push('not on roster');
    });
    var attention = rows.filter(function (e) { return !e.counted || e.notes.length; });
    html += '<h3>Submissions</h3><p>' + rows.length + ' rows. ' + attention.length + ' need a look.</p>' +
      '<label class="check"><input type="checkbox" id="only-attention"' + (adminFilter ? ' checked' : '') + '> Only rows that need a look</label>' +
      '<div class="table-scroll"><table><thead><tr><th>Submitted</th><th>Topic</th><th>Game</th><th>Creator</th><th>Published</th><th>Status</th><th>Code</th></tr></thead><tbody>' +
      (adminFilter ? attention : rows).map(function (e) {
        var s2 = e.sub, info = e.info || {}, t = state.byId[s2.topicId];
        var game = s2.game ? '<a href="' + esc(s2.game.url) + '" target="_blank" rel="noopener">' + esc(info.title || C.titleFromSlug(s2.game.slug)) + '</a>' : esc(s2.gameUrlRaw || '(blank)');
        var flags = e.flags.length ? e.flags.map(function (f) { return '<span class="flag">' + esc(f) + '</span>'; }).join('') : '<span class="flag ok">counted</span>';
        flags += e.notes.map(function (f) { return '<span class="flag">' + esc(f) + '</span>'; }).join('');
        return '<tr><td class="num">' + (s2.ts ? esc(new Date(s2.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) : '') + (s2.row ? '<br>row ' + s2.row : '') + '</td>' +
          '<td>' + esc(t ? t.title : s2.topicId || '(blank)') + '</td><td>' + game + (info.plays != null ? '<br><span class="muted">' + esc(fmtPlays(info.plays)) + '</span>' : '') + '</td>' +
          '<td>' + esc(info.creator ? '@' + info.creator : '') + '</td>' +
          '<td class="num">' + esc(info.published ? info.published.slice(0, 10) : '') + '</td><td>' + flags + '</td><td class="num">' + esc(s2.subId || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    html += '<p class="muted">To close a topic or move its ship-by date, add a row to the Sheet’s <b>topics</b> tab: the topic id, then “yes” under closed, or a new date (YYYY-MM-DD) under ship_by. ' +
      (Object.keys(closedIds).length ? 'Closed now: ' + esc(Object.keys(closedIds).join(', ')) + '. ' : '') +
      (Object.keys(movedIds).length ? 'Dates moved: ' + esc(Object.keys(movedIds).map(function (k) { return k + ' to ' + C.fmtDay(movedIds[k]); }).join(', ')) + '.' : '') + '</p>';
    html += '<details class="ids"><summary>Topic ids, for moving a game to another topic</summary><div class="table-scroll"><table class="compact"><thead><tr><th>topic_id</th><th>Topic</th><th>Category</th><th>Games</th></tr></thead><tbody>' +
      topics.map(function (t) { return '<tr><td><code>' + esc(t.id) + '</code></td><td>' + esc(t.title) + '</td><td>' + esc(t.category) + '</td><td class="num">' + countOf(t.id) + '</td></tr>'; }).join('') +
      '</tbody></table></div></details>';
    if (html === lastAdminHtml) return;
    lastAdminHtml = html;
    var scrolls = Array.prototype.map.call(box.querySelectorAll('.table-scroll'), function (el) { return el.scrollLeft; });
    var focusId = document.activeElement && box.contains(document.activeElement) ? document.activeElement.id : '';
    var openIds = box.querySelector('details.ids') && box.querySelector('details.ids').open;
    box.innerHTML = html;
    Array.prototype.forEach.call(box.querySelectorAll('.table-scroll'), function (el, i) { if (scrolls[i]) el.scrollLeft = scrolls[i]; });
    if (openIds) box.querySelector('details.ids').open = true;
    if (focusId && $(focusId)) $(focusId).focus();
    $('copy-discord').addEventListener('click', function () { copyText(discordPost(), 'copy-note'); });
    $('copy-weekly').addEventListener('click', function () { copyText(weeklySummary(), 'copy-note'); });
    $('only-attention').addEventListener('change', function (e) { adminFilter = e.target.checked; renderAdmin(); });
  }
  function loadRoster() {
    if (!adminMode) return Promise.resolve();
    return C.loadSheetRows('roster').then(function (res) {
      if (!res.ok) { roster = null; return; }
      var list = res.rows.map(function (r) {
        var h = String(r.handle || '').trim().replace(/^@?/, '@');
        return h.length > 1 ? { handle: h } : null;
      }).filter(Boolean);
      roster = list.length ? list : null;
    });
  }

  /* ---------- Data refresh ---------- */
  function setNotice(msg) {
    var n = $('notice');
    if (msg) { n.textContent = msg; n.hidden = false; } else n.hidden = true;
  }
  function refresh() {
    return Promise.all([C.loadSheetRows(), C.loadGames(), loadRoster(), C.loadSheetRows('topics')]).then(function (res) {
      var live = res[0];
      games = res[1] || {};
      var ov = C.applyOverrides(baseTopics, res[3] && res[3].ok ? res[3].rows : null);
      topics = ov.topics; closedIds = ov.closed; movedIds = ov.moved;
      if (live.ok) { lastSource = live.source; return { rows: live.rows, source: live.source }; }
      lastSource = live.reason;
      return C.loadSnapshot().then(function (snap) {
        if (snap && snap.rows) return { rows: snap.rows, source: 'snapshot', updated: snap.updated };
        return { rows: null, source: 'none' };
      });
    }).then(function (data) {
      lastChecked = Date.now();
      if (data.source === 'snapshot') lastSource = 'snapshot';
      if (data.rows) {
        var subs = C.normalizeRows(data.rows);
        state = C.computeState(topics, subs, games, C.prunePending(subs, data.source === 'live'), null, closedIds);
        setNotice(data.source === 'snapshot' ? 'Live counts are taking a moment. Showing counts from ' + (data.updated ? C.timeAgo(Date.parse(data.updated)) : 'earlier') + '.' : '');
      } else {
        state = C.computeState(topics, [], games, C.getPending(), null, closedIds);
        state.unknown = true;
        setNotice('Progress counts aren’t showing yet, so every topic looks open. Check the creator Discord before you start one. You can still submit your game.');
      }
      var next = categories(), sig = next.map(function (c) { return c.name + ':' + c.topics.map(function (t) { return t.id + '@' + (t.ship_by || ''); }).join(','); }).join('|');
      if (sig !== catSig) { cats = next; catSig = sig; buildBoard(); renderList(); }
      updateBoard();
      updateList();
      renderTotals();
      applyFilters();
      renderAdmin();
      $('checked-at').textContent = 'Last checked ' + C.clock(lastChecked) + '.';
    });
  }

  function start() {
    C.loadTopics().then(function (list) {
      baseTopics = list;
      topics = list;
      cats = categories();
      catSig = '';
      buildBoard();
      renderList();
      wireBoard();
      if (adminMode) { var a = $('admin'); $('admin-slot').appendChild(a); }
      if (C.params.get('q')) $('q').value = C.params.get('q');
      if (C.params.get('hide') === '1') $('hide-done').checked = true;
      $('q').addEventListener('input', applyFilters);
      $('hide-done').addEventListener('change', applyFilters);
      $('refresh-now').addEventListener('click', function () { refresh().catch(function () {}); });
      return refresh().catch(function (err) {
        setNotice('Progress counts didn’t load. The topic list is up to date. Try Refresh now at the bottom of the page.');
        if (window.console) console.error(err);
      });
    }, function (err) {
      $('list').innerHTML = '<p class="empty">The topic list didn’t load. Refresh the page to try again.</p>';
      if (window.console) console.error(err);
      throw err;
    }).then(function () {
      if (location.hash) {
        var el = document.getElementById(location.hash.slice(1));
        if (location.hash.indexOf('#t-') === 0) revealTopic(location.hash.slice(3));
        if (el) el.scrollIntoView();
      }
      var quiet = function () { refresh().catch(function () { /* next tick retries */ }); };
      setInterval(function () { if (!document.hidden) quiet(); }, C.CFG.refreshMs);
      document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - lastChecked > 15000) quiet(); });
    }).catch(function () { /* already reported above */ });
  }
  start();
})();
