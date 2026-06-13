// Prepend @xterm/xterm's stylesheet into styles.css (idempotent).
// xterm.js will not render correctly without its CSS, and Obsidian only loads
// the plugin's single styles.css — so we vendor it in once.
import fs from "fs";

const SENTINEL = "/* XTERM-CSS-VENDORED */";
const XTERM_CSS = "node_modules/@xterm/xterm/css/xterm.css";
const STYLES = "styles.css";

const current = fs.readFileSync(STYLES, "utf8");
if (current.startsWith(SENTINEL)) {
	process.exit(0); // already vendored
}

if (!fs.existsSync(XTERM_CSS)) {
	console.error(
		`vendor-css: ${XTERM_CSS} not found. Run \`npm install\` first.`,
	);
	process.exit(1);
}

const xterm = fs.readFileSync(XTERM_CSS, "utf8");
fs.writeFileSync(STYLES, `${SENTINEL}\n${xterm}\n${current}`);
console.log("vendor-css: prepended xterm.css into styles.css");
