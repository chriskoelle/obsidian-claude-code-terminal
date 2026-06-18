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
  "Open Claude Code terminal" command (reveals + focuses the terminal), the
  "Rebuild Claude Code terminal (node-pty)" command, and the settings tab.
  Holds `rebuildNodePty()`, `applyIcon()`, and `getPluginDir()`.
- `src/view.ts` — `ClaudeTerminalView` (`ItemView`): xterm + node-pty wiring,
  auto-launch, resize, theme sync, image drop/paste, in-panel header, and the
  node-pty load-failure recovery panel.
- `src/settings.ts` — settings interface, defaults, `PluginSettingTab`, and
  `lucideIconId()` (maps the icon setting to a Lucide id).
- `styles.src.css` — **edit this** for styles.
- `scripts/vendor-css.mjs` — generates `styles.css` = `xterm.css` +
  `styles.src.css`.
- `scripts/fix-pty-helper.mjs` — `chmod +x` node-pty's prebuilt spawn-helper
  (runs from `postinstall`).
- `esbuild.config.mjs` — bundles `src/main.ts` → `main.js` (CJS).

## Build commands

```bash
npm install        # deps; postinstall generates styles.css + fixes spawn-helper
npm run dev        # esbuild watch
npm run build      # vendor-css + tsc typecheck + esbuild production → main.js
npm run rebuild    # electron-rebuild -w node-pty — fallback only; N-API prebuilt
                   # usually just works (pass -v <electron> explicitly if needed)
```

## Critical constraints

- **node-pty is external, never bundled.** esbuild keeps `node-pty`, `electron`,
  `obsidian`, and Node builtins external (see `esbuild.config.mjs`). The
  installed plugin folder must therefore contain `node_modules/node-pty/`. The
  dev workflow symlinks this whole folder into the vault's plugins dir so
  `node_modules` is present.
- **node-pty 1.x is N-API, so no per-Electron rebuild is normally needed.** It
  ships ABI-stable prebuilt binaries under
  `node_modules/node-pty/prebuilds/<platform>-<arch>/`, loaded via N-API (Node-API),
  whose ABI is stable across Node/Electron versions. node-pty's loader
  (`lib/utils.js`) checks `build/Release`, `build/Debug`, then the matching
  `prebuilds/` dir — so a plain `npm install` is enough and the same binary keeps
  working across Obsidian/Electron upgrades. The `npm run rebuild` /
  `electron-rebuild` path remains only as a fallback for the rare case where the
  prebuilt won't load (e.g. an Electron major that drops node-pty's N-API
  version, or an unsupported platform). On macOS, electron-rebuild needs the SDK
  on PATH — `export SDKROOT="$(xcrun --show-sdk-path)"` before running it.
- **spawn-helper needs the execute bit (unix).** node-pty's prebuilt
  `prebuilds/<platform>-<arch>/spawn-helper` can extract without `+x`, which makes
  `pty.fork` fail with `posix_spawnp failed`. `scripts/fix-pty-helper.mjs`
  re-`chmod +x`es every prebuilt spawn-helper; it runs from `postinstall`, so a
  reinstall self-heals.
- **In-app recovery:** if node-pty fails to load, the view shows a Rebuild
  button; `rebuildNodePty()` shells out to electron-rebuild via `child_process`
  (works even when node-pty can't load). With N-API prebuilts this is rarely hit.
- **`styles.css` is generated** — gitignored; edit `styles.src.css` instead.
- **`main.js` is generated** — gitignored.
- **`data.json` is Obsidian's runtime settings** — gitignored; never commit it.

## Behaviors & gotchas

- **Launch.** On auto-launch the view spawns `$SHELL -l -i -c <claudeCommand>`
  so claude is exec'd directly (no echoed "claude" line) while still sourcing
  login + interactive shell config for PATH (so `~/.local/bin` is found). With
  auto-launch off it spawns an interactive login shell (`-l`). When claude
  exits, the pty exits (`[process exited]`); reopen to start a new session.
- **node-pty require.** Must be required by **absolute path**
  (`getPluginDir()/node_modules/node-pty`), not the bare specifier — a bare
  `require("node-pty")` resolves against Electron's internals and fails.
- **Theme.** Terminal colors are read from Obsidian CSS vars and re-synced on
  the workspace `css-change` event, so the panel follows theme switches live.
- **Images.** Drop a file → its real path is inserted (via Electron
  `webUtils.getPathForFile`). Paste a bitmap → staged at
  `/tmp/claude/paste-<time>.png` (OS temp dir on Windows) and that path is
  inserted. No auto-submit. Text pastes pass through to xterm untouched.
- **Icon.** `icon` setting (bot default; sparkles/terminal/asterisk) applies to
  ribbon/tab/header live via `applyIcon()`/`refreshIcon()`. `lucideIconId()`
  maps `terminal` → square-terminal, handling Lucide's rename.

## Platform support

Developed/tested on macOS (Apple Silicon). Should work on Linux. Windows is
untested and the shell launch is POSIX-only.

## Install into a vault

```bash
ln -s "$(pwd)" "/path/to/vault/.obsidian/plugins/claude-code-terminal"
```

Then enable **Claude Code** in Settings → Community plugins.

## Conventions

- Tabs for indentation; double quotes; semicolons (matches existing `src/`).
- TypeScript strict mode is on.
- Commit messages end with the `Co-Authored-By: Claude Opus 4.8` trailer.
