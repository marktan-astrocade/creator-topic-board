#!/usr/bin/env python3
"""Refresh site/data/games.json and site/data/board.json from the submissions Sheet.

Runs in GitHub Actions every 15 minutes. Reads the Sheet through Google's public
query endpoint (the Sheet must be shared as "anyone with the link can view"),
then fetches each new game's Astrocade page for its title, creator, thumbnail,
publish date and play count.

Always exits 0 so a hiccup never blocks a deploy. When the Sheet is private after
go-live (or after it has worked before), it sets the step output `alert`, at most
once an hour, and a separate workflow job fails so GitHub emails the repo owner.
"""
import html, json, os, re, sys, time, urllib.error, urllib.request
from datetime import date, datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'site', 'data')
SHEET_ID = '1nXVCA4gaxy-60Yx6S-4KNsvfkwMvUoXAGRtIIaYpUmw'
GID = '20802834'
UA = 'Mozilla/5.0 (compatible; CreatorTopicBoard/1.0; +https://marktan-astrocade.github.io/creator-topic-board/)'
# Same link shapes the board accepts: /games/<slug>/<id>[/v/<n>], /share/<id>, creator hub ?g=<id>
GAME_RE = re.compile(r'astrocade\.com/(?:games/[^\s/?#]+/|share/)([0-9A-HJKMNP-TV-Z]{26})(?![0-9A-Z])|astrocade\.com/\S*[?&]g=([0-9A-HJKMNP-TV-Z]{26})(?![0-9A-Z])', re.I)
REMOVED = re.compile(r'^\s*remove', re.I)
MAX_FETCH = 80
TODAY = date.today()
GO_LIVE = date(2026, 10, 29)


def alert(message):
    print('ALERT: ' + message)
    out = os.environ.get('GITHUB_OUTPUT')
    if out:
        with open(out, 'a') as f:
            f.write('alert=' + message.replace('\n', ' ') + '\n')


def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8', 'replace')


def sheet_rows():
    text = fetch(f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:json&headers=1&gid={GID}')
    j = json.loads(text[text.index('{'): text.rindex('}') + 1])
    if j.get('status') == 'error':
        reasons = ','.join(e.get('reason', '') for e in j.get('errors', []))
        raise PermissionError(reasons or 'error')
    norm = lambda v: re.sub(r'\s+', '_', str('' if v is None else v).strip().lower())
    cols = [norm(c.get('label')) for c in j['table']['cols']]
    data = j['table'].get('rows') or []
    if 'topic_id' not in cols and data:  # header row not detected: use the first row as labels
        head = [norm(c and (c.get('v') if c.get('v') is not None else c.get('f'))) for c in (data[0].get('c') or [])]
        if 'topic_id' in head:
            cols, data = head, data[1:]
    rows = []
    for i, r in enumerate(data):
        o = {'_row': i + 2}
        for k, cell in enumerate(r.get('c') or []):
            if k < len(cols) and cols[k]:
                o[cols[k]] = None if cell is None else (cell.get('v') if cell.get('v') is not None else cell.get('f'))
        if any(o.get(k) for k in ('topic_id', 'game_url')):
            rows.append({k: o.get(k) for k in ('_row', 'timestamp', 'topic_id', 'game_url', 'submission_id', 'status')})
    return rows


def meta(page, prop):
    m = re.search(r'<meta (?:property|name)="' + re.escape(prop) + r'" content="([^"]*)"', page)
    return html.unescape(m.group(1)) if m else ''


def game_info(game_id):
    """Page facts for one game; {'ok': False} if Astrocade says not found; None on a temporary error."""
    try:
        page = fetch(f'https://www.astrocade.com/games/g/{game_id}')
    except urllib.error.HTTPError as e:
        return {'ok': False} if e.code == 404 else None
    except Exception:
        return None
    title, creator = meta(page, 'og:title'), ''
    m = re.match(r'^Play (.*) by @(\S+)$', title)
    if m:
        title, creator = m.group(1), m.group(2)
    pub = re.search(r'"datePublished":"([^"]+)"', page)
    plays = re.search(r'\\"plays\\":(\d+)', page) or re.search(r'"plays":(\d+)', page)
    return {
        'ok': True,
        'title': title or meta(page, 'twitter:title'),
        'creator': creator,
        'thumb': meta(page, 'og:image'),
        'published': pub.group(1) if pub else '',
        'plays': int(plays.group(1)) if plays else None,
    }


def due(entry):
    """Whether to fetch the game page again. Dates only, so a re-check changes the file at most once a day."""
    if not entry:
        return True
    if entry.get('misses'):
        return True                                           # one "not found" so far: confirm on the next run
    checked = date.fromisoformat(entry.get('checked', '2000-01-01'))
    if entry.get('ok'):
        return TODAY - checked >= timedelta(days=1)          # refresh plays daily
    first = date.fromisoformat(entry.get('first_seen', entry.get('checked', '2000-01-01')))
    if TODAY - first <= timedelta(days=2):
        return True                                           # a just-submitted game may still be publishing
    return TODAY - checked >= timedelta(days=7)


def load(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def save_if_changed(path, obj):
    if load(path, None) == obj:
        return False
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
        f.write('\n')
    os.replace(tmp, path)
    return True


def main():
    board_path, games_path = os.path.join(DATA, 'board.json'), os.path.join(DATA, 'games.json')
    was_live = os.path.exists(board_path)
    try:
        rows = sheet_rows()
    except (PermissionError, urllib.error.HTTPError) as e:
        private = isinstance(e, PermissionError) or getattr(e, 'code', 0) in (401, 403)
        print(f'The submissions Sheet is not readable ({e}).' + (' Share it as "Anyone with the link: Viewer".' if private else ' Will try again next run.'))
        if private and (was_live or TODAY >= GO_LIVE) and datetime.now(timezone.utc).minute < 15:
            alert('Live counts are off: the submissions Sheet is not shared as "Anyone with the link: Viewer".')
        return 0
    except Exception as e:
        print(f'Could not read the Sheet this time: {e!r}.')
        return 0

    games = load(games_path, {})
    ids = []
    for r in rows:
        if REMOVED.match(str(r.get('status') or '')) or str(r.get('game_url') or '').strip().lower() == 'claim':
            continue
        m = GAME_RE.search(str(r.get('game_url') or ''))
        gid = (m.group(1) or m.group(2)).upper() if m else None
        if gid and gid not in ids:
            ids.append(gid)
    fetched = 0
    for gid in ids:
        old = games.get(gid)
        if fetched >= MAX_FETCH or not due(old):
            continue
        info = game_info(gid)
        fetched += 1
        if info is None:
            continue
        if not info['ok'] and old and old.get('ok') and not old.get('misses'):
            # A game that worked before needs two "not found" answers in a row before it stops counting.
            games[gid] = dict(old, misses=1)
        else:
            info['first_seen'] = (old or {}).get('first_seen', TODAY.isoformat())
            info['checked'] = TODAY.isoformat()
            games[gid] = info
        time.sleep(0.4)
    changed = save_if_changed(games_path, games)
    board = load(board_path, {})
    if board.get('rows') != rows:
        save_if_changed(board_path, {'updated': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'rows': rows})
        changed = True
    print(f'{len(rows)} rows, {len(ids)} games, fetched {fetched} pages, data {"changed" if changed else "unchanged"}.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
