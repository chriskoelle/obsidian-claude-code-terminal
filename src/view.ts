import { ItemView, WorkspaceLeaf, FileSystemAdapter, Notice } from "obsidian";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import * as path from "path";
import type { IPty } from "node-pty";
import type ClaudeCodePlugin from "./main";

export const VIEW_TYPE_CLAUDE = "claude-code-terminal";

export class ClaudeTerminalView extends ItemView {
	private plugin: ClaudeCodePlugin;
	private term: Terminal | null = null;
	private fitAddon: FitAddon | null = null;
	private ptyProc: IPty | null = null;
	private resizeObserver: ResizeObserver | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: ClaudeCodePlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_CLAUDE;
	}

	getDisplayText(): string {
		return "Claude Code";
	}

	getIcon(): string {
		return "bot";
	}

	async onOpen(): Promise<void> {
		const settings = this.plugin.settings;
		const container = this.contentEl;
		container.empty();
		container.addClass("claude-terminal-host");

		const termEl = container.createDiv({ cls: "claude-terminal" });

		this.term = new Terminal({
			fontSize: settings.fontSize,
			fontFamily:
				"Menlo, Monaco, 'Courier New', monospace",
			cursorBlink: true,
			allowProposedApi: true,
			theme: this.getThemeColors(),
		});
		this.fitAddon = new FitAddon();
		this.term.loadAddon(this.fitAddon);
		this.term.open(termEl);
		this.safeFit();

		// Re-sync terminal colors when the Obsidian theme changes.
		this.registerEvent(
			this.app.workspace.on("css-change", () => {
				if (this.term) {
					this.term.options.theme = this.getThemeColors();
				}
			}),
		);

		// node-pty is a native module loaded at runtime. A bare
		// require("node-pty") resolves against Electron's internals (not the
		// plugin folder), so we require it by absolute path. This can also fail
		// with an ABI error after an Electron upgrade — handle both gracefully.
		let pty: typeof import("node-pty");
		try {
			const pluginDir = this.plugin.getPluginDir();
			const nodePtyPath = pluginDir
				? path.join(pluginDir, "node_modules", "node-pty")
				: "node-pty";
			pty = require(nodePtyPath);
		} catch (err) {
			this.showLoadError(err);
			return;
		}

		const cwd = this.resolveCwd();
		try {
			this.ptyProc = pty.spawn(settings.shell, ["-l"], {
				name: "xterm-256color",
				cwd,
				env: process.env as { [key: string]: string },
				cols: this.term.cols,
				rows: this.term.rows,
			});
		} catch (err) {
			this.showSpawnError(err);
			return;
		}

		this.ptyProc.onData((data) => this.term?.write(data));
		this.term.onData((data) => this.ptyProc?.write(data));
		this.ptyProc.onExit(() => {
			this.term?.write("\r\n[process exited]\r\n");
		});

		if (settings.autoLaunch) {
			this.ptyProc.write(settings.claudeCommand + "\r");
		}

		this.resizeObserver = new ResizeObserver(() => {
			this.safeFit();
			if (this.term && this.ptyProc) {
				try {
					this.ptyProc.resize(this.term.cols, this.term.rows);
				} catch {
					/* pty may have exited */
				}
			}
		});
		this.resizeObserver.observe(termEl);

		this.term.focus();
	}

	async onClose(): Promise<void> {
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		try {
			this.ptyProc?.kill();
		} catch {
			/* already gone */
		}
		this.ptyProc = null;
		this.term?.dispose();
		this.term = null;
		this.fitAddon = null;
	}

	private safeFit(): void {
		try {
			this.fitAddon?.fit();
		} catch {
			/* container not laid out yet */
		}
	}

	/** Map Obsidian's theme CSS variables onto an xterm color theme. */
	private getThemeColors(): {
		background: string;
		foreground: string;
		cursor: string;
		cursorAccent: string;
		selectionBackground: string;
	} {
		const styles = getComputedStyle(document.body);
		const read = (name: string, fallback: string): string =>
			styles.getPropertyValue(name).trim() || fallback;
		const background = read("--background-primary", "#1e1e1e");
		const foreground = read("--text-normal", "#dcddde");
		return {
			background,
			foreground,
			cursor: read("--text-accent", foreground),
			cursorAccent: background,
			selectionBackground: read(
				"--text-selection",
				"rgba(255, 255, 255, 0.2)",
			),
		};
	}

	private resolveCwd(): string {
		const adapter = this.app.vault.adapter;
		let base = "";
		if (adapter instanceof FileSystemAdapter) {
			base = adapter.getBasePath();
		}
		if (this.plugin.settings.startDir === "activeFile") {
			const file = this.app.workspace.getActiveFile();
			if (file && file.parent) {
				return path.join(base, file.parent.path);
			}
		}
		return base;
	}

	private showLoadError(err: unknown): void {
		const msg = err instanceof Error ? err.message : String(err);
		new Notice("Claude Code: failed to load node-pty.");

		// Replace the terminal with a recovery panel offering a one-click
		// rebuild. This is the expected path after an Obsidian/Electron upgrade
		// changes the native module ABI.
		this.term?.dispose();
		this.term = null;
		this.fitAddon = null;
		const container = this.contentEl;
		container.empty();

		const panel = container.createDiv({ cls: "claude-terminal-error" });
		panel.createEl("h3", { text: "Claude Code can't start" });
		panel.createEl("p", {
			text: "The node-pty terminal backend failed to load. This usually happens after an Obsidian update changes the Electron version. Rebuilding recompiles it for the current version.",
		});

		const button = panel.createEl("button", {
			text: "Rebuild node-pty",
			cls: "mod-cta",
		});
		button.addEventListener("click", () => {
			void this.plugin.rebuildNodePty();
		});

		panel.createEl("p", {
			cls: "claude-terminal-error-note",
			text: "Requires Xcode Command Line Tools. After it finishes, reopen this panel.",
		});

		const details = panel.createEl("pre", {
			cls: "claude-terminal-error-details",
		});
		details.setText(msg);
	}

	private showSpawnError(err: unknown): void {
		const msg = err instanceof Error ? err.message : String(err);
		new Notice("Claude Code: failed to start the terminal.");
		this.term?.write(
			"\r\n\x1b[31mFailed to start shell:\x1b[0m\r\n" +
				msg.replace(/\n/g, "\r\n") +
				"\r\n",
		);
	}
}
