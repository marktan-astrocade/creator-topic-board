# Creator Topic Board

A board of 100 game topics for Astrocade creators, and a form to submit games for them.
A topic is complete once it has two games. A loading bar at the top fills as games come in, with one bar per
category under it. Complete topics grey out in the list.

- Board: https://marktan-astrocade.github.io/creator-topic-board/
- Form: https://marktan-astrocade.github.io/creator-topic-board/submit.html
- Form with one topic picked: add `?topic=<topic id>`, for example `submit.html?topic=turkey-trot`
- Community team view: https://marktan-astrocade.github.io/creator-topic-board/?admin=1

## Community team routine

Open the community team view. It sits right under the board and shows the weekly numbers, topics due soon,
creators, and every submission with the reason it does or doesn't count.

- **Post open topics to Discord:** press "Copy a Discord post of open topics", then paste it into Discord.
- **Weekly update for Mark:** press "Copy a weekly summary".
- **Take a game off the board:** in the submissions Sheet, type `remove` in that row's **status** cell.
  Only a status that starts with "remove" takes a game off. Other notes in that cell are ignored. Don't delete rows.
  If the same game was submitted twice, mark both rows, or the second one starts counting.
- **Move a game to the right topic:** change the row's **topic_id** cell. The ids are listed at the bottom of
  the community team view.
- **"I submitted but it's not showing":** ask for the reference code shown after submitting. Search the
  submissions table for it. The Status column says why a row doesn't count.
- **See who hasn't submitted:** fill in the `roster` tab of the submissions Sheet, one Astrocade handle per row
  under `handle`. The view then lists everyone with zero games and flags games from people who aren't on the
  roster. Handles only: anyone with the Sheet's link can read this tab.
- **Close a topic or move its date:** in the Sheet's `topics` tab, add a row with the topic id, then `yes` under
  `closed` (the topic leaves the board and the form) or a new date like `2026-11-22` under `ship_by`.
- **Clear a claim:** the "Building now" list shows who said they're building what, with codes. Type `remove` in
  that row's status cell in the Sheet.

What counts:

- Each game counts once. A second submission of the same game shows as a duplicate.
- Games published on Astrocade before Oct 27, 2026 don't count. The program is for new games.
- A link that isn't an Astrocade game page, or a game Astrocade can't find, doesn't count.
- Each creator's first game on a topic counts. A second game by the same creator on that topic doesn't.
- "Tell others you're building this" on the form adds a claim with the creator's Astrocade handle. The board
  shows "1 building" on that topic for three days. Each creator keeps their newest two claims; an older one drops off. Claims never count
  as games, and they only show once live counts are on.

Sharing the Sheet as "Anyone with the link: Viewer" makes every tab in it readable by anyone who has the link,
because the board reads it live: submissions, claims, the roster and the topics tab. The `?admin=1` view is a
convenience, not a login. Don't put private notes, payouts or contact details in this Sheet. Keep those in a
separate file.

To edit the Sheet, the community team needs edit access: Mark opens the Sheet, presses Share and adds their
email as Editor. Giving edit access doesn't make anything more public.

## How it works

1. The form posts each submission to a Google Form owned by Mark's Astrocade Google account.
2. The Google Form adds a row to the Sheet "Creator Topic Board - submissions".
3. The board reads that Sheet live, so new games show within a minute. This needs the Sheet shared as
   **Anyone with the link: Viewer**. Without it, the board shows topics but no counts.
4. A GitHub Action runs every 15 minutes. It opens each new game's Astrocade page to fetch the title, creator,
   thumbnail, publish date and play count into `site/data/games.json`, and keeps a copy of the Sheet in
   `site/data/board.json` in case Google is slow. From Oct 29, if the Sheet isn't readable, an "alert" job
   fails at most once an hour so GitHub emails the repo owner. It never blocks a deploy.

## Editing topics

Topics live in `scripts/topics_src.py`. Then run:

```bash
python3 scripts/topics_src.py && python3 scripts/build_topics.py
```

The build refuses to write if there aren't exactly 100 topics or if a word check fails. Commit and push, and the site redeploys in about a minute.

Keep topic ids the same once games are submitted: the Sheet stores the id, not the title.

## Local preview and tests

```bash
python3 -m http.server 8765 --directory site
```

Open http://localhost:8765/?demo=1 to see the board with fake data (local only).

```bash
node tests/common.test.js
```
