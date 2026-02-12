import path from 'node:path';
import fs from 'node:fs';
import { inspect } from 'node:util';
import { asyncContext } from '../async-context.ts';
import { stableJsonStringify } from './format.ts';

// Serialize value to a stable string representation
export const serialize = (value: unknown): string => inspect(value, {
	depth: null,
	sorted: true,
	breakLength: 80,
	maxArrayLength: Infinity,
	maxStringLength: Infinity,
});

// Single global in-memory snapshot store (undefined until loaded)
let snapshots: Record<string, string> | undefined;
const newSnapshots = new Set<string>();
const updatedSnapshots = new Set<string>();

// Track which test instance is currently using each title (for duplicate detection)
const currentTestForTitle = new Map<string, unknown>();

// Track if directory has been created to avoid redundant mkdirSync calls
let directoryChecked = false;

// Configuration - initialized with defaults
let snapshotPath = process.env.MANTEN_SNAPSHOT_PATH || '.manten.snap';
const updateMode = process.env.MANTEN_UPDATE_SNAPSHOTS === '1' || process.env.MANTEN_UPDATE_SNAPSHOTS === 'true';

// Load snapshots from disk (synchronous for simplicity and consistency with save)
const loadSnapshots = (): void => {
	// If already loaded, return immediately
	if (snapshots !== undefined) {
		return;
	}

	try {
		// Resolve path relative to current working directory
		const resolvedPath = path.resolve(snapshotPath);
		const content = fs.readFileSync(resolvedPath, 'utf8');

		// Parse JSON file directly - no conversion needed
		snapshots = JSON.parse(content);
	} catch {
		// File doesn't exist or is invalid, start fresh
		snapshots = {};
	}
};

// Create a snapshot context for a test (counter is local to closure)
export const createSnapshotContext = (testTitle: string, testInstance: unknown) => {
	// Load snapshots on first use
	if (snapshots === undefined) {
		loadSnapshots();
	}

	// Check if this test title is being used by a different test instance
	const existingInstance = currentTestForTitle.get(testTitle);
	if (existingInstance !== undefined && existingInstance !== testInstance) {
		throw new Error(
			`Duplicate test title detected: "${testTitle}". `
			+ 'Test titles must be unique across all files when using global snapshots.',
		);
	}
	currentTestForTitle.set(testTitle, testInstance);

	// Local counter for this test (resets on retry)
	let counter = 0;

	const expectSnapshot = (value: unknown, name?: string): void => {
		// Create unique snapshot key
		let snapshotKey: string;
		if (name) {
			snapshotKey = name;
		} else {
			counter += 1;
			snapshotKey = `${testTitle} ${counter}`;
		}

		// Serialize the value to a stable string
		const serialized = serialize(value);

		// Check for duplicate keys (if already processed in this run)
		if (newSnapshots.has(snapshotKey) || updatedSnapshots.has(snapshotKey)) {
			// If value matches, it's a retry - just return (already tracked)
			const existing = snapshots![snapshotKey];
			if (serialized === existing) {
				return;
			}
			throw new Error(
				`Duplicate snapshot key: "${snapshotKey}". Test names must be unique across all test files.`,
			);
		}

		// New snapshot (not in file yet)
		if (!Object.hasOwn(snapshots!, snapshotKey)) {
			snapshots![snapshotKey] = serialized;
			newSnapshots.add(snapshotKey);
			return;
		}

		const existing = snapshots![snapshotKey];

		if (serialized === existing) {
			return;
		}

		if (updateMode) {
			snapshots![snapshotKey] = serialized;
			updatedSnapshots.add(snapshotKey);
		} else {
			throw new Error(
				`Snapshot mismatch for "${snapshotKey}"\n`
				+ `Expected:\n${existing}\n\n`
				+ `Received:\n${serialized}`,
			);
		}
	};

	const reset = () => {
		counter = 0;
	};

	return {
		expectSnapshot,
		reset,
	};
};

// Save snapshots to disk (synchronous for process.exit handler)
export const saveSnapshots = (): void => {
	// Only save if we have new or updated snapshots
	if (newSnapshots.size === 0 && updatedSnapshots.size === 0) {
		return;
	}

	// If snapshots was never initialized, nothing to save
	if (!snapshots) {
		return;
	}

	// Resolve path relative to current working directory
	const resolvedPath = path.resolve(snapshotPath);

	// Ensure directory exists (only check once per process)
	const directory = path.dirname(resolvedPath);
	if (!directoryChecked) {
		fs.mkdirSync(directory, { recursive: true });
		directoryChecked = true;
	}

	// Generate snapshot file content with stable JSON stringification
	const content = stableJsonStringify(snapshots);

	fs.writeFileSync(resolvedPath, content, 'utf8');
};

export const getSnapshotSummary = () => ({
	new: newSnapshots.size,
	updated: updatedSnapshots.size,
});

// Standalone API that reads from ALS
export const expectSnapshot = (value: unknown, name?: string): void => {
	const store = asyncContext.getStore();
	if (!store?.snapshotContext) {
		throw new Error('expectSnapshot() must be called within a test()');
	}
	store.snapshotContext.expectSnapshot(value, name);
};

type Config = {
	snapshotPath?: string;
};

// Public API for configuration
export const configure = (
	config: Config,
) => {
	// Check if snapshots have already been loaded
	if (config.snapshotPath !== undefined && snapshots !== undefined) {
		throw new Error(
			'configure() must be called before any snapshot tests are run. '
			+ 'Snapshots have already been loaded from the default location. '
			+ 'Please ensure configure() is called at the beginning of your test suite.',
		);
	}

	if (config.snapshotPath !== undefined) {
		snapshotPath = config.snapshotPath;
	}
};
