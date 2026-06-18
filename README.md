# Claude Code for Obsidian

An Obsidian plugin that opens a **Claude Code terminal** in a sidebar panel. It
embeds a real terminal (xterm.js + node-pty) and runs the `claude` CLI you
already have installed — so it uses your existing **Claude subscription** login.
There is no API key and no Anthropic API usage; authentication, models, and
billing are all handled by the CLI exactly as in your normal terminal.

## Features

- Claude Code in a dockable sidebar panel (ribbon icon + command).
- Auto-launches `claude` on open (toggleable).
- Starts in your vault root or the active note's folder.
- Matches your Obsidian theme; the open command focuses the prompt so you can
  bind a hotkey and start typing without clicking.
- Drop or paste an image (e.g. a receipt) into the panel to hand Claude its
  path — dropped files are referenced in place; pasted screenshots are staged
  at `/tmp/claude/paste-<time>.png` (the OS temp dir on Windows). Ask Claude to
  file it into your vault if you want to keep it.
- One-click recovery if an Obsidian update breaks the native terminal backend.

## Requirements

- Desktop Obsidian only (`isDesktopOnly` — node-pty is a native module).
- The [`claude`](https://code.claude.com) CLI installed and logged in.
- Node and npm to build the plugin. A C/C++ toolchain (Xcode Command Line
  Tools on macOS) is only needed for the optional node-pty rebuild fallback
  below — not for a normal install.

## Platform support

Developed and tested on macOS (Apple Silicon). It should work on Linux as well —
the terminal launches via a POSIX login shell (`$SHELL -l -i -c`). **Windows is
untested** and the shell launch is not adapted for `cmd`/PowerShell, so treat it
as unsupported for now.

## Build & install

```bash
npm install          # deps; vendors xterm.css into styles.css, fixes spawn-helper
npm run build        # produce main.js
```

That's it — `node-pty` 1.x ships ABI-stable N-API prebuilt binaries, so the
bundled native module loads as-is across Obsidian's Electron versions. No
compile step is needed for a normal install. (`npm install`'s postinstall also
restores the execute bit on node-pty's prebuilt `spawn-helper`, which the
published tarball can drop.)

If the native terminal ever fails to load (e.g. an unsupported platform, or a
future Electron that drops node-pty's N-API version), rebuild it against
Obsidian's Electron version:

```bash
npx electron-rebuild -v <version> -w node-pty
```

Find `<version>` in Obsidian via the developer console (Cmd/Ctrl+Opt+I →
`process.versions.electron`). On macOS, point the build at the SDK first:
`export SDKROOT="$(xcrun --show-sdk-path)"`.

Then make the plugin available to your vault. For development, symlink this
folder into the vault's plugins directory (this keeps `node_modules/node-pty`
in place, which the plugin loads at runtime):

```bash
ln -s "$(pwd)" "/path/to/your/vault/.obsidian/plugins/claude-code-terminal"
```

Enable **Claude Code** under Settings → Community plugins, then open it from the
ribbon icon or the "Open Claude Code terminal" command.

## After an Obsidian update

Obsidian updates normally keep working with no action needed — node-pty's N-API
prebuilt binary is ABI-stable across Electron versions, so an Electron bump no
longer breaks it the way it did with older, ABI-pinned native modules. In the
rare case it does fail to load, the panel shows a **Rebuild node-pty** button;
you can also run the **"Rebuild Claude Code terminal (node-pty)"** command. It
recompiles node-pty against the current Electron version in the background.
Reopen the panel when it finishes.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| Auto-launch Claude Code | on | Run the claude command when the terminal opens. |
| Claude command | `claude` | Command written to the shell; use a full path if needed. |
| Shell | `$SHELL` | Login shell hosting the terminal. |
| Working directory | Vault root | Vault root or the active file's folder. |
| Font size | 13 | Terminal font size; reopen the panel to apply. |

## License

MIT
