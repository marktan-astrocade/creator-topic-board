"""Build site/data/topics.json from topics.base.json and validate it."""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from lint import problems_in
base = json.load(open(os.path.join(ROOT, 'scripts', 'topics.base.json')))
def smart(text):
    # curly quotes and apostrophes for display text
    text = re.sub(r'(^|[\s(\[])"', '\\1\u201c', text)
    text = text.replace('"', '\u201d')
    text = re.sub(r"(\w)'(\w)", '\\1\u2019\\2', text)
    text = re.sub(r"(^|\s)'", '\\1\u2018', text)
    return text.replace("'", '\u2019')

out = [dict(t, title=smart(t['title']), desc=smart(t['desc'])) for t in base]
problems = problems_in(out)
if len(out) != 100:
    problems.append(f'{len(out)} topics, expected 100')
print(len(out), 'topics')
if problems:
    print('\n'.join(problems))
    print('Not written. Fix the problems above and run again.')
    sys.exit(1)
json.dump(out, open(os.path.join(ROOT, 'site', 'data', 'topics.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('wrote site/data/topics.json')
