/* Creator Topic Board: submission form. */
(function () {
  'use strict';
  var C = window.CTB, esc = C.esc, T = C.CFG.target;
  var $ = function (id) { return document.getElementById(id); };
  var baseTopics = [], topics = [], byId = {}, closedIds = {}, state = null, sending = false;
  var CLAIMS = 'ctb.claims.v1', HANDLE = 'ctb.handle.v1';

  function countOf(id) { return state && state.per[id] ? state.per[id].count : 0; }
  function known() { return state && !state.unknown; }

  function optionText(t) {
    var c = countOf(t.id), tm = C.timing(t);
    if (known() && c >= T) return t.title + ' (complete)';
    if (tm && tm.closed) return t.title + ' (date has passed)';
    var bits = [];
    if (known()) bits.push(c + ' of ' + T);
    if (tm) bits.push(tm.short);
    return t.title + (bits.length ? ' (' + bits.join(', ') + ')' : '');
  }
  function buildOptions() {
    var sel = $('topic'), current = sel.value || C.params.get('topic') || '';
    var cats = C.orderCategories(topics, known() ? state : null);
    sel.innerHTML = '<option value="" disabled>Choose a topic</option>' + cats.map(function (g) {
      return '<optgroup label="' + esc(g.name) + '">' + g.topics.map(function (t) {
        return '<option value="' + esc(t.id) + '">' + esc(optionText(t)) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
    sel.value = byId[current] ? current : '';
    if (!sel.value) sel.selectedIndex = 0;
    if (!sel.value && closedIds[current]) { $('topic-msg').textContent = 'That topic is closed. Pick another one.'; $('topic-msg').className = 'field-msg warn'; }
  }

  /* ---------- "I'm building this" claims ---------- */
  function myClaims() {
    try { var a = JSON.parse(localStorage.getItem(CLAIMS) || '{}'); return a && typeof a === 'object' ? a : {}; } catch (e) { return {}; }
  }
  function claimedHere(id) {
    var at = myClaims()[id];
    return at && Date.now() - at < C.CFG.claimHours * 3600000;
  }
  var claimOpened = false;
  function savedHandle() { try { return localStorage.getItem(HANDLE) || ''; } catch (e) { return ''; } }
  function claim(t) {
    var input = $('claim-handle'), note = $('claim-note'), btn = $('claim-send');
    var h = String(input.value || '').trim().replace(/^@/, '');
    if (!/^[A-Za-z0-9_.-]{2,30}$/.test(h)) { note.textContent = 'Type your Astrocade handle, the name after @ on your profile.'; input.focus(); return; }
    btn.disabled = true;
    C.postSubmission({ topic_id: t.id, topic_title: t.title, game_url: 'claim', handle: '@' + h, submission_id: 'c-' + C.newSubmissionId().slice(2) }).then(function () {
      var a = myClaims(); a[t.id] = Date.now();
      try { localStorage.setItem(CLAIMS, JSON.stringify(a)); localStorage.setItem(HANDLE, h); } catch (e) { /* storage blocked */ }
      $('claim-box').innerHTML = '<p class="claim-note">Thanks, @' + esc(h) + '. For the next ' + C.CFG.claimHours / 24 + ' days the board shows that someone is building this topic.</p>';
    }).catch(function () {
      note.textContent = 'That didn’t go through. Check your connection and try again.';
      btn.disabled = false;
    });
  }
  function openClaim(t) {
    var box = $('claim-box');
    box.innerHTML = '<label class="claim-label" for="claim-handle">Your Astrocade handle</label>' +
      '<div class="claim-row"><input class="text-input small" id="claim-handle" autocomplete="nickname" autocapitalize="off" spellcheck="false" placeholder="@yourhandle" value="' + esc(savedHandle() ? '@' + savedHandle() : '') + '">' +
      '<button class="btn btn-ghost btn-small" type="button" id="claim-send">Tell others</button></div>' +
      '<p class="claim-note" id="claim-note" aria-live="polite">Others see “1 building” on this topic for ' + C.CFG.claimHours / 24 + ' days. Your newest ' + C.CFG.claimsPerHandle + ' claims show at a time.</p>';
    $('claim-send').addEventListener('click', function () { claim(t); });
    $('claim-handle').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); claim(t); } });
    $('claim-handle').focus();
  }

  function renderTopicCard() {
    var t = byId[$('topic').value], card = $('topic-card'), btn = $('submit');
    if (t) $('topic-msg').textContent = '';
    if (!t) { card.hidden = true; btn.textContent = 'Submit game'; return; }
    var c = countOf(t.id), tm = C.timing(t), b = known() && state.per[t.id] ? state.per[t.id].building : 0;
    var status = known() ? '<span class="progress">' + C.meterHtml(c) + '<span class="meter-text">' + C.countText(c) + '</span></span>' : '';
    var warn = '';
    if (known() && c >= T) warn = 'This topic already has ' + T + ' games, so it’s complete. Pick an open topic if you can. You can still submit this one.';
    else if (tm && tm.closed) warn = tm.label + ', so this topic is closed. You can still submit, but an open topic will reach more players.';
    else if (b > 0) warn = (b === 1 ? 'Someone says they’re' : b + ' creators say they’re') + ' building this right now. You can still make one, or pick a topic nobody has started.';
    var canClaim = known() && c < T && !(tm && tm.closed);
    var mine = C.getHistory().filter(function (h) { return h.topicId === t.id; }).length;
    if (!warn && mine && C.CFG.onePerCreator) warn = 'You already sent a game for this topic from this device. Only one game per creator counts on each topic, so pick another topic if you can.';
    card.innerHTML = '<div class="tc-head"><span class="tc-cat">' + esc(t.category) + (tm ? ' <span class="chip ' + C.chipClass(tm) + '">' + esc(tm.label) + '</span>' : '') + '</span>' + status + '</div>' +
      '<p>' + esc(t.desc) + '</p>' + C.refsHtml(t.refs) + (warn ? '<p class="warn">' + esc(warn) + '</p>' : '') +
      (canClaim ? '<div class="claim" id="claim-box">' + (claimedHere(t.id) ? '<p class="claim-note">You told others you’re building this.</p>' :
        '<button class="linkish" type="button" id="claim-btn">Not finished yet? Tell others you’re building this</button>') + '</div>' : '');
    card.hidden = false;
    btn.textContent = (known() && c >= T) || (tm && tm.closed) ? 'Submit anyway' : 'Submit game';
    var cb = $('claim-btn');
    if (cb) cb.addEventListener('click', function () { openClaim(t); });
    if (cb && C.params.get('claim') === '1' && !claimOpened) { claimOpened = true; openClaim(t); }
  }

  // Returns {ok, game, msg, level}
  function checkGame(show) {
    var input = $('game'), msg = $('game-msg');
    var g = C.parseGameUrl(input.value), res;
    if (g.error === 'empty') res = { ok: false, msg: 'Paste your game link.', level: 'error' };
    else if (g.error === 'host') res = { ok: false, msg: 'That link isn’t on astrocade.com. Paste the link to your game’s page on Astrocade.', level: 'error' };
    else if (g.error === 'other-page') res = { ok: false, msg: 'That’s an Astrocade link, but not a game page. Open your game on Astrocade and copy that page’s link. It contains /games/.', level: 'error' };
    else if (g.error) res = { ok: false, msg: 'That isn’t a game page link. It should look like astrocade.com/games/your-game/ followed by a 26-character code.', level: 'error' };
    else {
      var dup = state && state.seenGame[g.id];
      if (dup && dup.pending) {
        res = { ok: true, game: g, msg: 'You sent this game a few minutes ago. If it isn’t on the board yet, you can send it again.', level: 'warn' };
      } else if (dup) {
        var dt = byId[dup.topicId];
        res = { ok: false, msg: 'This game is already on the board' + (dt ? ' for “' + dt.title + '”' : '') + '. If that’s the wrong topic, ask the community team on Discord to move it.', level: 'error' };
      } else res = { ok: true, game: g, msg: 'Game link looks right.', level: 'ok' };
    }
    if (show) {
      msg.textContent = res.msg;
      msg.className = 'field-msg ' + res.level;
      input.classList.toggle('invalid', !res.ok);
      input.classList.toggle('valid', res.ok);
      input.setAttribute('aria-invalid', res.ok ? 'false' : 'true');
    }
    return res;
  }
  function clearGameMsg() {
    var input = $('game');
    $('game-msg').textContent = '';
    input.classList.remove('invalid', 'valid');
    input.removeAttribute('aria-invalid');
  }

  function loadState() {
    return Promise.all([C.loadSheetRows(), C.loadGames(), C.loadSheetRows('topics')]).then(function (res) {
      var live = res[0], games = res[1];
      var ov = C.applyOverrides(baseTopics, res[2] && res[2].ok ? res[2].rows : null);
      topics = ov.topics; closedIds = ov.closed; byId = {};
      topics.forEach(function (t) { byId[t.id] = t; });
      var rowsPromise = live.ok ? Promise.resolve(live.rows) : C.loadSnapshot().then(function (s) { return s && s.rows ? s.rows : null; });
      return rowsPromise.then(function (rows) {
        var subs = C.normalizeRows(rows || []);
        state = C.computeState(topics, subs, games, C.prunePending(subs, live.ok), null, closedIds);
        state.unknown = !rows;
        return live;
      });
    });
  }

  function showSuccess(t, g, before, subId) {
    var after = before + 1, full = after >= T, line;
    if (!known()) line = 'Your game for “' + t.title + '” was sent. It shows on the board once counts are live.';
    else if (full) line = before >= T ? '“' + t.title + '” now has ' + after + ' games.' : '“' + t.title + '” now has ' + T + ' of ' + T + ' games. This topic is complete.';
    else line = '“' + t.title + '” now has ' + after + ' of ' + T + ' games. One more game completes it.';
    var segs = '';
    for (var i = 0; i < T; i++) segs += '<i class="' + (i < before ? 'on' : '') + '"></i>';
    var box = $('success');
    box.innerHTML = '<h2>' + (known() ? 'Game submitted' : 'Game sent') + '</h2><p>' + esc(line) + '</p>' +
      (known() ? '<div class="big-meter" id="big-meter" aria-hidden="true">' + segs + '</div>' : '') +
      '<p class="confirm" id="confirm"><span class="spinner" aria-hidden="true"></span>Adding it to the board…</p>' +
      '<p class="game-preview">Your game: <a href="' + esc(g.url) + '" target="_blank" rel="noopener noreferrer">' + esc(C.titleFromSlug(g.slug)) + '</a></p>' +
      '<p class="refcode">Reference code <code>' + esc(subId) + '</code>. Quote it if you ask the community team about this submission.</p>' +
      '<div class="actions"><a class="btn btn-primary" href="./#t-' + encodeURIComponent(t.id) + '">See it on the board</a>' +
      '<button class="btn btn-ghost" type="button" id="again">Submit another game</button></div>';
    $('form').hidden = true;
    box.hidden = false;
    box.focus();
    setTimeout(function () {
      var m = $('big-meter');
      if (!m) return;
      var segsEl = m.querySelectorAll('i');
      if (segsEl[Math.min(before, T - 1)]) segsEl[Math.min(before, T - 1)].classList.add('on');
      if (full) setTimeout(function () { m.classList.add('full'); }, 450);
    }, 250);
    $('again').addEventListener('click', resetForm);
  }

  function confirmOnBoard(subId) {
    var tries = 0, el = function () { return $('confirm'); };
    function done(state2) {
      var c = el(); if (!c) return;
      if (state2 === 'ok') { c.className = 'confirm ok'; c.innerHTML = C.ICON.check + 'It’s on the board.'; }
      else if (state2 === 'missing') { c.className = 'confirm warn'; c.textContent = 'It isn’t on the board yet. If it doesn’t show up in a few minutes, post your game link and the code below in the creator Discord.'; }
      else { c.className = 'confirm'; c.textContent = 'Sent, not yet confirmed. The board can’t show counts right now.'; }
    }
    function tick() {
      tries += 1;
      C.loadSheetRows().then(function (live) {
        if (!live.ok) return done('unknown');
        var found = live.rows.some(function (r) { return String(r.submission_id || '') === subId; });
        if (found) return done('ok');
        if (tries < 10) setTimeout(tick, 3000); else done('missing');
      });
    }
    setTimeout(tick, 2500);
  }

  function historyStatus(h) {
    if (!known()) return '';
    var hit = state.all.filter(function (e) { return e.sub.subId === h.subId; })[0];
    if (!hit) return C.getPending().some(function (p) { return p.subId === h.subId; }) ? 'Sent' : '';
    if (hit.counted) return 'Counted';
    return 'Not counted: ' + hit.flags.map(C.reasonText).join('; ');
  }
  function renderHistory() {
    var list = C.getHistory(), box = $('history');
    if (!list.length) { box.hidden = true; return; }
    box.innerHTML = '<h2 id="history-h">Your submissions from this device</h2><ul>' + list.slice(0, 12).map(function (h) {
      var st = historyStatus(h);
      return '<li><span><a href="' + esc(h.gameUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(h.gameTitle) + '</a> for ' + esc(h.topicTitle) + (st ? '. ' + esc(st) : '') + '</span><span class="h-when">' + esc(C.timeAgo(h.at)) + ' <code>' + esc(h.subId) + '</code></span></li>';
    }).join('') + '</ul>';
    box.hidden = false;
  }

  function resetForm() {
    $('success').hidden = true;
    $('form').hidden = false;
    $('game').value = '';
    clearGameMsg();
    $('form-msg').textContent = '';
    loadState().then(function () { buildOptions(); renderTopicCard(); renderHistory(); });
    $('topic').focus();
  }

  function onSubmit(e) {
    e.preventDefault();
    if (sending) return;
    var t = byId[$('topic').value], formMsg = $('form-msg');
    formMsg.textContent = ''; formMsg.className = 'form-msg';
    if (!t) { $('topic-msg').textContent = 'Choose the topic your game is for.'; $('topic-msg').className = 'field-msg error'; $('topic').focus(); return; }
    var g = checkGame(true);
    if (!g.ok) { $('game').focus(); return; }
    sending = true;
    var btn = $('submit'), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Submitting…';
    var subId = C.newSubmissionId(), before = countOf(t.id);
    C.postSubmission({ topic_id: t.id, topic_title: t.title, game_url: g.game.url, submission_id: subId }).then(function () {
      C.addPending({ subId: subId, topicId: t.id, gameId: g.game.id, gameUrl: g.game.url, at: Date.now() });
      C.addHistory({ subId: subId, topicId: t.id, topicTitle: t.title, gameUrl: g.game.url, gameTitle: C.titleFromSlug(g.game.slug), at: Date.now() });
      renderHistory();
      showSuccess(t, g.game, before, subId);
      confirmOnBoard(subId);
    }).catch(function () {
      formMsg.textContent = 'Your game wasn’t sent. Check your internet connection and try again.';
      formMsg.className = 'form-msg error';
    }).then(function () {
      sending = false; btn.disabled = false; btn.textContent = label;
    });
  }

  C.loadTopics().then(function (list) {
    baseTopics = list;
    topics = list;
    topics.forEach(function (t) { byId[t.id] = t; });
    buildOptions();
    renderTopicCard();
    renderHistory();
    $('topic').addEventListener('change', function () { renderTopicCard(); if ($('game').value.trim()) checkGame(true); });
    $('game').addEventListener('blur', function () { if ($('game').value.trim()) checkGame(true); });
    $('game').addEventListener('input', function () {
      var shown = $('game').classList.contains('invalid') || $('game').classList.contains('valid');
      if (shown || !C.parseGameUrl($('game').value).error) checkGame(true);
    });
    $('form').addEventListener('submit', onSubmit);
    return loadState();
  }).then(function () {
    buildOptions();
    renderTopicCard();
    renderHistory();
    if ($('game').value.trim()) checkGame(true);
  }).catch(function () {
    $('form-msg').textContent = 'The topic list didn’t load. Refresh the page to try again.';
    $('form-msg').className = 'form-msg error';
  });
})();
