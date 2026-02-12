import { red } from 'ansis';

export const setProcessTimeout = (ms: number) => {
	const timeout = setTimeout(() => {
		// Set exit code and clear all timers to let process.on('exit') fire
		process.exitCode = 1;
		console.error(red(`✖ Process timed out after ${ms}ms`));

		// Force exit after a brief delay to allow exit handlers to run
		setImmediate(() => process.exit(1));
	}, ms);

	// Critical: unref ensures this timer doesn't prevent the process
	// from exiting if tests finish successfully before the timeout.
	timeout.unref();
};
