"""Verify every reference link: HTTP 200, Wikipedia not a disambiguation page, YouTube video exists (oEmbed).
Prints YouTube titles and channels so a person can review them for suitability."""
import json, sys, urllib.parse, urllib.request, urllib.error, concurrent.futures as cf
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'

def get(url, timeout=25):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read(400000).decode('utf-8', 'replace')

def check(ref):
    url = ref['url']
    try:
        if 'youtube.com/watch' in url:
            st, body = get('https://www.youtube.com/oembed?format=json&url=' + urllib.parse.quote(url, safe=''))
            j = json.loads(body)
            return ('ok', f"{j.get('title','')} | {j.get('author_name','')}")
        if 'en.wikipedia.org/wiki/' in url:
            title = url.split('/wiki/', 1)[1]
            st, body = get('https://en.wikipedia.org/api/rest_v1/page/summary/' + title)
            j = json.loads(body)
            if j.get('type') == 'disambiguation':
                return ('fail', 'disambiguation')
            return ('ok', j.get('title', ''))
        st, body = get(url)
        return ('ok' if st == 200 else 'fail', f'HTTP {st}')
    except urllib.error.HTTPError as e:
        return ('fail', f'HTTP {e.code}')
    except Exception as e:
        return ('fail', repr(e)[:80])

refs = json.load(open(sys.argv[1]))
jobs = [(tid, r) for tid, rs in refs.items() for r in rs]
with cf.ThreadPoolExecutor(3) as ex:
    results = list(ex.map(lambda j: (j[0], j[1], check(j[1])), jobs))
fails = [x for x in results if x[2][0] != 'ok']
for tid, r, (st, note) in results:
    if 'youtube' in r['url'] or st != 'ok' or '--all' in sys.argv:
        print(f"{st:4} {tid:24} {r['type']:7} {r['label'][:40]:40} {note[:90]}")
print(f'{len(results)} links, {len(fails)} failed')
