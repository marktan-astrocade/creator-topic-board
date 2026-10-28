"""Check display text against banned word lists.

The lists live in scripts/wordlists.local.json, which is kept out of the public repo.
Without that file the check is skipped with a warning.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LISTS = os.path.join(HERE, 'wordlists.local.json')


def patterns():
    if not os.path.exists(LISTS):
        return None, None
    d = json.load(open(LISTS))
    place = re.compile('|'.join(d['place_patterns']))
    brand = re.compile('|'.join(d['brand_patterns']), re.I)
    return place, brand


def problems_in(topics):
    place, brand = patterns()
    if place is None:
        print('warning: scripts/wordlists.local.json not found, word checks skipped')
        return []
    out = []
    for t in topics:
        fields = {'category': t['category'], 'title': t['title'], 'desc': t['desc']}
        for r in t.get('refs', []):
            fields['label ' + r['url'][:50]] = r['label']
        for k, v in fields.items():
            for pat, kind in ((place, 'place word'), (brand, 'brand name')):
                m = pat.search(v)
                if m:
                    out.append(f"{t['id']}: {kind} {m.group(0)!r} in {k}: {v[:80]}")
    return out


if __name__ == '__main__':
    found = problems_in(json.load(open(sys.argv[1])))
    print('\n'.join(found) or 'no word problems')
    sys.exit(1 if found else 0)
