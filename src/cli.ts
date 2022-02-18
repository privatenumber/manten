import { promises as fs } from 'fs';
import { pathToFileURL } from 'url';
import { cli } from 'cleye';
import { fsWalk } from './utils/fs-walk';

const argv = cli({
	name: 'manten',
	parameters: ['[paths...]'],
	help: {
		description: 'ESM async test runner',
	},
});

const testFilePattern = /(?:test|\.(?:test|spec))\.[mc]?[jt]s$/;

(async () => {
	const { paths } = argv._;

	if (paths.length === 0) {
		paths.push(process.cwd());
	}

	for (const testPath of paths) {
		const fileStat = await fs.lstat(testPath);
		if (fileStat.isFile()) {
			console.log(testPath);
			await import(pathToFileURL(testPath).toString());
		} else {
			for await (const filePath of fsWalk(testPath)) {
				if (testFilePattern.test(filePath)) {
					console.log(filePath);
					await import(pathToFileURL(filePath).toString());
				}
			}
		}
	}
})();
