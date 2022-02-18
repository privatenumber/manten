import { promises as fs } from 'fs';
import path from 'path';

export async function* fsWalk(
	directoryPath: string,
	excludeDirectories = [
		/^\./,
		'node_modules',
	],
): AsyncGenerator<string> {
	const currentDirectory = await fs.opendir(directoryPath);
	const directories: string[] = [];

	for await (const dirent of currentDirectory) {
		const { name } = dirent;
		const direntPath = path.join(directoryPath, name);

		if (dirent.isFile()) {
			yield direntPath;
		}

		if (
			dirent.isDirectory()
			&& !excludeDirectories.some(pattern => (
				typeof pattern === 'string'
					? pattern === name
					: pattern.test(name)
			))
		) {
			directories.push(direntPath);
		}
	}

	// Iterate over directories after files
	for (const childDirectoryPath of directories) {
		yield* fsWalk(childDirectoryPath);
	}
}
