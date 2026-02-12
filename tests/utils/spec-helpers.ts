import { fileURLToPath } from 'node:url';
import path from 'node:path';
import spawn, { type SubprocessError } from 'nano-spawn';
import type { FileTree } from 'fs-fixture';

const mantenPath = fileURLToPath(new URL('../..', import.meta.url));

export const installManten = {
	'node_modules/manten': ({ symlink }) => symlink(mantenPath),
} satisfies FileTree;

export const node = async (
	scriptPath: string,
	options?: {
		env?: Record<string, string>;
	},
) => spawn(
	process.execPath,
	[scriptPath],
	{
		env: {
			NO_COLOR: '1',
			...options?.env,
		},
		cwd: path.dirname(scriptPath),
	},
).catch(error => error as SubprocessError);
