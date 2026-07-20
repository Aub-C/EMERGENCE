// Turn a rejection into something a contributor can act on.
//
// The gate is precise about what it refuses and silent about what to do next.
// A contributing agent that cannot read the reason does the only thing left to
// it: guesses. Observed in practice — an agent deleted a checksum manifest, a
// security-positive artifact, because a scanner defect rejected the file
// extension and nothing said why. Bad feedback made the contribution worse.
//
// The distinction that matters most is not severity, it is AUTHORITY. "You may
// not change this at all" and "this needs review" demand completely different
// responses, and a contributor told only that something failed will try to fix
// the one they cannot — retrying forever against a hard-fail by design.
//
// So authority is resolved conservatively, in this order:
//
//   1. the file is protected  -> owner   (path authority outranks everything)
//   2. the rule is recognised -> contributor
//   3. anything else          -> owner   (fail-safe)
//
// Rule 3 is the load-bearing one. Being wrongly told to ask the owner costs a
// question. Being wrongly told "you can fix this" costs a retry loop against a
// wall, which is the failure this module was written to end.

const CATALOG = {
  'unexpected-binary': {
    why: 'The scanner allowlists file types, and this extension is not recognised.',
    fix: 'Use a recognised text or image extension, or drop the file from this mutation.'
  },
  'symbolic-link': {
    why: 'Symbolic links can point outside the repository and are not accepted from untrusted mutations.',
    fix: 'Commit a regular file instead of a link.'
  },
  'secret-pattern': {
    why: 'The content matches a credential pattern.',
    fix: 'Remove it and rotate the credential. Assume anything committed is already public.'
  },
  'markup-script-element': {
    why: 'A rendered asset contains a script element.',
    fix: 'Static assets must not carry executable content. Remove the script.'
  },
  'markup-event-handler': {
    why: 'A rendered asset carries an inline event handler.',
    fix: 'Remove the on* attribute. Static assets must not execute.'
  },
  'markup-foreign-object': {
    why: 'A vector asset embeds foreign content, which can host arbitrary markup.',
    fix: 'Remove the foreignObject element.'
  },
  'markup-script-uri': {
    why: 'A rendered asset uses a script URI.',
    fix: 'Use an ordinary link target, or remove the link.'
  },
  'markup-remote-reference': {
    why: 'A rendered asset references a remote resource, which loads content this project does not control.',
    fix: 'Inline the resource or drop the reference.'
  },
  'vendor-attribution': {
    why: 'A rendered page names an AI vendor or model. Project law keeps those off presentation surfaces.',
    fix: 'Record the authoring agent in a provenance file instead. Nothing is hidden — it moves to where it belongs.'
  },
  'opaque-encoded-payload': {
    why: 'The file contains a long encoded blob with no explanation.',
    fix: 'Commit the source form, or explain the payload in the pull request body.'
  },
  'decoded-dynamic-execution': {
    why: 'The code decodes data and executes it, which hides behaviour from review.',
    fix: 'Express the behaviour directly in source.'
  },
  'missing-changed-path': {
    why: 'A file listed as changed is not present in the checkout.',
    fix: 'Push the missing file, or remove it from the mutation.'
  },
  'single-file-limit': { why: 'A single file exceeds the size limit.', fix: 'Split or shrink it.' },
  'changed-byte-limit': { why: 'The mutation changes more bytes than the limit allows.', fix: 'Split it into smaller mutations.' },

  // Policy-phase rules. These are the most common rejections a new contributor
  // meets, and every one of them is theirs to fix. Before they were catalogued
  // they fell to the fail-safe and were reported as owner business, which told
  // the contributor to stop and ask about the one thing they could have fixed
  // in a minute.
  'required-file-missing': {
    why: 'A file the project requires every mutation to keep is missing, unreadable, or is not a regular file.',
    fix: 'Restore the file. If your mutation intends to remove it, it is a rule change and belongs in a suggestion to the owner.'
  },
  'candidate-provenance-invalid': {
    why: 'Every mutation declares who made it in `.emergence/candidate.json`, and this one is missing, malformed, or incomplete.',
    fix: 'Add the file with `agent.name`, `intent`, and the four attestations set to true. An existing merged mutation is the easiest template.'
  },
  'candidate-attestation': {
    why: 'A required attestation in `.emergence/candidate.json` is not set to true.',
    fix: 'Set the named attestation to true — and read what you are attesting to first. It is a claim, not a checkbox.'
  },
  'provenance-actor-mismatch': {
    why: 'The `github_actor` declared in the provenance file is not the account that opened this pull request.',
    fix: 'Set `agent.github_actor` to the account opening the pull request, or leave it out.'
  },
  'pull-request-attestation': {
    why: 'The pull request body is missing required disclosure sections or attestations.',
    fix: 'Edit the pull request description to add exactly what is listed below. The headings and the attestation lines are matched literally, so copy them as written.',
    // The gate already knows precisely what is absent. Naming it here is the
    // difference between a remedy and a scavenger hunt through an Actions log.
    // The attestation lines contain backticks of their own, so they are fenced
    // by the same helper that fences file paths rather than by a bare tick.
    detail: (finding) => [
      ...(finding.missing_sections ?? []).map((section) => `missing section: ${code(section)}`),
      ...(finding.missing ?? []).map((line) => `missing attestation: ${code(`- [x] ${line}`)}`)
    ],
    // preflight reads changed paths; it never sees the pull request body.
    preflightDetects: false
  },
  'identity-denied': {
    why: 'An identity declared by this mutation is on the project denylist.',
    fix: 'This is an enforcement decision, not a defect. Raise it with the owner.',
    authority: 'owner'
  },
  // Behaviour rules. Every one of these is the contributor's to fix, including
  // — especially including — the false positives. A document that merely
  // mentions a download-and-run pipeline trips the same rule as a script that
  // performs one, and the contributor is the only one who can tell the gate
  // apart from the truth by rewording or moving it.
  'reverse-shell-dev-tcp': {
    why: 'The content matches a reverse-shell pattern.',
    fix: 'Remove it. If this is documentation describing the pattern rather than performing it, put the example in a fenced code block in the pull request body instead of in a scanned file.'
  },
  'netcat-exec': {
    why: 'The content invokes netcat with command execution.',
    fix: 'Remove it. Describe the technique in prose if the intent is documentation.'
  },
  'shell-download-pipe': {
    why: 'The content downloads a remote script and pipes it straight into a shell, which runs code nobody reviewed.',
    fix: 'Fetch to a file, check it in or verify a digest, then run it. If this is documentation, reword it so it is not a runnable line.'
  },
  'powershell-download-exec': {
    why: 'The content downloads and immediately executes a remote payload.',
    fix: 'Remove it, or fetch and verify before running.'
  },
  'base64-decode-exec': {
    why: 'The content decodes data and pipes it into a shell, which hides the behaviour from review.',
    fix: 'Express the behaviour directly in source.'
  },
  'crypto-miner': {
    why: 'The content matches a cryptocurrency miner.',
    fix: 'Remove it. If the match is incidental — a word in prose — reword it.'
  },
  'credential-harvest': {
    why: 'The content references a credential store such as an SSH key, cloud credentials file, or keychain.',
    fix: 'Remove the reference. Nothing here needs to read a developer\'s credentials.'
  },
  'destructive-root-delete': {
    why: 'The content matches a recursive delete rooted at `/`.',
    fix: 'Remove it, or scope the path so it cannot resolve to the filesystem root.'
  },
  'fork-bomb': {
    why: 'The content matches a fork bomb.',
    fix: 'Remove it.'
  },
  'workflow-write-all': {
    why: 'A workflow requests blanket write permissions, which hands every token the maximum scope.',
    fix: 'Name only the permissions the job needs. Note that workflow files are owner-only here in any case.'
  },
  'workflow-privileged-container': {
    why: 'A workflow requests a privileged container, which escapes the usual isolation.',
    fix: 'Drop the privileged flag. Note that workflow files are owner-only here in any case.'
  },
  'workflow-pull-request-target-head': {
    why: 'A workflow uses `pull_request_target` while checking out the pull request head, which runs untrusted code with a privileged token — the standard privilege-escalation footgun.',
    fix: 'Use `pull_request`, or do not check out the head. Note that workflow files are owner-only here in any case.'
  },

  'owner-only-path': {
    why: 'This mutation changes project law, which only the owner may change.',
    fix: 'Remove those files from this mutation. Raise a rule suggestion for the owner instead.',
    authority: 'owner'
  },
  'policy-mirror-changed': {
    why: 'The project-law mirror no longer matches the trusted observer copy.',
    fix: 'Restore the mirror. If it needs to change, that is a rule change and only the owner can make it.',
    authority: 'owner'
  }
};

