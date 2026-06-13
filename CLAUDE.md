# CLAUDE.md

Guidance for working in this repository.

## What this is

An Obsidian plugin that embeds a **Claude Code terminal** in a sidebar panel. It
is **not** an Anthropic API integration — it runs the user's installed `claude`
CLI inside a real terminal, so it uses their existing Claude subscription login.
No API key, no Anthropic SDK. Desktop-only (`isDesktopOnly: true`).

Stack: **xterm.js** (renderer, bundled into `main.js`) + **node-pty** (native
PTY backend, loaded at runtime). Obsidian runs on Electron, so this is a Node
environment.

## Layout

- `src/main.ts` — `ClaudeCodePlugin`: registers the view, ribbon icon, the
  "Open Claude Code terminal" command, the "Rebuild Claude Code terminal
  (node-pty)" command, and the settings tab. Holds `rebuildNodePty()`.
- `src/view.ts` — `ClaudeTerminalView` (`ItemView`): xterm + node-pty wiring,
  auto-launch, resize, and the node-pty load-failure recovery panel.
- `src/settings.ts` — settings interface, defaults, and `PluginSettingTab`.
- `styles.src.css` — **edit this** for styles.
- `scripts/vendor-css.mjs` — generates `styles.css` = `xterm.css` +
  `styles.src.css`.
- `esbuild.config.mjs` — bundles `src/main.ts` → `main.js` (CJS).

## Build commands

```bash
npm install        # deps; postinstall generates styles.css
npm run dev        # esbuild watch
npm run build      # vendor-css + tsc typecheck + esbuild production → main.js
npm run rebuild    # electron-rebuild -w node-pty (pass -v <electron> explicitly)
```

## Critical constraints

- **node-pty is external, never bundled.** esbuild keeps `node-pty`, `electron`,
  `obsidian`, and Node builtins external (see `esbuild.config.mjs`). The
  installed plugin folder must therefore contain `node_modules/node-pty/`. The
  dev workflow symlinks this whole folder into the vault's plugins dir so
  `node_modules` is present.
- **node-pty must match Obsidian's Electron ABI**, not system Node. After
  `npm install` (or any Obsidian Electron-major upgrade), run
  `npx electron-rebuild -v <process.versions.electron> -w node-pty`. Find the
  version via Obsidian's dev console (`process.versions.electron`). node-pty
  stores per-ABI binaries under `node_modules/node-pty/bin/<platform>-<abi>/`,
  so the right one is picked at runtime.
- **In-app recovery:** if node-pty fails to load (post-upgrade ABI mismatch),
  the view shows a Rebuild button; `rebuildNodePty()` shells out to
  electron-rebuild via `child_process` (works even when node-pty can't load).
- **`styles.css` is generated** — gitignored; edit `styles.src.css` instead.
- **`main.js` is generated** — gitignored.

## Install into a vault

```bash
ln -s "$(pwd)" "/path/to/vault/.obsidian/plugins/claude-code-terminal"
```

Then enable **Claude Code** in Settings → Community plugins.

## Conventions

- Tabs for indentation; double quotes; semicolons (matches existing `src/`).
- TypeScript strict mode is on.
- Commit messages end with the `Co-Authored-By: Claude Opus 4.8` trailer.
