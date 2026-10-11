// src/pages/NetworkPage.jsx
import { useState } from 'react'
import {
  Search, UserPlus, UserCheck, UserX, Users, Send,
  Loader2, Check, X, AlertCircle, ChevronLeft
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { ConfirmSheet } from '../components/shared/ConfirmSheet'
import { useFriendRequests } from '../hooks/useFriendRequests'
import { Avatar } from '../components/shared/Avatar'

// ============================================================
// SKELETON — mimics the shape of friend rows during load
// ============================================================
const NetworkSkeleton = ({ rows = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 p-3 bg-surface-2/50 border border-line rounded-xl animate-pulse"
      >
        <div className="w-8 h-8 rounded-full bg-surface-3 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3 bg-surface-3 rounded-full w-2/3" />
          <div className="h-2.5 bg-surface-2 rounded-full w-1/3" />
        </div>
      </div>
    ))}
  </div>
)

// ============================================================
// EMPTY STATE — shared shape for zero-content sections
// ============================================================
const NetworkEmptyState = ({ icon: Icon = Users, title, message, hint }) => (
  <div className="text-center py-8">
    <div className="w-12 h-12 bg-surface-2 border border-line rounded-2xl flex items-center justify-center mx-auto mb-3 text-fg-subtle">
      <Icon className="w-5 h-5" />
    </div>
    <p className="text-sm font-bold text-fg">{title}</p>
    {message && (
      <p className="text-xs text-fg-muted mt-1 max-w-[280px] mx-auto leading-relaxed">
        {message}
      </p>
    )}
    {hint && (
      <p className="text-[11px] text-fg-subtle mt-2 max-w-[280px] mx-auto leading-relaxed">
        {hint}
      </p>
    )}
  </div>
)

