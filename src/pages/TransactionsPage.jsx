// src/pages/TransactionsPage.jsx
import { useState, useMemo, useEffect, useRef } from 'react'
import { ScanText, Check, RefreshCw, X, CheckCircle2, ChevronDown } from 'lucide-react'
import { ActionLedger } from '../components/dashboard/ActionLedger'
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
  <div className="space-y-8">
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-surface-2 rounded-xl animate-pulse" />
        <div className="h-4 w-32 bg-surface-2 rounded-full animate-pulse" />
      </div>
      <div className="h-16 bg-surface-2/50 rounded-2xl animate-pulse" />
    </div>
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-surface-3 rounded-xl animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-28 bg-surface-2 rounded-full animate-pulse" />
          <div className="h-2 w-36 bg-surface-3 rounded-full animate-pulse" />
        </div>
      </div>
      <div className="border border-line rounded-2xl overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 py-3 border-b border-line last:border-0">
            <div className="h-4 w-48 bg-surface-2 rounded animate-pulse" />
          </div>
        ))}
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
    <div className="bg-warning-soft/30 p-4">
      {/* Amount - Top Right */}
      <div className="flex justify-end mb-3">
        <span className="text-xl font-black text-fg whitespace-nowrap tabular-figures">
          {formatMYR(tx.amount)}
        </span>
      </div>
      
      <div className="space-y-3">
        {/* Description - Full Width */}
        <div>
          <label htmlFor={`desc-${tx.id}`} className="block text-[10px] font-bold text-warning-text/80 uppercase tracking-wider mb-1.5">
            Description
          </label>
          <input
            id={`desc-${tx.id}`}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-[46px] bg-surface border border-warning-border rounded-xl px-3 text-sm font-bold text-fg outline-none focus:border-warning focus:ring-2 focus:ring-warning/30 transition-all placeholder:text-fg-subtle"
            placeholder="Add description..."
          />
        </div>

        {/* Date, Category, Buttons - Row */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-bold text-warning-text/80 uppercase tracking-wider mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-[46px] bg-surface border border-warning-border rounded-xl px-3 text-sm text-fg outline-none focus:border-warning focus:ring-2 focus:ring-warning/30 appearance-none"
            />
          </div>
          
          <div className="flex-1 w-full relative">
            <label className="block text-[10px] font-bold text-warning-text/80 uppercase tracking-wider mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-[46px] bg-surface border border-warning-border rounded-xl pl-3 pr-10 text-sm text-fg outline-none focus:border-warning focus:ring-2 focus:ring-warning/30 appearance-none"
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
            <ChevronDown className="w-4 h-4 text-fg-muted absolute right-3 bottom-[15px] pointer-events-none" />
          </div>

          <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              onClick={() => onApprove(tx.id, category, date, description)}
              className="flex-1 sm:w-[46px] h-[46px] bg-warning-solid hover:bg-warning-solid-hover text-white rounded-xl transition-colors shadow-sm flex items-center justify-center"
              aria-label="Approve transaction"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(tx)}
              className="flex-1 sm:w-[46px] h-[46px] bg-surface hover:bg-danger-soft text-danger border border-danger-border rounded-xl transition-colors shadow-sm flex items-center justify-center"
              aria-label="Delete scan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
  
  const isInitialMount = useRef(true)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

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
      }
    }
    doFetch()
    
    return () => { isMounted = false }
  }, [debouncedQuery, fetchRecentTransactions])

  const handleLoadMore = async () => {
    setIsLoadingMore(true)
    const res = await fetchRecentTransactions({ 
      limit: 50, 
      offset: page * 50, 
      search: debouncedQuery, 
      append: true 
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
    <div className="max-w-2xl mx-auto animate-enter pb-12 space-y-8">

      <div className="hidden md:block mb-5 px-1">
        <h1 className="text-xl font-bold text-fg tracking-tight">Ledger & Verification</h1>
        <p className="text-xs text-fg-subtle mt-1">Review OCR scans and manage your transaction history</p>
      </div>

      {showSkeleton ? (
        <PageSkeleton />
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                pendingTransactions.length > 0 ? 'bg-warning-solid text-white shadow-md' : 'bg-surface-2 text-fg-muted'
              }`}>
                <ScanText className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-fg">OCR Verification</span>
                {pendingTransactions.length > 0 && (
                  <span 
                    key={pendingTransactions.length}
                    className="text-[10px] font-black px-2 py-0.5 rounded-full bg-warning-soft text-warning-text animate-attention"
                  >
                    {pendingTransactions.length}
                  </span>
                )}
              </div>

              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`ml-auto w-11 h-11 flex items-center justify-center rounded-lg transition-all ${
                  isRefreshing ? 'text-fg-subtle/50 cursor-not-allowed' : 'text-fg-subtle hover:text-fg-muted hover:bg-surface-2'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {pendingTransactions.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-line-strong rounded-2xl">
                <div className="w-12 h-12 bg-success-soft text-success rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-fg">All caught up</p>
                <p className="text-xs text-fg-subtle mt-1 max-w-[280px] mx-auto leading-relaxed">
                  Receipts scanned with the iOS Shortcut appear here for review.
                  You can also log entries manually from the Log tab.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-warning-border/50 overflow-hidden divide-y divide-warning-border/50">
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
            )}
          </section>

          <div className="animate-enter delay-75">
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
            />
          </div>
        </>
      )}

      {pendingDelete && (
        <ConfirmSheet
          destructive
          title={`Delete "${pendingDelete.description || 'scan'}"?`}
          message="This pending OCR scan will be removed. You can re-scan it later if needed."
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