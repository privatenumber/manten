import { fileURLToPath } from 'node:url';
import { execaNode } from 'execa';
import type { FileTree } from 'fs-fixture';

const mantenPath = fileURLToPath(new URL('../..', import.meta.url));

export const installManten = {
	'node_modules/manten': ({ symlink }) => symlink(mantenPath),
} satisfies FileTree;

export const env = {
	NO_COLOR: '1',
};

export const node = (
	scriptPath: string,
	options?: { env?: Record<string, string> },
) => execaNode(scriptPath, {
	env: {
		...env,
		...options?.env,
	},
	reject: false,
});