export function NetworkPage({
  user,
  profile,
  showToast,
  onGoToProfile,
  onBack
}) {
  const {
    requests: pendingRequests,
    sentRequests,
    friends,
    friendships,
    loading,
    accept: acceptRequest,
    decline: declineRequest,
    cancel: cancelRequest,
    removeFriend,
    refresh
  } = useFriendRequests(user, showToast)

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [actionInFlight, setActionInFlight] = useState(null)
  const [pendingRemove, setPendingRemove] = useState(null)

  const hasUsername = !!profile?.username?.trim()

  // ----------------------------------------------------------
  // Search users (RPC)
  // ----------------------------------------------------------
  const handleSearch = async (e) => {
    if (e) e.preventDefault()

    if (!hasUsername) {
      showToast('Please claim a username first in Personal Information', 'warning')
      return
    }

    if (!searchTerm.trim()) return

    setSearching(true)
    setHasSearched(true)

    try {
      const { data, error } = await supabase.rpc('search_users', {
        search_term: searchTerm.trim()
      })

      if (error) throw error

      const filtered = (data || []).filter(u => u.id !== user.id)
      setSearchResults(filtered)
    } catch (err) {
      showToast('Search failed: ' + err.message, 'error')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setSearchResults([])
    setHasSearched(false)
  }

  // ----------------------------------------------------------
  // Send friend request
  // ----------------------------------------------------------
  const handleSendRequest = async (targetUser) => {
    setActionInFlight(targetUser.id)

    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: targetUser.id,
          status: 'pending'
        })

      if (error) throw error

      showToast(
        `Request sent to ${targetUser.username || targetUser.first_name}`,
        'success'
      )

      setSearchResults(prev => prev.filter(u => u.id !== targetUser.id))
      await refresh()
    } catch (err) {
      showToast('Failed to send request: ' + err.message, 'error')
    } finally {
      setActionInFlight(null)
    }
  }

  // ----------------------------------------------------------
  // Accept / decline / cancel / remove
  // ----------------------------------------------------------
  const handleAccept = async (friendshipId) => {
    setActionInFlight(friendshipId)
    try {
      await acceptRequest(friendshipId)
    } finally {
      setActionInFlight(null)
    }
  }

  const handleDecline = async (friendshipId) => {
    setActionInFlight(friendshipId)
    try {
      await declineRequest(friendshipId)
    } finally {
      setActionInFlight(null)
    }
  }

  const handleCancel = async (friendshipId) => {
    setActionInFlight(friendshipId)
    try {
      await cancelRequest(friendshipId)
    } finally {
      setActionInFlight(null)
    }
  }

  const handleConfirmRemove = async () => {
    if (!pendingRemove) return
    const id = pendingRemove.friendshipId
    setActionInFlight(id)
    try {
      await removeFriend(id)
    } finally {
      setActionInFlight(null)
      setPendingRemove(null)
    }
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------
  const displayName = (p) => {
    if (!p) return 'Unknown user'

    const first = p.first_name?.trim() || ''
    const last = p.last_name?.trim() || ''
    const full = `${first} ${last}`.trim()

    if (full) return full
    if (p.username) return `@${p.username}`
    if (p.email) return p.email

    return 'Unknown user'
  }

  const getFriendshipFor = (targetId) =>
    friendships.find(
      f =>
        (f.requester_id === user.id && f.addressee_id === targetId) ||
        (f.addressee_id === user.id && f.requester_id === targetId)
    )

  const getRelationshipLabel = (targetId) => {
    const f = getFriendshipFor(targetId)
    if (!f) return null
    if (f.status === 'accepted') return 'friends'
    if (f.status === 'pending') {
      return f.requester_id === user.id ? 'pending_out' : 'pending_in'
    }
    return null
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  return (
    <>
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 space-y-4">

        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-bold text-fg-muted hover:text-fg transition-colors mb-4 px-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* SEARCH SECTION */}
        <section className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-bold text-base text-fg">Find People</span>
          </div>

          {!hasUsername ? (
            <div className="bg-warning-soft border border-warning-border rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-warning-text">
                  Claim a username first
                </p>
                <p className="text-xs text-warning-text/90 mt-1 leading-relaxed">
                  You need a username before you can search for and add friends.
                </p>
                {onGoToProfile && (
                  <button
                    onClick={onGoToProfile}
                    className="mt-3 bg-brand-solid hover:bg-brand-solid-hover text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    Go to Personal Information
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSearch} className="flex gap-2">
                <label htmlFor="network-search" className="sr-only">
                  Search by name or username
                </label>
                <input
                  id="network-search"
                  name="network-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    if (!e.target.value) handleClearSearch()
                  }}
                  placeholder="Search by name or username..."
                  className="flex-1 bg-surface-2 border border-line rounded-xl py-2.5 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition-all"
                />
                <button
                  type="submit"
                  disabled={searching || !searchTerm.trim()}
                  className="bg-brand-solid hover:bg-brand-solid-hover text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
                  aria-label="Search"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </form>

              {/* Loading state — skeleton rows */}
              {searching && (
                <div className="mt-4">
                  <NetworkSkeleton rows={2} />
                </div>
              )}

              {/* Results */}
              {!searching && searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {searchResults.map(result => {
                    const rel = getRelationshipLabel(result.id)
                    const isBusy = actionInFlight === result.id

                    return (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-3 bg-surface-2/50 border border-line rounded-xl gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar profile={result} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-fg truncate">
                              {displayName(result)}
                            </p>
                            {result.username && (
                              <p className="text-xs text-fg-muted truncate">
                                @{result.username}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {rel === 'friends' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-success-text bg-success-soft border border-success-border px-2.5 py-1 rounded-lg">
                              <UserCheck className="w-3.5 h-3.5" /> Friends
                            </span>
                          )}

                          {rel === 'pending_out' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-fg-muted bg-surface-3 border border-line px-2.5 py-1 rounded-lg">
                              Pending
                            </span>
                          )}

                          {rel === 'pending_in' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-warning-text bg-warning-soft border border-warning-border px-2.5 py-1 rounded-lg">
                              Request received
                            </span>
                          )}

                          {!rel && (
                            <button
                              onClick={() => handleSendRequest(result)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 bg-brand-solid hover:bg-brand-solid-hover text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isBusy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UserPlus className="w-3.5 h-3.5" />
                              )}
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* No results */}
              {!searching && hasSearched && searchResults.length === 0 && (
                <div className="mt-4">
                  <NetworkEmptyState
                    icon={Search}
                    title="No users found"
                    message={`Nothing matched "${searchTerm}".`}
                    hint="Try a shorter search, or check the spelling."
                  />
                </div>
              )}

              {/* Idle hint — before any search */}
              {!searching && !hasSearched && (
                <div className="mt-4">
                  <NetworkEmptyState
                    icon={Users}
                    title="Find friends by name or @username"
                    message="Search above to see people you can connect with."
                  />
                </div>
              )}
            </>
          )}
        </section>

        {/* PENDING REQUESTS (incoming) */}
        {pendingRequests.length > 0 && (
          <section className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-warning-solid text-white shadow-md">
                <UserPlus className="w-5 h-5" />
              </div>
              <span className="font-bold text-base text-fg">
                Pending Requests
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-warning-soft text-warning-text">
                {pendingRequests.length}
              </span>
            </div>

            <div className="space-y-2">
              {pendingRequests.map(req => {
                const isBusy = actionInFlight === req.id

                return (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 bg-surface-2/50 border border-line rounded-xl gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar profile={req.other_user} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-fg truncate">
                          {displayName(req.other_user)}
                        </p>
                        {req.other_user?.username && (
                          <p className="text-xs text-fg-muted truncate">
                            @{req.other_user.username}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleAccept(req.id)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 bg-success-solid hover:bg-success-solid-hover text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(req.id)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 bg-surface hover:bg-danger-soft text-danger border border-danger-border text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* SENT REQUESTS (outgoing) */}
        {sentRequests.length > 0 && (
          <section className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-surface-2 text-fg-muted border border-line">
                <Send className="w-5 h-5" />
              </div>
              <span className="font-bold text-base text-fg">
                Sent Requests
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-surface-3 text-fg-muted">
                {sentRequests.length}
              </span>
            </div>

            <div className="space-y-2">
              {sentRequests.map(req => {
                const isBusy = actionInFlight === req.id

                return (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 bg-surface-2/50 border border-line rounded-xl gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar profile={req.other_user} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-fg truncate">
                          {displayName(req.other_user)}
                        </p>
                        {req.other_user?.username && (
                          <p className="text-xs text-fg-muted truncate">
                            @{req.other_user.username}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCancel(req.id)}
                      disabled={isBusy}
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-fg-subtle hover:text-danger hover:bg-danger-soft px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      aria-label={`Cancel request to ${displayName(req.other_user)}`}
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      Cancel
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* MY NETWORK */}
        <section className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-bold text-base text-fg">My Network</span>
            {!loading && friends.length > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-success-soft text-success-text">
                {friends.length}
              </span>
            )}
          </div>

          {loading ? (
            <NetworkSkeleton rows={3} />
          ) : friends.length === 0 ? (
            <NetworkEmptyState
              icon={Users}
              title="No friends yet"
              message="Search for someone above to get started."
              hint="You can send a request by name or @username."
            />
          ) : (
            <div className="space-y-2">
              {friends.map(f => {
                const isBusy = actionInFlight === f.id

                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-3 bg-surface-2/50 border border-line rounded-xl gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar profile={f.other_user} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-fg truncate">
                          {displayName(f.other_user)}
                        </p>
                        {f.other_user?.username && (
                          <p className="text-xs text-fg-muted truncate">
                            @{f.other_user.username}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setPendingRemove({
                        friendshipId: f.id,
                        name: displayName(f.other_user)
                      })}
                      disabled={isBusy}
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-fg-subtle hover:text-danger hover:bg-danger-soft px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      aria-label={`Remove ${displayName(f.other_user)}`}
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserX className="w-3.5 h-3.5" />
                      )}
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>

      {/* REMOVE FRIEND CONFIRMATION */}
      {pendingRemove && (
        <ConfirmSheet
          destructive
          saving={!!actionInFlight}
          title={`Remove "${pendingRemove.name}"?`}
          message="You'll need to send a new friend request to reconnect."
          confirmLabel="Remove"
          onConfirm={handleConfirmRemove}
          onCancel={() => setPendingRemove(null)}
        />
      )}
    </>
  )
}