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
  in the OS temp dir. Ask Claude to file it into your vault if you want to keep
  it.
- One-click recovery if an Obsidian update breaks the native terminal backend.

## Requirements

- Desktop Obsidian only (`isDesktopOnly` — node-pty is a native module).
- The [`claude`](https://code.claude.com) CLI installed and logged in.
- For building / rebuilding the native module: Node, npm, and a C/C++
  toolchain (Xcode Command Line Tools on macOS).

## Build & install

```bash
npm install          # installs deps and vendors xterm.css into styles.css
npm run rebuild      # compile node-pty for Obsidian's Electron — see note below
npm run build        # produce main.js
```

`node-pty` is a native module and must be compiled against **Obsidian's**
Electron version, not your system Node. The `rebuild` script uses
`electron-rebuild`; pass the right Electron version with:

```bash
npx electron-rebuild -v <version> -w node-pty
```

Find `<version>` in Obsidian via the developer console (Cmd/Ctrl+Opt+I →
`process.versions.electron`).

Then make the plugin available to your vault. For development, symlink this
folder into the vault's plugins directory (this keeps `node_modules/node-pty`
in place, which the plugin loads at runtime):

```bash
ln -s "$(pwd)" "/path/to/your/vault/.obsidian/plugins/claude-code-terminal"
```

Enable **Claude Code** under Settings → Community plugins, then open it from the
ribbon icon or the "Open Claude Code terminal" command.

## After an Obsidian update

A minor Obsidian update usually keeps the same Electron version and keeps
working. A major update can change the Electron ABI, and node-pty will fail to
load. When that happens the panel shows a **Rebuild node-pty** button; you can
also run the **"Rebuild Claude Code terminal (node-pty)"** command. It
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
