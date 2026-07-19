// `labels` and `labelEvents` are still accepted so callers need not change, but
// they no longer grant approval. A label is attached to a pull request, not to a
// commit, so an approval expressed as a label survives a push and can be spent
// on code that was never reviewed. Approval must be commit-bound; a GitHub
// review is, and GitHub additionally dismisses stale reviews on push.
export function evaluateAdversarialReview({ risk, reviews = [], comments = [], labels = [], labelEvents = [], policy, headSha }) {
  if (!risk.codexRequired) {
    return { accepted: true, required: false, reason: 'risk level does not require adversarial model review' };
  }

  const config = policy.adversarial_review ?? {};
  const approvedLogins = new Set((config.approved_reviewer_logins ?? []).map(normalize));
  const marker = String(config.approval_marker ?? '').trim();
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

  // GitHub forbids approving your own pull request, so a review cannot express
  // owner approval of an owner-authored mutation. A comment that names the exact
  // head commit carries the same binding the review path relies on: the SHA is
  // in the text, so a later push simply stops matching. This is what the label
  // path lacked — a label names a pull request, not a commit.
  const namesHead = (body) => {
    if (normalizedHead === '') return false;
    const tokens = String(body ?? '').match(/[0-9a-fA-F]{7,40}/g) ?? [];
    return tokens.some((token) => normalizedHead.startsWith(normalizeSha(token)));
  };

  const commentMatch = comments.find((comment) => {
    const login = normalize(comment?.user?.login ?? comment?.author?.login ?? comment?.login);
    const body = String(comment?.body ?? '');
    return approvedLogins.has(login) && (!marker || body.includes(marker)) && namesHead(body);
  });

  if (commentMatch) {
    return {
      accepted: true,
      required: true,
      reason: 'commit-bound approval comment found',
      reviewer: commentMatch?.user?.login ?? commentMatch?.login
    };
  }

  const staleApproval = reviews.some(isApprovedReviewer);

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
