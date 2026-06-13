import { App, PluginSettingTab, Setting, getIconIds } from "obsidian";
import type ClaudeCodePlugin from "./main";

export type ClaudeIcon = "sparkles" | "bot" | "terminal" | "asterisk";

/**
 * Resolve a setting value to an actual Lucide icon id. "terminal" maps to the
 * square-terminal glyph, which Lucide renamed from "terminal-square" to
 * "square-terminal" — pick whichever this Obsidian build registers.
 */
export function lucideIconId(icon: ClaudeIcon): string {
	if (icon !== "terminal") return icon;
	const ids = getIconIds();
	for (const candidate of ["terminal-square", "square-terminal"]) {
		if (ids.includes(candidate) || ids.includes(`lucide-${candidate}`)) {
			return candidate;
		}
	}
	return "terminal";
}

export interface ClaudeCodeSettings {
	autoLaunch: boolean;
	claudeCommand: string;
	shell: string;
	startDir: "vault" | "activeFile";
	fontSize: number;
	icon: ClaudeIcon;
}

export const DEFAULT_SETTINGS: ClaudeCodeSettings = {
	autoLaunch: true,
	claudeCommand: "claude",
	shell: process.env.SHELL || "/bin/zsh",
	startDir: "vault",
	fontSize: 13,
	icon: "bot",
};

export class ClaudeCodeSettingTab extends PluginSettingTab {
	plugin: ClaudeCodePlugin;

	constructor(app: App, plugin: ClaudeCodePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Auto-launch Claude Code")
			.setDesc(
				"Run the Claude command automatically when the terminal opens.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoLaunch)
					.onChange(async (value) => {
						this.plugin.settings.autoLaunch = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Claude command")
			.setDesc(
				"Command written to the shell on launch. Use the full path if claude is not on your shell PATH.",
			)
			.addText((text) =>
				text
					.setPlaceholder("claude")
					.setValue(this.plugin.settings.claudeCommand)
					.onChange(async (value) => {
						this.plugin.settings.claudeCommand =
							value || "claude";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Shell")
			.setDesc("Login shell used to host the terminal.")
			.addText((text) =>
				text
					.setPlaceholder("/bin/zsh")
					.setValue(this.plugin.settings.shell)
					.onChange(async (value) => {
						this.plugin.settings.shell =
							value || process.env.SHELL || "/bin/zsh";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Working directory")
			.setDesc("Where the terminal starts.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("vault", "Vault root")
					.addOption("activeFile", "Active file's folder")
					.setValue(this.plugin.settings.startDir)
					.onChange(async (value) => {
						this.plugin.settings.startDir =
							value as ClaudeCodeSettings["startDir"];
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Icon")
			.setDesc("Icon for the sidebar tab, ribbon, and panel header.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("sparkles", "Sparkles")
					.addOption("bot", "Bot")
					.addOption("terminal", "Terminal")
					.addOption("asterisk", "Asterisk")
					.setValue(this.plugin.settings.icon)
					.onChange(async (value) => {
						this.plugin.settings.icon = value as ClaudeIcon;
						await this.plugin.saveSettings();
						this.plugin.applyIcon();
					}),
			);

		new Setting(containerEl)
			.setName("Font size")
			.setDesc("Terminal font size in pixels. Reopen the panel to apply.")
			.addText((text) =>
				text
					.setValue(String(this.plugin.settings.fontSize))
					.onChange(async (value) => {
						const n = Number(value);
						if (Number.isFinite(n) && n > 0) {
							this.plugin.settings.fontSize = n;
							await this.plugin.saveSettings();
						}
					}),
			);
	}
}