// Exported so a test can hold the catalogue against the rules the gate can
// actually emit. Two lists that must agree will not stay agreed on their own.
export const KNOWN_RULES = Object.freeze(Object.keys(CATALOG));

const PROTECTED = {
  why: 'This file is project law. Contributor changes to it fail closed by design.',
  fix: 'Remove it from this mutation. Raise a rule suggestion for the owner instead.'
};

// Red-zone is wider than project law: it also covers workflows, gate logic,
// contributor documentation, and the pull-request template. Those are
// owner-controlled, but calling a PR template "project law" is false, and a
// contributor who catches one false statement discounts the true ones around
// it. Same authority, honest reason.
const GOVERNED = {
  why: 'This file is owner-controlled governance. It is not project law, but only the owner may change it, so contributor changes to it fail closed.',
  fix: 'Remove it from this mutation. If the change is worth making, describe it to the owner and let them make it.'
};

const UNDETERMINED = {
  why: 'The gate rejected this and no specific guidance is recorded for the rule, so it is reported as owner business rather than guessed at.',
  fix: 'Raise it with the owner, naming the rule and the file. Do not work around it — a rule with no published remedy is more likely law than defect.'
};

// Why a file raises the risk level. Same categories the local preflight
// reports, from the same classifier fields, so the two cannot drift.
const RISK_REASONS = [
  ['executableFiles', 'executable code — runs in CI, so it earns adversarial review'],
  ['dependencyFiles', 'dependency manifest — supply-chain surface'],
  ['workflowFiles', 'workflow — can change what the gate itself does'],
  ['unknownFiles', 'unrecognised file type — the classifier cannot judge it as a static asset']
];

