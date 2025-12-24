import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execaNode } from 'execa';
import type { FileTree } from 'fs-fixture';

const mantenPath = fileURLToPath(new URL('../..', import.meta.url));

export const installManten = {
	'node_modules/manten': ({ symlink }) => symlink(mantenPath),
} satisfies FileTree;

export const node = (
	scriptPath: string,
	options?: {
		env?: Record<string, string | undefined>;
		reject?: boolean;
	},
) => execaNode(scriptPath, {
	env: {
		NO_COLOR: '1',
		...options?.env,
	},
	// Set cwd to the directory containing the test script
	cwd: path.dirname(scriptPath),
	extendEnv: false, // Don't inherit parent process env
	reject: options?.reject ?? false,
	// Don't inherit tsx loaders from parent process
	nodeOptions: [],
});
