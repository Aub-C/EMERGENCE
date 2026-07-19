import { lstat, readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const TEXT_EXTENSIONS = new Set([
  '', '.md', '.txt', '.json', '.jsonl', '.ndjson', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.css', '.scss', '.html', '.svg', '.xml', '.csv',
  '.py', '.rb', '.php', '.pl', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd', '.go', '.rs',
  '.java', '.kt', '.kts', '.c', '.cc', '.cpp', '.cxx', '.h', '.hpp', '.cs', '.swift', '.lua', '.sql',
  '.gitignore', '.dockerignore', '.editorconfig', '.sha256', '.sha512'
]);

// Formats a browser will render as a document. They are plain text, so the
// reader above accepts them, but they can carry executable content — which the
// shell-oriented rules below do not look for. These rules are the compensating
// control that lets risk-classifier.mjs treat `.svg` as a low-risk static
// asset. They are scoped to render targets so that a `<script>` inside a
// Markdown code sample or a source file is not mistaken for an active payload.
const MARKUP_EXTENSIONS = new Set(['.svg', '.html', '.htm']);

const MARKUP_RULES = [
  { id: 'markup-script-element', severity: 'hard-fail', regex: /<\s*script\b/i },
  { id: 'markup-foreign-object', severity: 'hard-fail', regex: /<\s*foreignObject\b/i },
  // Anchored inside a tag so element text content cannot trigger it.
  { id: 'markup-event-handler', severity: 'hard-fail', regex: /<[^>]+\son[a-z]{2,}\s*=/i },
  { id: 'markup-script-uri', severity: 'hard-fail', regex: /\bjavascript\s*:/i },
  // `href` only — a namespace declaration such as xmlns="http://…" is not a fetch.
  { id: 'markup-remote-reference', severity: 'hard-fail', regex: /\bhref\s*=\s*["']\s*(?:https?:)?\/\//i }
];

const SOURCE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.py', '.rb', '.php', '.pl', '.sh', '.bash', '.zsh',
  '.fish', '.ps1', '.bat', '.cmd', '.go', '.rs', '.java', '.kt', '.kts', '.c', '.cc', '.cpp', '.cxx',
  '.h', '.hpp', '.cs', '.swift', '.lua', '.yaml', '.yml', '.json', '.toml', '.xml'
]);

const IMAGE_MAGIC = [
  { ext: new Set(['.png']), bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: new Set(['.jpg', '.jpeg']), bytes: [0xff, 0xd8, 0xff] },
  { ext: new Set(['.gif']), ascii: 'GIF8' },
  { ext: new Set(['.webp']), asciiAt: [{ offset: 0, value: 'RIFF' }, { offset: 8, value: 'WEBP' }] },
  { ext: new Set(['.ico']), bytes: [0x00, 0x00, 0x01, 0x00] }
];

const DANGEROUS_RULES = [
  { id: 'reverse-shell-dev-tcp', severity: 'hard-fail', regex: /\/dev\/tcp\//i },
  { id: 'netcat-exec', severity: 'hard-fail', regex: /\b(?:nc|ncat|netcat)\b[^\n]{0,180}\s-e\s/i },
  { id: 'shell-download-pipe', severity: 'hard-fail', regex: /\b(?:curl|wget)\b[^\n|]{0,300}\|\s*(?:ba|z|k)?sh\b/i },
  { id: 'powershell-download-exec', severity: 'hard-fail', regex: /\b(?:iwr|invoke-webrequest|downloadstring)\b[^\n]{0,300}\b(?:iex|invoke-expression)\b/i },
  { id: 'base64-decode-exec', severity: 'hard-fail', regex: /base64\s+(?:--decode|-d)[^\n|]{0,200}\|\s*(?:ba|z|k)?sh\b/i },
  { id: 'crypto-miner', severity: 'hard-fail', regex: /\b(?:xmrig|stratum\+tcp|cryptonight|monero(?:d|o)?)\b/i },
  { id: 'credential-harvest', severity: 'hard-fail', regex: /(?:\.aws\/credentials|\.ssh\/id_(?:rsa|ed25519)|keychain|login\.keychain|credential\s*harvest)/i },
  { id: 'destructive-root-delete', severity: 'hard-fail', regex: /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+\/(?:\s|$)/ },
  { id: 'fork-bomb', severity: 'hard-fail', regex: /:\(\)\s*\{\s*:\|:\s*&\s*\}\s*;\s*:/ },
  { id: 'workflow-write-all', severity: 'hard-fail', regex: /permissions\s*:\s*write-all/i },
  { id: 'workflow-privileged-container', severity: 'hard-fail', regex: /(?:--privileged|privileged\s*:\s*true)/i },
  { id: 'workflow-pull-request-target-head', severity: 'warning', regex: /pull_request_target[\s\S]{0,3000}(?:pull_request\.head\.sha|refs\/pull\/\$\{\{)/i }
];

export async function scanChangedFiles({ root, changedFiles, changedEntries, policy }) {
  const candidateRoot = resolve(root);
  const findings = [];
  let totalBytes = 0;

  const entries = changedEntries ?? (changedFiles ?? []).map((path) => ({ path, status: 'modified' }));
  const uniqueEntries = [...new Map(entries.map((entry) => [normalizeRelative(entry.path), { path: normalizeRelative(entry.path), status: entry.status ?? 'modified' }])).values()].filter((entry) => entry.path);

  for (const entry of uniqueEntries) {
    const relative = entry.path;
    const absolute = safeResolve(candidateRoot, relative);
    if (!absolute) {
      findings.push(fail(relative, 'path-escape', 'path resolves outside candidate root'));
      continue;
    }

    let info;
    try {
      info = await lstat(absolute);
    } catch (error) {
      if (error.code === 'ENOENT' && entry.status === 'removed') {
        findings.push(pass(relative, 'deleted-path', 'deleted file requires no content scan'));
        continue;
      }
      if (error.code === 'ENOENT') {
        findings.push(fail(relative, 'missing-changed-path', `changed path is missing for status ${entry.status}`));
        continue;
      }
      findings.push(fail(relative, 'file-read-error', error.message));
      continue;
    }

    if (info.isSymbolicLink()) {
      findings.push(fail(relative, 'symbolic-link', 'symbolic links are not accepted from untrusted mutations'));
      continue;
    }
    if (!info.isFile()) {
      findings.push(fail(relative, 'non-regular-changed-path', 'changed path is not a regular file'));
      continue;
    }

    totalBytes += info.size;
    if (info.size > policy.limits.max_single_file_bytes) {
      findings.push(fail(relative, 'single-file-limit', `file is ${info.size} bytes`));
      continue;
    }

    const bytes = await readFile(absolute);
    const extension = extensionFor(relative);
    const allowedBinary = verifyAllowedBinary(extension, bytes, policy);
    const appearsBinary = bytes.includes(0);

    if (appearsBinary || !TEXT_EXTENSIONS.has(extension)) {
      if (!allowedBinary) findings.push(fail(relative, 'unexpected-binary', 'binary or unknown file type is not allowlisted'));
      else findings.push(pass(relative, 'allowed-binary', 'binary asset matches its declared safe image format'));
      continue;
    }

    const content = bytes.toString('utf8');
    const isSignatureDefinition = (policy.static_scan?.signature_definition_paths ?? []).some((pattern) => pathMatchesSimple(relative, pattern));
    if (isSignatureDefinition) {
      findings.push(pass(relative, 'trusted-signature-definition', 'owner-controlled scanner and policy definitions are inspected separately'));
      continue;
    }

    for (const pattern of policy.blocked_patterns ?? []) {
      if (new RegExp(pattern).test(content)) findings.push(fail(relative, 'secret-pattern', `matched protected secret pattern: ${pattern}`));
    }

    if (MARKUP_EXTENSIONS.has(extension)) {
      for (const rule of MARKUP_RULES) {
        if (rule.regex.test(content)) findings.push({ level: rule.severity, phase: 'static-security', file: relative, rule: rule.id, message: 'markup asset carries active content' });
      }
    }

    if (SOURCE_EXTENSIONS.has(extension) || relative.startsWith('.github/')) {
      for (const rule of DANGEROUS_RULES) {
        if (rule.regex.test(content)) findings.push({ level: rule.severity, phase: 'static-security', file: relative, rule: rule.id, message: 'matched suspicious executable behavior pattern' });
      }

      const longEncoded = content.match(/[A-Za-z0-9+/]{800,}={0,2}/g) ?? [];
      if (longEncoded.length > 0) findings.push(fail(relative, 'opaque-encoded-payload', 'contains an unexplained long encoded payload'));

      if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(content) && /(?:atob|base64|fromCharCode|Buffer\.from)/.test(content)) {
        findings.push(fail(relative, 'decoded-dynamic-execution', 'decodes data into dynamic code execution'));
      }
    }
  }

  if (totalBytes > policy.limits.max_changed_bytes) {
    findings.push(fail(null, 'changed-byte-limit', `changed files total ${totalBytes} bytes`));
  }

  return {
    accepted: findings.every((finding) => finding.level !== 'hard-fail'),
    totalBytes,
    findings
  };
}

function verifyAllowedBinary(extension, bytes, policy) {
  const allowed = new Set(policy.static_scan?.allowed_binary_extensions ?? []);
  if (!allowed.has(extension)) return false;
  const magic = IMAGE_MAGIC.find((entry) => entry.ext.has(extension));
  if (!magic) return false;
  if (magic.bytes) return magic.bytes.every((value, index) => bytes[index] === value);
  if (magic.ascii) return bytes.subarray(0, magic.ascii.length).toString('ascii') === magic.ascii;
  if (magic.asciiAt) return magic.asciiAt.every(({ offset, value }) => bytes.subarray(offset, offset + value.length).toString('ascii') === value);
  return false;
}


function pathMatchesSimple(path, pattern) {
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3).replace(/\/$/, '');
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  return path === pattern;
}

function safeResolve(root, relative) {
  const absolute = resolve(root, relative);
  return absolute === root || absolute.startsWith(`${root}${sep}`) ? absolute : null;
}

function normalizeRelative(path) {
  return normalize(String(path ?? '')).replace(/^([/\\])+/, '').replace(/\\/g, '/').trim();
}

function extensionFor(path) {
  const base = path.split('/').at(-1) ?? '';
  if (base.startsWith('.') && !base.slice(1).includes('.')) return base.toLowerCase();
  return extname(path).toLowerCase();
}

function fail(file, rule, message) {
  return { level: 'hard-fail', phase: 'static-security', file, rule, message };
}

function pass(file, rule, message) {
  return { level: 'pass', phase: 'static-security', file, rule, message };
}
