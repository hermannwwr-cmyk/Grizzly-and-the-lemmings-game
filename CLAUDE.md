# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Grizzly and the Lemmings": a set of 14 mini games for a ~6–7-year-old: Catch, Boop!, Match, Count, Add and Take Away (page 1 of the menu), Maze, Simon Says, Bridge, Sudoku, Honey Shop and Leap (page 2), and Rafts and Stack (page 3), played mostly on a tablet. The entire game is one self-contained file, `index.html`: inline CSS and JS on an HTML5 canvas. It has no build step, no dependencies, no package.json, and no asset files. All art is drawn with canvas primitives, sound is synthesized with WebAudio, and voice uses `speechSynthesis`.

Design constraints:
- Gentle for young kids: no game over, no timers, no penalties. Wrong answers get a soft "Try again!"
- Pre-readers must be able to play: big tap targets, minimal text, and spoken instructions and numbers via `say()`.
- Touch first. Pointer events drive everything. Keyboard support is secondary: arrows/A/D, Enter, Esc, M.
- Characters are original drawings. Don't copy the look of the TV cartoon with a similar name.

## Running and testing

- Run: open `index.html` in a browser, or serve the folder (`python3 -m http.server`).
- There is no test suite or linter. Verify changes with headless Playwright (preinstalled in cloud sessions: `require('playwright')`). Load `file://.../index.html` at a 960×540 viewport, click at logical coordinates, and take screenshots.
- `window.__game` is a test hook. It exposes `go(sceneName)`, `scene` (the current scene key), `overlay` (the current overlay title, or null; non-null means a level or game was finished), `audio`, `music`, `songs`, and `art` (`ctx` and the draw functions). Use `art` to render pose sheets: draw and call `canvas.toDataURL()` in the same `evaluate`, before the next frame repaints.
- To reach end screens quickly, test a temporary copy with lowered goals (e.g. with `sed` on `goal:` / `GOAL`). Don't commit lowered goals.

## Architecture (all inside the IIFE in `index.html`)

