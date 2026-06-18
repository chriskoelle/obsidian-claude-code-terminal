// Restore the execute bit on node-pty's prebuilt `spawn-helper`.
//
// node-pty 1.x ships an N-API prebuilt binary plus a `spawn-helper` executable
// for each unix platform under node_modules/node-pty/prebuilds/<platform>-<arch>.
// The published tarball can land `spawn-helper` without its execute bit, and
// without it node-pty's `pty.fork` fails with `posix_spawnp failed`. npm strips
// modes on extraction in some setups, so re-`chmod +x` after every install.
//
// Cross-platform safe: Windows has no spawn-helper, so this is a no-op there.
import fs from "fs";
import path from "path";

const PREBUILDS = "node_modules/node-pty/prebuilds";

if (!fs.existsSync(PREBUILDS)) {
	// node-pty not installed (or no prebuilds for this version) — nothing to do.
	process.exit(0);
}

let fixed = 0;
for (const dir of fs.readdirSync(PREBUILDS)) {
	const helper = path.join(PREBUILDS, dir, "spawn-helper");
	if (!fs.existsSync(helper)) continue;
	// 0o755: rwxr-xr-x — owner can write, everyone can read+execute.
	fs.chmodSync(helper, 0o755);
	fixed++;
}

if (fixed > 0) {
	console.log(`fix-pty-helper: made ${fixed} spawn-helper binary(ies) executable`);
}
