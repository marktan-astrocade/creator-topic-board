"""Merge topics.base.json with reference links into site/data/topics.json and validate."""
import json, glob, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from lint import problems_in
base = json.load(open(os.path.join(ROOT, 'scripts', 'topics.base.json')))
refs_path = os.path.join(ROOT, 'scripts', 'refs.json')
refs = json.load(open(refs_path)) if os.path.exists(refs_path) else {}
def smart(text):
    # curly quotes and apostrophes for display text
    text = re.sub(r'(^|[\s(\[])"', '\\1\u201c', text)
    text = text.replace('"', '\u201d')
    text = re.sub(r"(\w)'(\w)", '\\1\u2019\\2', text)
    text = re.sub(r"(^|\s)'", '\\1\u2018', text)
    return text.replace("'", '\u2019')

out, problems = [], []
for t in base:
    rank = {'video': 0, 'photos': 1, 'article': 2, 'official': 2, 'wiki': 3}
    r = sorted([dict(x) for x in refs.get(t['id'], [])], key=lambda x: rank.get(x['type'], 2))
    for x in r:  # sentence case after the "Video:" style prefix
        head, sep, rest = x['label'].partition(': ')
        if sep and rest:
            x['label'] = head + sep + rest[0].upper() + rest[1:]
    t = dict(t, refs=r, title=smart(t['title']), desc=smart(t['desc']))
    for x in r: x['label'] = smart(x['label'])
    if r and not (2 <= len(r) <= 3):
        problems.append(f"{t['id']}: {len(r)} refs")
    for x in r:
        if len(x['label']) > 48:
            problems.append(f"{t['id']}: long label {x['label']!r}")
        if not x['url'].startswith('https://'):
            problems.append(f"{t['id']}: non-https {x['url']}")
    out.append(t)
problems += problems_in(out)
if len(out) != 100:
    problems.append(f'{len(out)} topics, expected 100')
print(len(out), 'topics,', sum(len(t['refs']) for t in out), 'refs')
if problems:
    print('\n'.join(problems))
    print('Not written. Fix the problems above and run again.')
    sys.exit(1)
json.dump(out, open(os.path.join(ROOT, 'site', 'data', 'topics.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('wrote site/data/topics.json')
