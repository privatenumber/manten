import { test } from '../../dist/index.mjs';

console.log('MODULE LOADED');

(async () => {
	console.log('IIFE STARTED');
	await test('completed test', () => {
		console.log('completed');
	});

	await test('unfinished test', () => {
		console.log('started');
		// Exit immediately to simulate crash
		process.exit(1);
	});
})();
