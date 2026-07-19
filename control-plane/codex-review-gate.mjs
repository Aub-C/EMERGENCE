export function evaluateAdversarialReview({ risk, reviews = [], labels = [], labelEvents = [], policy, headSha }) {
  if (!risk.codexRequired) {
    return { accepted: true, required: false, reason: 'risk level does not require adversarial model review' };
  }

  const config = policy.adversarial_review ?? {};
  const approvedLogins = new Set((config.approved_reviewer_logins ?? []).map(normalize));
  const marker = String(config.approval_marker ?? '').trim();
  const acceptedLabels = new Set(config.approval_labels ?? []);
  const labelMatch = labels.find((label) => acceptedLabels.has(typeof label === 'string' ? label : label?.name));

  // A review only counts when it approved the exact commit now at the head of the
  // pull request. Without that binding an agent could get a benign commit approved
  // and then push a malicious one under the same, still-"APPROVED", review.
  const normalizedHead = normalizeSha(headSha);
  const isApprovedReviewer = (review) => {
    const login = normalize(review?.user?.login ?? review?.author?.login ?? review?.login);
    const state = String(review?.state ?? '').toUpperCase();
    const body = String(review?.body ?? '');
    return approvedLogins.has(login) && state === 'APPROVED' && (!marker || body.includes(marker));
  };

  const reviewMatch = reviews.find(
    (review) => isApprovedReviewer(review) &&
      normalizedHead !== '' &&
      normalizeSha(review?.commit_id ?? review?.commitId) === normalizedHead
  );

  if (reviewMatch) {
    return { accepted: true, required: true, reason: 'approved adversarial review found', reviewer: reviewMatch?.user?.login ?? reviewMatch?.login };
  }

  const staleApproval = reviews.some(isApprovedReviewer);

  const fallbackAuthority = normalize(config.temporary_fallback_authority);
  const labelName = typeof labelMatch === 'string' ? labelMatch : labelMatch?.name;
  const lastLabelEvent = labelName
    ? labelEvents.filter((event) => event?.label?.name === labelName && ['labeled', 'unlabeled'].includes(event?.event)).at(-1)
    : null;
  const ownerAppliedActiveLabel = Boolean(
    labelMatch &&
    config.allow_maintainer_label_fallback === true &&
    fallbackAuthority &&
    lastLabelEvent?.event === 'labeled' &&
    normalize(lastLabelEvent?.actor?.login) === fallbackAuthority
  );

  if (ownerAppliedActiveLabel) {
    return {
      accepted: true,
      required: true,
      reason: 'temporary owner-controlled review label found',
      label: labelName,
      actor: lastLabelEvent.actor.login
    };
  }

  if (staleApproval) {
    return {
      accepted: false,
      required: true,
      reason: normalizedHead === ''
        ? 'an approved adversarial review exists but the current head commit is unknown, so its freshness cannot be verified'
        : 'an approved adversarial review exists but does not match the current head commit; re-review the latest commit'
    };
  }

  return {
    accepted: false,
    required: true,
    reason: 'high-risk mutation requires an approved adversarial Codex review'
  };
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeSha(value) {
  return String(value ?? '').trim().toLowerCase();
}
