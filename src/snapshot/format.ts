/**
 * Create a stable JSON string from a snapshots object
 * Keys are sorted for deterministic output
 */
export const stableJsonStringify = (snapshots: Record<string, string>): string => {
	const sortedKeys = Object.keys(snapshots).sort();

	const sorted: Record<string, string> = {};
	for (const key of sortedKeys) {
		sorted[key] = snapshots[key];
	}

	return JSON.stringify(sorted, null, 2);
};

/**
 * Format the snapshot summary message
 */
export const formatSnapshotSummary = (summary: {
	new: number;
	updated: number;
}): string => {
	const parts: string[] = [];

	if (summary.new > 0) {
		parts.push(`📸 ${summary.new} new`);
	}
	if (summary.updated > 0) {
		parts.push(`✏️ ${summary.updated} updated`);
	}

	return parts.length > 0 ? `\nSnapshots: ${parts.join(', ')}` : '';
};
