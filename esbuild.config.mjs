import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const production = process.argv[2] === "production";

const context = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	// node-pty and electron are loaded natively at runtime; obsidian is provided
	// by the host. Everything else (xterm.js) is bundled into main.js.
	external: [
		"obsidian",
		"electron",
		"node-pty",
		...builtins,
	],
	format: "cjs",
	platform: "node",
	target: "es2020",
	logLevel: "info",
	sourcemap: production ? false : "inline",
	treeShaking: true,
	minify: production,
	outfile: "main.js",
});

if (production) {
	await context.rebuild();
	await context.dispose();
} else {
	await context.watch();
}
