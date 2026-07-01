// src/utils/accountUtils.js
/**
 * Normalize account data from the view to have consistent 'id' field
 */
export const normalizeAccount = (account) => {
  if (!account) return null
  const { account_id, ...rest } = account
  return {
    id: account_id,
    ...rest
  }
}

export const normalizeAccounts = (accounts) => {
  if (!accounts || !Array.isArray(accounts)) return []
  return accounts.map(normalizeAccount)
}

/**
 * Get account ID consistently from any account object
 */
export const getAccountId = (account) => {
  if (!account) return null
  return account.id || account.account_id || null
}

/**
 * Find account by ID (handles both id and account_id)
 */
export const findAccountById = (accounts, id) => {
  if (!accounts || !id) return null
  return accounts.find(a => a.id === id || a.account_id === id)
}

/**
 * Get account name by ID
 */
export const getAccountName = (accounts, id) => {
  const account = findAccountById(accounts, id)
  return account?.account_name || 'Unknown'
}