// src/pages/NetworkPage.jsx
import { useState, useEffect, useCallback } from 'react'
import {
  Search, UserPlus, UserCheck, UserX, Users,
  Loader2, Check, X, AlertCircle, ChevronLeft
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export function NetworkPage({
  user,
  profile,
  showToast,
  onGoToProfile,
  onBack
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  const [friendships, setFriendships] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)

  const [actionInFlight, setActionInFlight] = useState(null)

  const hasUsername = !!profile?.username?.trim()

  // ----------------------------------------------------------
  // Load friendships + profiles
  // ----------------------------------------------------------
  const fetchNetworkData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      // 1. Fetch all my friendships
      const { data: fsData, error: fsError } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

      if (fsError) throw fsError

      const list = fsData || []

      // 2. Collect other user IDs
      const otherIds = new Set()
      list.forEach(f => {
        if (f.requester_id !== user.id) otherIds.add(f.requester_id)
        if (f.addressee_id !== user.id) otherIds.add(f.addressee_id)
      })

      // 3. Fetch their profiles via RPC (bypasses RLS safely)
      let profileMap = {}
      if (otherIds.size > 0) {
        const { data: profileData, error: pError } = await supabase.rpc(
          'get_profiles_by_ids',
          { user_ids: [...otherIds] }
        )

        if (pError) throw pError
        profileMap = Object.fromEntries(
          (profileData || []).map(p => [p.id, p])
        )
      }

      // 4. Enrich
      const enriched = list.map(f => {
        const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id
        const friendProfile = profileMap[otherId] || null

        return {
          ...f,
          other_user: friendProfile
        }
      })

      setFriendships(enriched)
      setPendingRequests(
        enriched.filter(
          f => f.status === 'pending' && f.addressee_id === user.id
        )
      )
      setFriends(enriched.filter(f => f.status === 'accepted'))
    } catch (err) {
      showToast('Failed to load network: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [user, showToast])

  useEffect(() => {
    fetchNetworkData()
  }, [fetchNetworkData])

  // ----------------------------------------------------------
  // Search users (RPC)
  // ----------------------------------------------------------
  const handleSearch = async (e) => {
    if (e) e.preventDefault()

    if (!hasUsername) {
      showToast(
        'Please claim a username first in Personal Information',
        'warning'
      )
      return
    }

    if (!searchTerm.trim()) return

    setSearching(true)

    try {
      const { data, error } = await supabase.rpc('search_users', {
        search_term: searchTerm.trim()
      })

      if (error) throw error

      const filtered = (data || []).filter(u => u.id !== user.id)
      setSearchResults(filtered)
    } catch (err) {
      showToast('Search failed: ' + err.message, 'error')
    } finally {
      setSearching(false)
    }
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
      await fetchNetworkData()
    } catch (err) {
      showToast('Failed to send request: ' + err.message, 'error')
    } finally {
      setActionInFlight(null)
    }
  }

  // ----------------------------------------------------------
  // Accept request
  // ----------------------------------------------------------
  const handleAccept = async (friendshipId) => {
    setActionInFlight(friendshipId)

    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)

      if (error) throw error

      showToast('Friend request accepted!', 'success')
      await fetchNetworkData()
    } catch (err) {
      showToast('Failed to accept: ' + err.message, 'error')
    } finally {
      setActionInFlight(null)
    }
  }

  // ----------------------------------------------------------
  // Decline request OR remove friend
  // ----------------------------------------------------------
  const handleRemove = async (friendshipId, isPending = false) => {
    if (!isPending) {
      if (!window.confirm('Remove this friend?')) return
    }

    setActionInFlight(friendshipId)

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      if (error) throw error

      showToast(
        isPending ? 'Request declined' : 'Friend removed',
        'success'
      )
      await fetchNetworkData()
    } catch (err) {
      showToast('Failed: ' + err.message, 'error')
    } finally {
      setActionInFlight(null)
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
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 space-y-4">

      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-4 px-1"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* ============================================
          SEARCH SECTION
      ============================================ */}
      <section className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-bold text-base text-slate-800">Find People</span>
        </div>

        {!hasUsername ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">
                Claim a username first
              </p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                You need a username before you can search for and add friends.
              </p>
              {onGoToProfile && (
                <button
                  onClick={onGoToProfile}
                  className="mt-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
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
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or username..."
                className="flex-1 bg-white/80 border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={searching || !searchTerm.trim()}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map(result => {
                  const rel = getRelationshipLabel(result.id)
                  const isBusy = actionInFlight === result.id

                  return (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 bg-white/50 border border-white/60 rounded-xl"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {displayName(result)}
                        </p>
                        {result.username && (
                          <p className="text-xs text-slate-500 truncate">
                            @{result.username}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 ml-2">
                        {rel === 'friends' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            <UserCheck className="w-3.5 h-3.5" /> Friends
                          </span>
                        )}

                        {rel === 'pending_out' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                            Pending
                          </span>
                        )}

                        {rel === 'pending_in' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                            Request received
                          </span>
                        )}

                        {!rel && (
                          <button
                            onClick={() => handleSendRequest(result)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
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

            {searchResults.length === 0 && searchTerm && !searching && (
              <p className="text-xs text-slate-400 text-center mt-4">
                No users found. Try a different search.
              </p>
            )}
          </>
        )}
      </section>

      {/* ============================================
          PENDING REQUESTS (conditional)
      ============================================ */}
      {pendingRequests.length > 0 && (
        <section className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="font-bold text-base text-slate-800">
              Pending Requests
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {pendingRequests.length}
            </span>
          </div>

          <div className="space-y-2">
            {pendingRequests.map(req => {
              const isBusy = actionInFlight === req.id

              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 bg-white/50 border border-white/60 rounded-xl gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {displayName(req.other_user)}
                    </p>
                    {req.other_user?.username && (
                      <p className="text-xs text-slate-500 truncate">
                        @{req.other_user.username}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Accept
                    </button>
                    <button
                      onClick={() => handleRemove(req.id, true)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
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

      {/* ============================================
          MY NETWORK
      ============================================ */}
      <section className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-bold text-base text-slate-800">My Network</span>
          {friends.length > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {friends.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">No friends yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Search for people above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map(f => {
              const isBusy = actionInFlight === f.id

              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3 bg-white/50 border border-white/60 rounded-xl gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {displayName(f.other_user)}
                    </p>
                    {f.other_user?.username && (
                      <p className="text-xs text-slate-500 truncate">
                        @{f.other_user.username}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleRemove(f.id, false)}
                    disabled={isBusy}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
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
  )
}