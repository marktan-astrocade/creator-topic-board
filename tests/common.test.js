// Unit tests for common.js pure logic under node with browser stubs.
global.window = global; global.location = { search: '', hostname: 'example.github.io', origin: 'https://x', pathname: '/' };
const store = {}; global.localStorage = { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } };
let fetchText = '';
global.fetch = async (url) => ({ ok: true, text: async () => fetchText, json: async () => JSON.parse(fetchText) });
require(require('path').join(__dirname, '..', 'site', 'assets', 'common.js'));
const C = window.CTB; let fails = 0;
const eq = (a, b, m) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { fails++; console.log('FAIL', m, JSON.stringify(a), '!=', JSON.stringify(b)); } else console.log('ok  ', m); };
// URL parsing
eq(C.parseGameUrl('https://www.astrocade.com/games/skyscraper-sniper/01KZYWEY8Z0EQNGGVB650H21PZ').id, '01KZYWEY8Z0EQNGGVB650H21PZ', 'plain link');
eq(C.parseGameUrl('astrocade.com/games/a-b/01kzyweY8z0eqnggvb650h21pz?utm=1').url, 'https://www.astrocade.com/games/a-b/01KZYWEY8Z0EQNGGVB650H21PZ', 'no scheme, lower ulid, query');
eq(C.parseGameUrl('https://www.astrocade.com/games/x/01KZYWEY8Z0EQNGGVB650H21PZ/').id, '01KZYWEY8Z0EQNGGVB650H21PZ', 'trailing slash');
eq(C.parseGameUrl('https://www.youtube.com/watch?v=1').error, 'host', 'other host');
eq(C.parseGameUrl('https://www.astrocade.com/profile/IVEN_k').error, 'other-page', 'profile link');
eq(C.parseGameUrl('my game: https://www.astrocade.com/games/a-b/01KZYWEY8Z0EQNGGVB650H21PZ.').id, '01KZYWEY8Z0EQNGGVB650H21PZ', 'link inside text with trailing period');
eq(C.parseGameUrl('(https://www.astrocade.com/games/a-b/01KZYWEY8Z0EQNGGVB650H21PZ)').id, '01KZYWEY8Z0EQNGGVB650H21PZ', 'link in parentheses');
eq(C.parseGameUrl('https://www.astrocade.com/share/01kzyweY8z0eqnggvb650h21pz?score=10').url, 'https://www.astrocade.com/games/game/01KZYWEY8Z0EQNGGVB650H21PZ', 'score-share link');
eq(C.parseGameUrl('https://www.astrocade.com/games/a-b/01KZYWEY8Z0EQNGGVB650H21PZ/v/3').id, '01KZYWEY8Z0EQNGGVB650H21PZ', 'version link');
eq(C.parseGameUrl('https://www.astrocade.com/create/edit?g=01KZYWEY8Z0EQNGGVB650H21PZ').id, '01KZYWEY8Z0EQNGGVB650H21PZ', 'creator hub link');
eq(C.parseGameUrl('').error, 'empty', 'empty');
eq(C.parseGameUrl('https://www.astrocade.com/games/%E0%A4%A/01KZYWEY8Z0EQNGGVB650H21PZ').id, '01KZYWEY8Z0EQNGGVB650H21PZ', 'bad percent-encoding');
// gviz date in PT, across DST end (Nov 1 2026 2am)
eq(new Date(C.parseGvizDate('Date(2026,9,28,0,34,39)')).toISOString(), '2026-10-28T07:34:39.000Z', 'PDT date');
eq(new Date(C.parseGvizDate('Date(2026,10,15,12,0,0)')).toISOString(), '2026-11-15T20:00:00.000Z', 'PST date');
// loading bar: games toward the goal, extra games on a complete topic don't add
const per = { a: { count: 3 }, b: { count: 1 }, c: { count: 0 } };
const pr = C.progress([{ id: 'a' }, { id: 'b' }, { id: 'c' }], per);
eq([pr.have, pr.need], [3, 6], 'progress caps each topic at two games');
eq(C.pctText(pr), '50%', 'percent text');
eq(C.pctText(C.progress([{ id: 'x' }], null)), '0%', 'no counts means 0%');
eq(C.pctText({ have: 1, need: 200, pct: 0.005 }), '1%', 'one game shows 1%, not 0%');
eq(C.pctText({ have: 199, need: 200, pct: 0.995 }), '99%', '199 of 200 shows 99%, not 100%');
eq(C.pctText({ have: 200, need: 200, pct: 1 }), '100%', 'all in shows 100%');
// timing
const t = { ship_by: '2026-11-15', event: '2026-11-26', event_name: 'Thanksgiving' };
eq(C.timing(t, Date.parse('2026-10-28T08:00:00Z')).label, 'Ship by Nov 15', 'open');
eq(C.timing(t, Date.parse('2026-11-10T08:00:00Z')).state, 'soon', 'soon within 7 days');
eq(C.timing(t, Date.parse('2026-11-16T09:00:00Z')).state, 'late', 'late after ship-by (PT end of day)');
eq(C.timing(t, Date.parse('2026-11-16T07:00:00Z')).state, 'soon', 'still Nov 15 in PT');
eq(C.timing(t, Date.parse('2026-11-27T09:00:00Z')).state, 'over', 'after event');
// gviz parse via loadSheetRows
fetchText = '/*O_o*/\ngoogle.visualization.Query.setResponse(' + JSON.stringify({ version: '0.6', status: 'ok', table: { cols: [{ label: 'Timestamp' }, { label: 'topic_id' }, { label: 'topic_title' }, { label: 'game_url' }, { label: 'discord' }, { label: 'submission_id' }, { label: 'status' }], rows: [
  { c: [{ v: 'Date(2026,9,28,0,34,39)', f: '10/28/2026 0:34:39' }, { v: 'turkey-trot' }, { v: 'Turkey Trot 5K' }, { v: 'https://www.astrocade.com/games/a/01KZYWEY8Z0EQNGGVB650H21PZ' }, null, { v: 's-1' }, null] },
  { c: [{ v: 'Date(2026,9,28,1,0,0)' }, { v: 'pie-slicer' }, null, { v: 'https://www.astrocade.com/games/b/01KZYWEY8Z0EQNGGVB650H21PZ' }, null, { v: 's-2' }, null] },
  { c: [{ v: 'Date(2026,9,28,2,0,0)' }, { v: 'pie-slicer' }, null, { v: 'https://www.astrocade.com/games/c/01KZYWEY8Z0EQNGGVB650H21PQ' }, null, { v: 's-3' }, { v: 'Remove' }] },
  { c: [{ v: 'Date(2026,9,28,3,0,0)' }, { v: 'nope' }, null, { v: 'https://www.astrocade.com/games/c/01KZYWEY8Z0EQNGGVB650H21PR' }, null, { v: 's-4' }, null] },
] } }) + ');';
C.loadSheetRows().then(res => {
  eq(res.ok, true, 'gviz ok');
  eq(res.rows.length, 4, 'gviz rows');
  eq(res.rows[0].topic_id, 'turkey-trot', 'gviz label mapping');
  const topics = [{ id: 'turkey-trot' }, { id: 'pie-slicer' }];
  const st = C.computeState(topics, C.normalizeRows(res.rows), {}, []);
  eq(st.per['turkey-trot'].count, 1, 'count turkey');
  eq(st.per['pie-slicer'].count, 0, 'duplicate + removed not counted');
  eq(st.all.map(e => e.flags.join('|')), ['', 'duplicate', 'removed', 'unknown topic'], 'flags');
  // only a status that starts with "remove" uncounts; other notes are ignored
  const rows2 = C.normalizeRows([{ _row: 2, timestamp: 'Date(2026,9,28,0,0,0)', topic_id: ' Pie-Slicer ', game_url: 'https://www.astrocade.com/games/b/01KZYWEY8Z0EQNGGVB650H21PT', submission_id: 'x', status: 'checked, not spam' }]);
  eq(C.computeState(topics, rows2, {}, []).per['pie-slicer'].count, 1, 'notes in status do not uncount; topic id trimmed and lower-cased');
  // games published before the program start do not count
  const old = { '01KZYWEY8Z0EQNGGVB650H21PT': { ok: true, published: '2026-08-14T00:59:52.000Z', creator: 'a' } };
  eq(C.computeState(topics, rows2, old, []).all[0].flags[0], 'made before Oct 27', 'old game flagged');
  // claims show as building and are not counted
  const now = Date.parse('2026-10-28T12:00:00Z');
  const claimRows = C.normalizeRows([{ _row: 2, timestamp: 'Date(2026,9,28,0,0,0)', topic_id: 'pie-slicer', game_url: 'claim', handle: 'maker', submission_id: 'c-1' }]);
  const st3 = C.computeState(topics, claimRows, {}, [], now);
  eq([st3.per['pie-slicer'].count, st3.per['pie-slicer'].building], [0, 1], 'claim shows as building');
  eq(C.computeState(topics, claimRows, {}, [], now + 4 * 86400000).per['pie-slicer'].building, 0, 'claim expires after 72 hours');
  const anon = C.normalizeRows([{ _row: 2, timestamp: 'Date(2026,9,28,0,0,0)', topic_id: 'pie-slicer', game_url: 'claim', submission_id: 'c-2' }]);
  eq(C.computeState(topics, anon, {}, [], now).per['pie-slicer'].building, 0, 'claim without a handle is ignored');
  const many = C.normalizeRows(['turkey-trot', 'pie-slicer', 'turkey-trot'].map((t, i) => ({ _row: i + 2, timestamp: 'Date(2026,9,28,0,' + i + ',0)', topic_id: t, game_url: 'claim', handle: '@Same', submission_id: 'c' + i })));
  const stm = C.computeState(topics, many, {}, [], now);
  eq([stm.per['turkey-trot'].building, stm.per['pie-slicer'].building], [1, 1], 'one handle keeps two claims');
  eq(stm.claims.filter(c => c.active).map(c => c.sub.subId), ['c1', 'c2'], 'the newest two claims per handle stay active');
  // one game per creator per topic
  const two = C.normalizeRows([
    { _row: 2, timestamp: 'Date(2026,9,28,1,0,0)', topic_id: 'pie-slicer', game_url: 'https://www.astrocade.com/games/a/01KZYWEY8Z0EQNGGVB650H21PA' },
    { _row: 3, timestamp: 'Date(2026,9,28,2,0,0)', topic_id: 'pie-slicer', game_url: 'https://www.astrocade.com/games/b/01KZYWEY8Z0EQNGGVB650H21PB' }]);
  const g2 = { '01KZYWEY8Z0EQNGGVB650H21PA': { ok: true, creator: 'Maker' }, '01KZYWEY8Z0EQNGGVB650H21PB': { ok: true, creator: 'maker' } };
  const st2c = C.computeState(topics, two, g2, []);
  eq([st2c.per['pie-slicer'].count, st2c.all[1].flags[0]], [1, 'same creator already counted here'], 'second game by the same creator on a topic does not count');
  // topic overrides: close one topic, move another's date
  const ov = C.applyOverrides([{ id: 'a', title: 'A' }, { id: 'b', title: 'B', ship_by: '2026-11-15', event: '2026-11-26', event_name: 'X' }, { id: 'c', title: 'C' }],
    [{ id: 'A', closed: 'yes' }, { id: 'b', ship_by: '2026-11-20' }, { id: 'c', closed: 'no' }]);
  eq([ov.topics.map(t => t.id), Object.keys(ov.closed), ov.topics[0].ship_by], [['b', 'c'], ['a'], '2026-11-20'], 'topic overrides');
  const ov2 = C.applyOverrides([{ id: 'b', ship_by: '2026-11-15', event: '2026-11-26', event_name: 'X' }], [{ id: 'b', ship_by: 'Date(2026,10,22)' }]);
  eq([ov2.topics[0].ship_by, ov2.moved.b], ['2026-11-22', '2026-11-22'], 'date typed in the Sheet arrives as a gviz Date');
  const ov3 = C.applyOverrides([{ id: 'b' }], [{ id: 'b', ship_by: '11/22/2026' }]);
  eq(ov3.topics[0].ship_by, '2026-11-22', 'US-style date in the Sheet');
  eq(C.reasonText('made before Oct 27'), 'it was published before Oct 27, and only newer games count', 'plain reason');
  // categories ordered by earliest open deadline
  const tps = [{ id: 'a', category: 'Sports' }, { id: 'b', category: 'Late', ship_by: '2026-12-01', event: '2026-12-25', event_name: 'X' }, { id: 'c', category: 'Soon', ship_by: '2026-11-15', event: '2026-11-26', event_name: 'Y' }];
  eq(C.orderCategories(tps, null, Date.parse('2026-10-28T12:00:00Z')).map(c => c.name), ['Soon', 'Late', 'Sports'], 'deadline-first category order');
  eq(C.orderCategories(tps, null, Date.parse('2026-11-27T12:00:00Z')).map(c => c.name), ['Late', 'Sports', 'Soon'], 'closed categories drop below');
  // missed topics leave the open counts
  const miss = C.computeState([{ id: 'c', category: 'Soon', ship_by: '2026-11-15', event: '2026-11-26', event_name: 'Y' }], [], {}, [], Date.parse('2026-11-27T12:00:00Z'));
  eq([miss.totals.missed, miss.totals.empty], [1, 0], 'missed topic counted as missed, not waiting');
  // a hand-added row with no timestamp doesn't take the count from the creator's own row
  const hand = C.normalizeRows([
    { _row: 9, timestamp: null, topic_id: 'turkey-trot', game_url: 'https://www.astrocade.com/games/a/01KZYWEY8Z0EQNGGVB650H21PV', submission_id: '' },
    { _row: 3, timestamp: 'Date(2026,9,28,5,0,0)', topic_id: 'pie-slicer', game_url: 'https://www.astrocade.com/games/a/01KZYWEY8Z0EQNGGVB650H21PV', submission_id: 's-9' }]);
  const sth = C.computeState(topics, hand, {}, []);
  eq([sth.per['pie-slicer'].count, sth.per['turkey-trot'].count], [1, 0], 'timestamped row wins over hand-added row');
  // pending merge
  const st2 = C.computeState(topics, C.normalizeRows(res.rows), {}, [{ subId: 'p1', topicId: 'pie-slicer', gameId: '01KZYWEY8Z0EQNGGVB650H21PS', gameUrl: 'https://www.astrocade.com/games/z/01KZYWEY8Z0EQNGGVB650H21PS', at: Date.now() }]);
  eq(st2.per['pie-slicer'].count, 1, 'pending counted');
  // header not detected fallback
  fetchText = 'x(' + JSON.stringify({ status: 'ok', table: { cols: [{ label: '' }, { label: '' }], rows: [{ c: [{ v: 'Timestamp' }, { v: 'topic_id' }] }, { c: [{ v: 'Date(2026,9,28,0,0,0)' }, { v: 'turkey-trot' }] }] } }) + ')';
  return C.loadSheetRows();
}).then(res => {
  eq(res.rows.length, 1, 'header fallback rows');
  eq(res.rows[0].topic_id, 'turkey-trot', 'header fallback mapping');
  fetchText = 'x(' + JSON.stringify({ status: 'error', errors: [{ reason: 'access_denied' }] }) + ')';
  return C.loadSheetRows();
}).then(res => { eq(res.reason, 'private', 'private sheet reason'); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); });
