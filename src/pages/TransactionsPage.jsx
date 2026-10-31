// src/pages/TransactionsPage.jsx
import { useState, useMemo, useEffect, useRef } from 'react'
import { ScanText, Check, RefreshCw, X, CheckCircle2, ChevronDown, AlertCircle } from 'lucide-react'
import { ActionLedger } from '../components/transactions/ActionLedger'
import { ConfirmSheet } from '../components/shared/ConfirmSheet'
import { formatMYR } from '../utils/formatters'

const sortNewestFirst = (a, b) => {
  const aTxTime = new Date(a.transaction_date || a.created_at || 0).getTime()
  const bTxTime = new Date(b.transaction_date || b.created_at || 0).getTime()
  if (aTxTime !== bTxTime) return bTxTime - aTxTime
  const aCreated = new Date(a.created_at || 0).getTime()
  const bCreated = new Date(b.created_at || 0).getTime()
  return bCreated - aCreated
}

const PageSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="space-y-4">
      <div className="h-10 w-full bg-surface-2 rounded-xl" />
      <div className="space-y-2">
        <div className="h-3 w-24 bg-surface-2 rounded-full" />
        <div className="h-12 w-full bg-surface-2 rounded-xl" />
      </div>
    </div>
  </div>
)

function PendingOCRRow({ tx, mainCategories, getSubCategories, onApprove, onDelete }) {
  const [date, setDate] = useState(
    new Date(tx.transaction_date || tx.created_at).toISOString().split('T')[0]
  )
  const [category, setCategory] = useState(tx.category || 'uncategorized')
  const [description, setDescription] = useState(tx.description || '')

  return (
    <div className="flex flex-col gap-4 py-5 px-2 border-b border-line/40 last:border-0 hover:bg-surface-2/20 transition-all rounded-lg">
      
      {/* TOP ROW: Description & Amount */}
      <div className="flex justify-between items-end gap-4">
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-bold text-warning-text/80 uppercase tracking-wider mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-transparent font-bold text-sm text-fg placeholder:text-fg-subtle outline-none border-b border-warning/40 hover:border-warning/70 focus:border-warning pb-1 transition-colors"
            placeholder="Add description..."
          />
        </div>
        <div className="shrink-0 text-right">
          <label className="block text-[10px] font-bold text-warning-text/80 uppercase tracking-wider mb-1">Amount</label>
          <span className="text-lg font-black text-fg tabular-figures">
            {formatMYR(tx.amount)}
          </span>
        </div>
      </div>

      {/* BOTTOM ROW: Category, Date, Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Interactive Inputs */}
        <div className="flex flex-col sm:flex-row flex-1 gap-2">
          <div className="relative flex-1 flex items-center bg-surface-2 border border-line/60 rounded-lg px-3 py-2 focus-within:border-warning focus-within:ring-1 focus-within:ring-warning/30 transition-all">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-fg outline-none appearance-none pr-5 cursor-pointer truncate"
            >
              <option value="uncategorized">Select Category...</option>
              {mainCategories.map((main) => (
                <optgroup key={main.id} label={main.name}>
                  {getSubCategories(main.id).map((sub) => (
                    <option key={sub.id} value={`${main.name} > ${sub.name}`}>{sub.name}</option>
                  ))}
                  {getSubCategories(main.id).length === 0 && (
                    <option value={main.name}>{main.name} (General)</option>
                  )}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-fg-subtle absolute right-3 pointer-events-none" />
          </div>

          <div className="flex-1 flex items-center bg-surface-2 border border-line/60 rounded-lg px-3 py-2 focus-within:border-warning focus-within:ring-1 focus-within:ring-warning/30 transition-all">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-fg outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end sm:justify-start pt-2 sm:pt-0">
          <button
            onClick={() => onDelete(tx)}
            className="flex-1 sm:flex-none sm:w-10 h-10 flex items-center justify-center bg-surface-2 hover:bg-danger-soft text-fg-muted hover:text-danger border border-line hover:border-danger-border rounded-xl transition-all"
            aria-label="Delete scan"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => onApprove(tx.id, category, date, description)}
            className="flex-1 sm:flex-none sm:w-10 h-10 flex items-center justify-center bg-warning-solid hover:bg-warning-solid-hover text-white rounded-xl shadow-sm transition-all"
            aria-label="Approve transaction"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  )
}

export function TransactionsPage({
  user,
  accounts,
  mainCategories,
  getSubCategories,
  showToast,
  recentTransactions,
  handleApproveTransaction,
  handleDeleteTransaction,
  handleEditTransaction,
  onRefresh,
  isRefreshing,
  onAddTransaction,
  isLoading = false,
  fetchRecentTransactions
}) {
  const [pendingDelete, setPendingDelete] = useState(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  
  const isInitialMount = useRef(true)

  useEffect(() => {
    if (searchQuery !== debouncedQuery) setIsSearching(true)
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery, debouncedQuery])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    
    let isMounted = true
    const doFetch = async () => {
      const res = await fetchRecentTransactions({ limit: 50, offset: 0, search: debouncedQuery })
      if (isMounted) {
        setHasMore(res.hasMore)
        setPage(1)
        setIsSearching(false)
      }
    }
    doFetch()
    
    return () => { isMounted = false }
  }, [debouncedQuery, fetchRecentTransactions])

  const handleLoadMore = async () => {
    setIsLoadingMore(true)
    const res = await fetchRecentTransactions({ 
      limit: 50, offset: page * 50, search: debouncedQuery, append: true 
    })
    setHasMore(res.hasMore)
    setPage(p => p + 1)
    setIsLoadingMore(false)
  }

  const pendingTransactions = useMemo(
    () => (recentTransactions?.filter((tx) => tx.needs_review) || []).sort(sortNewestFirst),
    [recentTransactions]
  )
  
  const verifiedTransactions = useMemo(
    () => (recentTransactions?.filter((tx) => !tx.needs_review) || []).sort(sortNewestFirst),
    [recentTransactions]
  )

  const showSkeleton = isLoading && (recentTransactions?.length || 0) === 0

  return (
    <div className="max-w-2xl mx-auto animate-enter pb-12 space-y-6">
      <div className="hidden md:block mb-5 px-1">
        <h1 className="text-xl font-bold text-fg tracking-tight">Ledger</h1>
        <p className="text-xs text-fg-subtle mt-1">Review OCR scans and manage your history</p>
      </div>

      {showSkeleton ? (
        <PageSkeleton />
      ) : (
        <>
          {/* PENDING OCR SECTION */}
          {pendingTransactions.length > 0 && (
            <section className="px-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-fg flex items-center gap-2">
                  <ScanText className="w-4 h-4 text-warning" />
                  Pending Review
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-warning-soft text-warning-text">
                    {pendingTransactions.length}
                  </span>
                </h2>
              </div>
              <div className="flex flex-col">
                {pendingTransactions.map((tx) => (
                  <PendingOCRRow
                    key={tx.id}
                    tx={tx}
                    mainCategories={mainCategories}
                    getSubCategories={getSubCategories}
                    onApprove={handleApproveTransaction}
                    onDelete={setPendingDelete}
                  />
                ))}
              </div>
            </section>
          )}

          {/* MUTED DIVIDER (MOBILE ONLY) */}
          {pendingTransactions.length > 0 && (
            <div className="h-px w-full bg-line/40 my-4 md:hidden" />
          )}

          {/* ACTION LEDGER */}
          <section className="px-1">
            <ActionLedger
              recentTransactions={verifiedTransactions}
              mainCategories={mainCategories}
              getSubCategories={getSubCategories}
              handleApproveTransaction={handleApproveTransaction}
              handleDeleteTransaction={handleDeleteTransaction}
              handleEditTransaction={handleEditTransaction}
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
              accounts={accounts}
              onAddTransaction={onAddTransaction}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              isLoadingMore={isLoadingMore}
              isSearching={isSearching}
            />
          </section>
        </>
      )}

      {pendingDelete && (
        <ConfirmSheet
          destructive
          title={`Delete "${pendingDelete.description || 'scan'}"?`}
          message="This pending scan will be removed."
          confirmLabel="Delete"
          onConfirm={() => {
            const tx = pendingDelete
            setPendingDelete(null)
            handleDeleteTransaction(tx.id)
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}