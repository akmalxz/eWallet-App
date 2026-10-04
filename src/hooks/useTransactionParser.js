// src/hooks/useTransactionParser.js
import { useCallback, useMemo } from 'react'
import { TransactionParser } from '../utils/nlpParser'

export function useTransactionParser({ accounts, categories }) {
  const dynamicAccountDict = useMemo(() => {
    const dict = {}
    accounts.forEach((acc) => {
      const name = acc.account_name.toLowerCase()
      dict[name] = acc.id
      if (acc.classification === 'ewallet' && name.includes('tng')) dict['tng'] = acc.id
      if (acc.classification === 'digital_bank' && name.includes('gx')) dict['gx'] = acc.id
      if (acc.classification === 'hub' && name.includes('maybank')) dict['mbb'] = acc.id
      dict[acc.classification] = acc.id
    })
    return dict
  }, [accounts])

  const parser = useMemo(
    () => new TransactionParser(dynamicAccountDict, categories),
    [dynamicAccountDict, categories]
  )

  const mainCategories = useMemo(
    () => categories.filter((c) => !c.parent_id),
    [categories]
  )

  const getSubCategories = useCallback(
    (parentId) => categories.filter((c) => c.parent_id === parentId),
    [categories]
  )

  return { parser, mainCategories, getSubCategories }
}