- **Fixed logical resolution:** 960×540, with `GROUND = 470`. `resize()` scales the canvas with a DPR-aware `setTransform`, so all game code uses logical coordinates. `toGame()` maps pointer events back into those coordinates.
- **Scenes:** the `S` object holds `menu` plus one scene per game key (`catch`, `boop`, `match`, `count`, `add`, `sub`, `maze`, `simon`, `bridge`, `sudoku`, `shop`, `leap`, `rafts`, `stack`). Each scene has `start()`, `update(dt)`, and `render()`, plus optional `pointer(p)` (finger down), `drag(p)` (while down), and `release(p)` (finger lifted) handlers. `go(name)` switches scenes and resets `overlay`, `particles`, and `keys`. Game scenes are IIFEs that keep their state in closure variables.
- **Number games:** Count, Add, and Take Away share `pickChoices`, `drawChoices`, `hitChoice`, `drawCountBadge`, and `drawRoundStars`. Add and Take Away are one factory, `makeMathGame('add' | 'sub')`, which moves each round through the phases `intro` → (`steal`, Take Away only) → `ask` → `right`, and ends with `done`. Difficulty tables are at the top of the factory. Operands are single digits and answers stay at 10 or below.
- **Voice:** `say(words, queue)` cuts off current speech unless `queue` is true. `go(name, intro)` says the intro first, so a scene's opening line should use `queue = true` if it must not cut the intro off.
- **Adding a game:** games after Take Away are self-contained plug-in blocks below the `// @@NEW-GAMES@@` marker. Each block defines `S.<key>`, then `GAMES.push({key, label, bg, edge, ink, voice})` (menu order = push order), `PREVIEWS.<key> = (cx, top) => …` (card art, drawn for a 200×280 card), and `SONGS.<key>` (its tune). Add new games the same way. Block-level helpers are prefixed or uniquely named (`drawDrum`, `drawCoin`, `leapDraw…`, `raftsDraw…`) because they share the IIFE scope.
- **Menu pages:** 6 cards per page (`PER_PAGE`). The arrows, a sideways swipe, and the ←/→ keys flip pages. The swipe is handled by the global pointer handlers through the `swipe` state: cards follow the finger via `menuDrag`, `menuSlide` eases the new page in, and once a press has moved sideways it no longer opens the card it started on. and `menuPage` is remembered when you come back from a game. Tests that return home stay on the same page.
- **Audio unlock (iOS):** `initAudio()` runs on every pointer, touch, click, and key event. It sets `navigator.audioSession.type = 'playback'`, plays a silent buffer and a silent `<audio>` element, and primes `speechSynthesis`, so sound works on iPads and iPhones even in Silent Mode. Buttons fire on **pointerup**, not pointerdown, because iOS only allows audio and speech to start when the finger lifts. Keep it that way. Scene taps (`scene.pointer`) still fire on pointerdown.
- **Background music:** `SONGS` holds one original 8-bar tune per scene key (bpm, lead waveform, volume, note length, bass rhythm, melody, and bass roots). `go()` sets `songKey`. `updateMusic()` runs from the main `update()`, restarts the tune from the top when the scene changes, and schedules notes about 0.25 s ahead into `musicGain`. Music dips to 30% while `speechSynthesis.speaking` and is silent when `muted` or `!musicOn`. The music button sits beside the speaker button, and the on/off choice is saved in `localStorage['grizzly-music']`. A new scene needs a `SONGS` entry, or it falls back to the menu tune.
- **Immediate-mode buttons:** the `buttons` array is cleared every frame in `render()` and refilled by `button()`, `drawHome()`, `drawMute()` (which also draws the music button), and the menu cards. `pointerdown` hit-tests that array (topmost first). A pressed button fires on pointerup. Anything else is forwarded to `scene.pointer`. Anything clickable has to be pushed during render.
- **Overlay:** `overlay = { title, sub, win, buttons: [{label, color, action}] }` is drawn on top of the current scene. While it is set, scene input is blocked and scenes should early-return from `update`. Use `celebrate(key, title, sub)` to finish a game: it plays the fanfare, awards a star, starts confetti, and shows the Again/Home buttons. Catch also uses a non-win overlay between its levels.
- **Shared drawing helpers:**
  - Cartoon style: `blob()` fills an ellipse and outlines it in `INK`, `shade()` makes the soft top-left lighting, and `blinking(seed)` drives blinks. Shapes are drawn back to front, so each fill covers the outlines behind it.
  - Characters and objects: `drawBackground`, `drawBear(x, groundY, scale, {facing, walk, moving, happy, dance, pose, squash, look})`, `drawLemming(m)` / `drawLemmingAt(x, y, scale, m)`, `drawTreat(type, …)`, and `drawHole` (a clipped pop-up critter).
    - Bear `pose`: `'rest' | 'up' | 'dance' | 'scratch'` (puzzled, after a wrong answer) `| 'rub'` (tummy rub, after a catch).
    - Lemming `m.face`: `'happy' | 'dizzy' | 'cheeky'`. Carrying a treat makes a lemming cheeky (wink and tongue out). Give each lemming a `seed` so blinks and ear wiggles stay out of sync.
    - `squash` (> 0 flat, < 0 tall) on both gives the squash-and-stretch. `updateHop` / `hopSquash` share the hop physics for tappable things.
  - Text and shapes: `text()` (stroked text), `drawStar`, and `drawHeart`.
  - Effects: `burst`, `floatText`, `puff` (dust clouds for skids, landings and bumps), and the particle system.
  - HUD: `drawProgress`.
- **Persistence:** star counts per game are kept in `localStorage['grizzly-stars']`, with every access wrapped in try/catch. The game must work without storage.

## Published copy

The public copy is GitHub Pages, served straight from `index.html` at the repo root on branch `claude/quirky-feynman-uv30aq`: https://hermannwwr-cmyk.github.io/Grizzly-and-the-lemmings-game/. Every push to that branch updates it. `.nojekyll` turns off GitHub's Jekyll processing.


The game is also published as a claude.ai Artifact for tablet play. The artifact copy is generated from `index.html` by deleting the doctype, `<html>`, `<head>`, `<body>`, charset meta, and viewport meta lines, because the artifact host supplies those. Keep `<title>` and `<style>` at the top of `index.html` so that conversion stays a simple line deletion. Artifacts block external resources, so keep everything inline.
