// src/utils/accountScope.js

/**
 * Resolve which accounts are in scope for a given scope id.
 *   - 'all' or empty → all active accounts (not archived)
 *   - specific id    → that account, only if it's active
 *
 * Used by both the burn rate engine and the commitments radar so
 * "which accounts count" is defined in exactly one place.
 */
export const resolveAccountScope = (accounts = [], scopeAccountId = 'all') => {
  const isAll = !scopeAccountId || scopeAccountId === 'all'
  const scopedAccounts = isAll
    ? accounts.filter(a => !a.is_archived)
    : accounts.filter(a => a.id === scopeAccountId && !a.is_archived)

  const accountIds = new Set(scopedAccounts.map(a => a.id))

  const scopeLabel = isAll
    ? 'All accounts'
    : (scopedAccounts[0]?.account_name || 'Account')

  return { isAll, scopedAccounts, accountIds, scopeLabel }
}