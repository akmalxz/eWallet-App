// src/utils/transactions/validateTransaction.js

/**
 * Shared validation for the transaction form (LogItemPage + modal).
 * Returns an object of { fieldName: errorMessage }.
 * Empty object = valid.
 */
export function validateTransaction(draft) {
  const errors = {}

  const amountNum = parseFloat(draft.amount)
  if (!draft.amount || isNaN(amountNum) || amountNum <= 0) {
    errors.amount = 'Please enter an amount greater than 0'
  }

  if (!draft.description || draft.description.trim().length < 2) {
    errors.description = 'Please enter a description (at least 2 characters)'
  }

  if (draft.txType !== 'transfer') {
    if (!draft.category || draft.category === 'uncategorized') {
      errors.category = 'Please select a category'
    }
  }

  if (draft.txType === 'expense' && !draft.sourceAccount) {
    errors.source = 'Please select a source account'
  }

  if (draft.txType === 'income' && !draft.sourceAccount) {
    errors.dest = 'Please select a destination account'
  }

  if (draft.txType === 'transfer') {
    if (!draft.sourceAccount) {
      errors.source = 'Please select a source account'
    }
    if (!draft.destAccount) {
      errors.dest = 'Please select a destination account'
    }
    if (
      draft.sourceAccount &&
      draft.destAccount &&
      draft.sourceAccount === draft.destAccount
    ) {
      errors.dest = 'From and To accounts must be different'
    }
  }

  return errors
}