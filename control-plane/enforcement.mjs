// Escalation ladder for repeat gate-bypass attempts.
//
// This is a PURE decision function. It performs no side effects: it does not read or
// write strike state, does not touch the denylist, and does not call the GitHub API.
// Those actions belong to the external observer, which holds the append-only strike
// store and the privileged block/report token that candidate code must never reach.
// The observer feeds this function the prior strike count and the declared identities,
// then executes whatever action it returns.
//
// Law alignment (RULES.md): a scanner finding alone is not proof of misconduct, so a
// single ambiguous signal never bans. Only a *repeat* confirmed prohibited-capability
// attempt, after a warning, reaches the ban rung. Ban evasion — a denied or linked
// identity reappearing — is itself a separate violation and escalates immediately.

export function decideEnforcement({
  evasion = {},
  priorBanEligibleStrikes = 0,
  identities = [],
  alreadyDenied = false,
  policy = {}
}) {
  const config = policy.enforcement?.escalation ?? {};
  const banThreshold = Number.isInteger(config.ban_threshold) ? config.ban_threshold : 2;
  const accountBlockMode = config.account_block === 'automatic' ? 'automatic' : 'owner-confirmed';
  const reportAbuse = config.report_abuse !== false;
  const uniqueIdentities = [...new Set(identities.filter(Boolean).map((value) => String(value).trim().toLowerCase()))];

  // Ban evasion: a previously denied (or materially linked) identity is back.
  if (alreadyDenied) {
    return action('ban', {
      reason: 'ban evasion: a denied or linked identity reappeared',
      strike: priorBanEligibleStrikes,
      denylist_add: uniqueIdentities,
      account_block: accountBlockMode === 'automatic' ? 'automatic' : 'recommended',
      report_abuse: reportAbuse
    });
  }

  // No confirmed prohibited-capability attempt. Gate/governance tampering is detected
  // and surfaced for owner review, but is not auto-banned.
  if (!evasion.ban_eligible) {
    if (evasion.detected) {
      return action('flag', {
        reason: 'gate or governance modification flagged for owner review',
        strike: priorBanEligibleStrikes
      });
    }
    return action('none', { reason: 'no evasion detected', strike: priorBanEligibleStrikes });
  }

  const strike = priorBanEligibleStrikes + 1;

  if (strike < banThreshold) {
    return action('warn', {
      reason: `ban-eligible bypass attempt (strike ${strike} of ${banThreshold}); warned before enforcement`,
      strike
    });
  }

  return action('ban', {
    reason: `repeat ban-eligible bypass attempt (strike ${strike}) after warning`,
    strike,
    denylist_add: uniqueIdentities,
    account_block: accountBlockMode === 'automatic' ? 'automatic' : 'recommended',
    report_abuse: reportAbuse
  });
}

function action(name, extra) {
  return {
    action: name,
    reason: extra.reason,
    strike: extra.strike ?? 0,
    denylist_add: extra.denylist_add ?? [],
    account_block: extra.account_block ?? 'none',
    report_abuse: extra.report_abuse ?? false
  };
}
