// Changed-file inventories arrive as TSV lines: `path<TAB>status<TAB>previous_path`.
// The third column carries the rename/copy source (`previous_filename` from the
// GitHub pulls/files API). It must be classified alongside the new path — otherwise
// a rename that relocates a protected file escapes red-zone and owner-only matching
// because only the destination path is inspected. Single-column lists still parse.

export function parseChangedFilesTsv(text) {
  const entries = [];
  for (const rawLine of String(text ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const [path = '', rawStatus = 'modified', previousPath = ''] = line.split('\t');
    if (!path.trim()) continue;
    entries.push({
      path: path.trim(),
      status: normalizeStatus(rawStatus.trim()),
      previousPath: previousPath.trim() || null
    });
  }
  return entries;
}

export function allChangedPaths(entries) {
  return [...new Set(entries.flatMap((entry) => [entry.path, entry.previousPath]).filter(Boolean))];
}

function normalizeStatus(value) {
  if (value === 'D' || value === 'removed') return 'removed';
  if (value === 'A' || value === 'added') return 'added';
  return 'modified';
}
