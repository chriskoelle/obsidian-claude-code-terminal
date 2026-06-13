import { Plugin, WorkspaceLeaf } from "obsidian";
import { ClaudeTerminalView, VIEW_TYPE_CLAUDE } from "./view";

export interface ClaudeCodeSettings {
	autoLaunch: boolean;
	claudeCommand: string;
	shell: string;
	startDir: "vault" | "activeFile";
	fontSize: number;
}

export const DEFAULT_SETTINGS: ClaudeCodeSettings = {
	autoLaunch: true,
	claudeCommand: "claude",
	shell: process.env.SHELL || "/bin/zsh",
	startDir: "vault",
	fontSize: 13,
};

export default class ClaudeCodePlugin extends Plugin {
	settings: ClaudeCodeSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_CLAUDE,
			(leaf) => new ClaudeTerminalView(leaf, this),
		);

		this.addRibbonIcon("bot", "Open Claude Code", () => {
			void this.activateView();
		});

		this.addCommand({
			id: "open-claude-code-terminal",
			name: "Open Claude Code terminal",
			callback: () => {
				void this.activateView();
			},
		});
	}

	async onunload(): Promise<void> {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_CLAUDE);
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;

		const existing = workspace.getLeavesOfType(VIEW_TYPE_CLAUDE);
		if (existing.length > 0) {
			workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf: WorkspaceLeaf | null = workspace.getRightLeaf(false);
		if (!leaf) return;
		await leaf.setViewState({ type: VIEW_TYPE_CLAUDE, active: true });
		workspace.revealLeaf(leaf);
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
