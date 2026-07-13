# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

VocaFly — single-page vocab flashcard app. No build step, no package manager, no framework. Everything lives in [index.html](index.html): inline `<style>` + inline `<script>`, vanilla JS/DOM. [server.js](server.js) is a dependency-free Node `http` server: serves the static files and exposes `POST /api/words` to append entries to `words.json` from the in-page "add word" form.

## Running it

No build/lint/test tooling. Run the zero-dependency Node server (needed for the add-word API, not just static serving):

```
node server.js        # http://localhost:8000, PORT env var to override
```

`words.json` is fetched via `fetch('words.json')`, so opening `index.html` directly as `file://` will fail (CORS) — must be served over HTTP.

## Architecture

- [index.html](index.html) — entire app (markup, CSS, JS) in one file.
- [words.json](words.json) — array of `{ word, definition }` objects (~2500 entries). `word` is formatted as `"term (pos)"` e.g. `"demolish (v)"`. `definition` is markdown-ish plain text:
  - `[label](url)` links (rendered by hand-rolled `renderMd`, not a markdown lib)
  - Paragraphs split on `\n\n`
  - A paragraph starting with `→` renders as an indented `.sub-entry` (secondary meaning/example)
  - Definitions mix English and Vietnamese

- Core JS state: `words` (loaded array), `current` (index into `words`), `seen` (Set of seen indices, resets on shuffle).
- Card flow: `loadWords()` fetches JSON → `shuffle()` (Fisher-Yates, resets `current`/`seen`) → `showWord()` renders. Card starts hidden (`.hint` shown); click reveals `.definition` via `.revealed` class toggle. "Next word" advances `current` and re-shuffles once the deck is exhausted.
- Search: client-side substring filter over `words`, jumps `current` to the matched entry via `showWord(entry)`.
- Notifications: Web Notifications API, interval-based (`setInterval`) picking a random word; interval persisted in `localStorage` (`notifInterval`). No service worker — timer only fires while the tab is open.

All state is in-memory/localStorage only; no backend, no database.

## Editing word data

Add/edit entries directly in `words.json` as `{ "word": "term (pos)", "definition": "..." }`. Use `\n\n→ ...` within `definition` for secondary/sub-entries, and `[text](url)` for links.
