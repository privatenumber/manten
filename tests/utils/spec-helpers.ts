import { fileURLToPath } from 'node:url';
import { execaNode } from 'execa';
import type { FileTree } from 'fs-fixture';

const mantenPath = fileURLToPath(new URL('../..', import.meta.url));

export const installManten = {
	'node_modules/manten': ({ symlink }) => symlink(mantenPath),
} satisfies FileTree;

export const node = (
	scriptPath: string,
	options?: { env?: Record<string, string | undefined> },
) => execaNode(scriptPath, {
	env: {
		NO_COLOR: '1',
		...options?.env,
	},
	extendEnv: false, // Don't inherit parent process env
	reject: false,
});