// A finding message is written by the gate and rendered on a PUBLIC pull
// request. Gate messages today name rules and configured patterns, never
// matched content, and they must stay that way — anything a rule puts in
// `message` is published. This bound is the belt to that braces: a message is
// clipped to one line and a fixed length, so a rule that someday embeds more
// than it should leaks a fragment rather than a file.
const MESSAGE_LIMIT = 200;

// A gate message may carry a filesystem error raised inside the observer's own
// runner, whose working layout is nobody's business on a public pull request.
const ABSOLUTE_PATH = /(?:\/(?:tmp|private|var|home|Users|root)|[A-Za-z]:\\)[^\s'"]*/g;

function summarise(message) {
  const flat = String(message).replace(/\s+/g, ' ').replace(ABSOLUTE_PATH, '<path>').trim();
  return flat.length > MESSAGE_LIMIT ? `${flat.slice(0, MESSAGE_LIMIT)}…` : flat;
}

// A contributor controls their own file paths, and this text is rendered on a
// public pull request by a credentialed App. A backtick in a path would close
// the code span and leave the rest as live markdown: an `@mention` that pages a
// real person, a link that appears to come from the observer. Markdown's own
// rule is the fix — a span may be fenced by any run of backticks, so fence with
// one longer than anything inside the value.
// Some blockers are properties of the mutation as a whole — an incomplete
// pull-request body has no file to point at. Rendering those as a code span
// invented a filename that does not exist.
// A catalogue entry may name what is missing, but it is reading a finding shaped
// by another module. A remedy that throws would take the whole comment with it.
function safeDetail(fn, finding) {
  try {
    const lines = fn(finding);
    return Array.isArray(lines) ? lines.filter((line) => typeof line === 'string' && line.trim()).map(summarise) : [];
  } catch {
    return [];
  }
}

function subject(file) {
  return file ? code(file) : 'this pull request';
}

function code(value) {
  const flat = String(value ?? '').replace(/\s+/g, ' ').trim() || 'this pull request';
  const longest = Math.max(0, ...(flat.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(longest + 1);
  const pad = flat.startsWith('`') || flat.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${flat}${pad}${fence}`;
}

export function explainRejection({ findings, risk, policy } = {}) {
  const safeFindings = Array.isArray(findings) ? findings.filter(Boolean) : [];
  const safeRisk = risk && typeof risk === 'object' ? risk : {};

  const ownerOnlyFiles = new Set(safeRisk.ownerOnlyFiles ?? []);
  const protectedPaths = new Set([
    ...ownerOnlyFiles,
    ...(safeRisk.redZoneFiles ?? [])
  ]);

  const contributor = [];
  const owner = new Map();

  for (const file of protectedPaths) {
    const isLaw = ownerOnlyFiles.has(file);
    owner.set(file, {
      file,
      rule: isLaw ? 'owner-only-path' : 'red-zone-path',
      ...(isLaw ? PROTECTED : GOVERNED)
    });
  }

  for (const finding of safeFindings) {
    if (finding.level !== 'hard-fail') continue;
    const file = finding.file ?? null;

    // 1. Path authority outranks the rule. A secret in policy.json is still
    //    not a file a contributor may edit.
    if (file && protectedPaths.has(file)) continue;

    // The owner-authority check reports the whole mutation at once, so when the
    // offending paths are already listed by name it is the same fact stated
    // twice — and the named version is the useful one.
    if (finding.rule === 'owner-only-path' && !file && protectedPaths.size > 0) continue;

    // 2. A recognised rule carries a published remedy. Most are the
    //    contributor's; a few are catalogued precisely because they are NOT,
    //    and saying "try again" to those would be its own retry loop.
    const entry = CATALOG[finding.rule];
    if (entry) {
      const detail = summarise(finding.message ?? '');
      const why = detail && !entry.why.includes(detail) ? `${entry.why} (${detail})` : entry.why;
      const specifics = entry.detail ? safeDetail(entry.detail, finding) : [];
      const remedy = {
        file,
        rule: finding.rule,
        why,
        fix: entry.fix,
        detail: specifics,
        preflightDetects: entry.preflightDetects !== false
      };
      if (entry.authority === 'owner') owner.set(`${file ?? 'mutation'}:${finding.rule}:${detail}`, remedy);
      else contributor.push(remedy);
      continue;
    }

    // 3. Fail-safe. Authority is undetermined, so it is the owner's.
    //
    // The message is part of the key: policy findings often carry neither a
    // file nor a rule, and keying without it collapsed every one of them into
    // a single remedy — the contributor fixed one blocker, pushed, and met the
    // next, which is the serialised retry loop this module exists to end.
    const detail = summarise(finding.message ?? '');
    const key = `${file ?? 'mutation'}:${finding.rule ?? 'unknown'}:${detail}`;
    if (!owner.has(key)) {
      owner.set(key, {
        file,
        rule: finding.rule ?? 'unknown',
        why: detail ? `${detail}. ${UNDETERMINED.why}` : UNDETERMINED.why,
        fix: UNDETERMINED.fix
      });
    }
  }

  // Files that are merely waiting on review. A protected file is excluded:
  // it is not waiting, it is refused.
  const review = [];
  const seenReview = new Set();
  for (const [field, why] of RISK_REASONS) {
    for (const file of safeRisk[field] ?? []) {
      if (protectedPaths.has(file) || seenReview.has(file)) continue;
      seenReview.add(file);
      review.push({ file, why });
    }
  }

  const needsReview = safeRisk.codexRequired === true;
  const ownerItems = [...owner.values()];

  return {
    contributor,
    owner: ownerItems,
    review,
    needsReview,
    riskLevel: safeRisk.level ?? 'unknown',
    approvalMarker: policy?.adversarial_review?.approval_marker ?? '',
    // Nothing to say is itself worth knowing: it means the rejection came from
    // somewhere this module does not model, and silence would be misleading.
    explained: contributor.length > 0 || ownerItems.length > 0 || needsReview
  };
}

export function renderRejection(report, { headSha, ownerNotified = false } = {}) {
  const shortSha = typeof headSha === 'string' && headSha ? headSha.slice(0, 7) : null;

  if (!report?.explained) {
    return [
      'This mutation was rejected, but no specific cause was recorded here.',
      '',
      'Check the failing check\'s log, and raise it with the owner if the reason is not clear. A rejection this file cannot explain is worth reporting — it usually means the gate grew a rule and its remedy was not written down.'
    ].join('\n');
  }

  const lines = [];
  lines.push(shortSha ? `Admission verdict for \`${shortSha}\`.` : 'Admission verdict.', '');

  if (report.contributor.length > 0) {
    lines.push(`### You can fix ${report.contributor.length === 1 ? 'this' : 'these'}`, '');
    for (const item of report.contributor) {
      lines.push(`**${subject(item.file)}** — ${item.rule}`, item.why, `→ ${item.fix}`);
      if (item.detail?.length) {
        lines.push('');
        for (const line of item.detail) lines.push(`- ${line}`);
      }
      lines.push('');
    }
  }

  if (report.owner.length > 0) {
    lines.push(`### You cannot fix ${report.owner.length === 1 ? 'this' : 'these'}`, '');
    for (const item of report.owner) {
      lines.push(`**${subject(item.file)}**`, item.why, `→ ${item.fix}`, '');
    }
  }

  if (report.needsReview) {
    lines.push('### Held for review', '');
    if (report.contributor.length === 0 && report.owner.length === 0) {
      lines.push(`Nothing here is wrong. This mutation is **${report.riskLevel}** risk, so it needs an approving review before it can merge.`);
    } else {
      lines.push(`This mutation is **${report.riskLevel}** risk, so it also needs an approving review before it can merge.`);
    }
    if (report.review.length > 0) {
      lines.push('', 'These are what raised it. You may change them — they simply wait:', '');
      for (const item of report.review) lines.push(`- ${code(item.file)} — ${item.why}`);
    }
    // Only the caller knows whether the owner was actually paged. Asserting it
    // blindly was a lie in the case where the owner had already reviewed and
    // the mutation was rejected for something else entirely.
    lines.push('', ownerNotified
      ? 'The owner has been notified. No action is needed from you on this part.'
      : 'No action is needed from you on this part.', '');
  }

  const splittable = report.contributor.length > 0 || report.review.length > 0;
  if (splittable && (report.owner.length > 0 || report.needsReview)) {
    lines.push(
      'Splitting the parts you can fix into their own pull request lets them proceed without waiting on the rest.',
      ''
    );
  }

  // preflight classifies changed paths. Recommending it against a blocker it
  // structurally cannot see would send the contributor to a green check and
  // leave them no wiser.
  if (report.contributor.some((item) => item.preflightDetects !== false) || report.review.length > 0) {
    lines.push('Run `npm run preflight` before pushing again — it reports the same verdict, from the same classifier, without spending a pull request.', '');
  }
  lines.push('```json', JSON.stringify({
    verdict: 'blocked',
    riskLevel: report.riskLevel,
    contributorCanFix: report.contributor.length,
    ownerOnly: report.owner.length,
    heldForReview: report.needsReview,
    headSha: headSha ?? null
  }, null, 2), '```');

  return lines.join('\n');
}
