import {
	Notice,
	Plugin,
	WorkspaceLeaf,
	FileSystemAdapter,
	setIcon,
} from "obsidian";
import { spawn } from "child_process";
import * as path from "path";
import { ClaudeTerminalView, VIEW_TYPE_CLAUDE } from "./view";
import {
	ClaudeCodeSettings,
	ClaudeCodeSettingTab,
	DEFAULT_SETTINGS,
	lucideIconId,
} from "./settings";

export default class ClaudeCodePlugin extends Plugin {
	settings: ClaudeCodeSettings = DEFAULT_SETTINGS;
	private ribbonIconEl: HTMLElement | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_CLAUDE,
			(leaf) => new ClaudeTerminalView(leaf, this),
		);

		this.ribbonIconEl = this.addRibbonIcon(
			lucideIconId(this.settings.icon),
			"Open Claude Code",
			() => {
				void this.activateView();
			},
		);

		this.addCommand({
			id: "open-claude-code-terminal",
			name: "Open Claude Code terminal",
			callback: () => {
				void this.activateView();
			},
		});

		this.addCommand({
			id: "rebuild-claude-code-node-pty",
			name: "Rebuild Claude Code terminal (node-pty)",
			callback: () => {
				void this.rebuildNodePty();
			},
		});

		this.addSettingTab(new ClaudeCodeSettingTab(this.app, this));
	}

	/** Apply the configured icon to the ribbon and any open panels live. */
	applyIcon(): void {
		if (this.ribbonIconEl) {
			setIcon(this.ribbonIconEl, lucideIconId(this.settings.icon));
		}
		for (const leaf of this.app.workspace.getLeavesOfType(
			VIEW_TYPE_CLAUDE,
		)) {
			if (leaf.view instanceof ClaudeTerminalView) {
				leaf.view.refreshIcon();
			}
		}
	}

	/** Absolute path to this plugin's folder inside the vault. */
	getPluginDir(): string | null {
		const adapter = this.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) return null;
		if (!this.manifest.dir) return null;
		return path.join(adapter.getBasePath(), this.manifest.dir);
	}

	/**
	 * Recompile node-pty against the running Electron ABI. Needed after an
	 * Obsidian update bumps Electron to a version with a different ABI. Uses
	 * child_process so it works even when node-pty itself cannot load.
	 */
	private rebuilding = false;

	async rebuildNodePty(): Promise<void> {
		if (this.rebuilding) {
			new Notice("Claude Code: rebuild already in progress…");
			return;
		}
		const pluginDir = this.getPluginDir();
		if (!pluginDir) {
			new Notice("Claude Code: could not locate the plugin folder.");
			return;
		}
		const bin = path.join(
			pluginDir,
			"node_modules",
			".bin",
			"electron-rebuild",
		);
		const electronVersion = process.versions.electron;
		if (!electronVersion) {
			new Notice(
				"Claude Code: could not determine the Electron version.",
			);
			return;
		}

		this.rebuilding = true;
		new Notice(
			`Claude Code: rebuilding node-pty for Electron ${electronVersion}…`,
		);

		await new Promise<void>((resolve) => {
			const child = spawn(
				bin,
				["-v", electronVersion, "-w", "node-pty"],
				{ cwd: pluginDir, shell: process.platform === "win32" },
			);

			child.stdout.on("data", (d) => console.log(`[node-pty] ${d}`));
			child.stderr.on("data", (d) => console.error(`[node-pty] ${d}`));

			child.on("error", (err) => {
				this.rebuilding = false;
				new Notice(
					`Claude Code: rebuild failed to start — ${err.message}. Is the dev toolchain (Xcode CLT) installed?`,
				);
				resolve();
			});

			child.on("close", (code) => {
				this.rebuilding = false;
				if (code === 0) {
					new Notice(
						"Claude Code: node-pty rebuilt. Reopen the terminal panel.",
					);
				} else {
					new Notice(
						`Claude Code: rebuild failed (exit ${code}). See the developer console; ensure Xcode Command Line Tools are installed.`,
					);
				}
				resolve();
			});
		});
	}

	async onunload(): Promise<void> {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_CLAUDE);
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null;
		const existing = workspace.getLeavesOfType(VIEW_TYPE_CLAUDE);
		if (existing.length > 0) {
			leaf = existing[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({ type: VIEW_TYPE_CLAUDE, active: true });
		}

		workspace.revealLeaf(leaf);
		if (leaf.view instanceof ClaudeTerminalView) {
			leaf.view.focusTerminal();
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
