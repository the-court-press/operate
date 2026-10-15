# OPERATE!

**OPERATE!** is a tactile four-tile number-merge puzzle: combine two numbers with **+ − × ÷**, replace them with the result, and keep going until one tile equals the **target** (classic mode: **24**).

Playable demo (GitHub Pages):  
**https://the-court-press.github.io/operate/**

## How to play

1. Pick a difficulty **band** (Seed / Sprout / Explorer).
2. Four number tiles are dealt. The target is shown at the top.
3. Select **two tiles**, then an **operation** — or arm an op first, then tap two tiles.
4. The pair merges into one result tile. Repeat until you hit the target (4 → 3 → 2 → 1).
5. **Undo** steps or **Reset** the current puzzle. **New puzzle** deals another from the bank.
6. After a solve, you’ll see your merge path and, when available, **another valid path** (teaching beat).

### Focus meter

Fast correct solves **charge Focus**. Long idle time or rough resets **drain** it. Kid-safe naming (Focus / Charge) — Street-Fighter-like meter energy without franchise IP.

### Duel practice (cosmetic)

A simple “You vs Ghost” HP strip: solving chips the ghost; it’s flavor for solo practice, not a full PvP mode.

## Difficulty bands

| Band | Idea |
|------|------|
| **Seed** | Smaller targets and/or gentler ops (often + −, smaller number space) |
| **Sprout** | Classic **target 24**, numbers mostly 1–9, all four ops |
| **Explorer** | Target 24 with a wider number space (up to 13) — tougher sets |

The bank is precomputed (~300 reachable puzzles) and filtered by band.

## Stack

Vanilla **HTML / CSS / JS** — no framework. Works as a static site on GitHub Pages (`main` branch, root).

```
index.html
css/style.css
js/puzzles.js   # puzzle bank
js/engine.js    # merge + deal logic
js/audio.js     # optional Web Audio beeps
js/app.js       # UI / Focus / duel chrome
```

## IP note

OPERATE! is an **original product**. It is inspired by the long tradition of *make-the-target* / “24” classroom puzzles (public-domain style number play), not affiliated with any fighting-game, creature-collection, or other franchise. Art and naming here are original CSS/UI only — no Capcom, Pokémon, or other third-party assets or names.

## Local

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

## License

Prototype for personal / educational use. © Julius (julianlee314-hue).
