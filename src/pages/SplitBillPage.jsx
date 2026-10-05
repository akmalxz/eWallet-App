// src/pages/SplitBillPage.jsx
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Receipt, ChevronLeft, ChevronDown, ChevronUp, Loader2, FileText,
  User, CheckCircle2, Circle, Users, Plus, X, Search, Check,
  HandCoins, Camera, Image as ImageIcon, RotateCcw
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { DebtHub } from '../components/split/DebtHub'
import { ItemReviewStep } from '../components/split/ItemReviewStep'

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------
const guessMimeType = (file) => {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'heic') return 'image/heic'
  if (ext === 'heif') return 'image/heif'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}

// Try canvas compression first. If the browser can't decode the format
// (HEIC on desktop, for example), fall back to sending the raw file.
const compressImageFile = (file, maxDim = 1400, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        const base64 = dataUrl.split(',')[1]
        resolve({
          base64,
          mimeType: 'image/jpeg',
          previewUrl: dataUrl,
          previewSupported: true,
          wasCompressed: true,
          originalSize: file.size,
        })
      }
      img.onerror = () => reject(new Error('DECODE_FAILED'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('READ_FAILED'))
    reader.readAsDataURL(file)
  })
}

// Raw base64 read — used when the browser can't decode the format.
const readFileAsRawBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
      resolve({
        base64,
        mimeType: guessMimeType(file),
        previewUrl: dataUrl,
        previewSupported: false, // browser may not render this
        wasCompressed: false,
        originalSize: file.size,
      })
    }
    reader.onerror = () => reject(new Error('READ_FAILED'))
    reader.readAsDataURL(file)
  })
}

// One entry point: compress if possible, else raw.
const processImageFile = async (file) => {
  try {
    return await compressImageFile(file)
  } catch {
    return await readFileAsRawBase64(file)
  }
}

export function SplitBillPage({ user, profile, showToast, onBack, initialTab = 'new' }) {
  // Tab
  const [activeTab, setActiveTab] = useState(initialTab)
  const [pendingCount, setPendingCount] = useState(0)

  // 1. App & Matrix State
  const [appState, setAppState] = useState('idle') // idle | capturing | processing | claiming
  const [rawText, setRawText] = useState('')
  const [capturedImage, setCapturedImage] = useState(null) // { base64, mimeType, previewUrl }
  const [receiptData, setReceiptData] = useState(null)
  const [claims, setClaims] = useState({})
  const fileInputRef = useRef(null)

  // 2. Participant State
  const [activeClaimant, setActiveClaimant] = useState(user?.id)
  const [sessionParticipants, setSessionParticipants] = useState([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [networkFriends, setNetworkFriends] = useState([])
  const [ghostContacts, setGhostContacts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [newGhostName, setNewGhostName] = useState('')
  const [isCreatingGhost, setIsCreatingGhost] = useState(false)
  const [profileSearchResults, setProfileSearchResults] = useState([])
  const [searchingProfiles, setSearchingProfiles] = useState(false)
  const [showGhosts, setShowGhosts] = useState(false)

  // 3. Settlement State
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [ledgerPreview, setLedgerPreview] = useState(null)
  const [isLocking, setIsLocking] = useState(false)

  // Sync when App changes the requested initial tab
  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  // Initialize Default Participant
  useEffect(() => {
    if (user) {
      setSessionParticipants([{ id: user.id, name: 'Me', type: 'user' }])
    }
  }, [user])

  // Pending debt count for the tab badge
  const refreshPendingCount = async () => {
    if (!user?.id) return
    const { count } = await supabase
      .from('split_debts')
      .select('id', { count: 'exact', head: true })
      .eq('creditor_id', user.id)
      .in('status', ['pending', 'pending_confirmation'])
    setPendingCount(count || 0)
  }

  useEffect(() => {
    refreshPendingCount()

    const handler = () => refreshPendingCount()
    window.addEventListener('debts-changed', handler)
    return () => window.removeEventListener('debts-changed', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Fetch Friends and Contacts (only when the modal is opened)
  useEffect(() => {
    async function fetchNetworkAndContacts() {
      if (!user?.id || !isAddModalOpen) return

      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('host_id', user.id)
      if (contacts) setGhostContacts(contacts)

      const { data: friendsData } = await supabase
        .from('friendships')
        .select(`
          id,
          requester:profiles!requester_id(id, first_name, username),
          addressee:profiles!addressee_id(id, first_name, username)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted')

      if (friendsData) {
        const parsedFriends = friendsData
          .map(f => {
            const isRequester = f.requester?.id === user.id
            const friendProfile = isRequester ? f.addressee : f.requester
            if (!friendProfile) return null
            return {
              id: friendProfile.id,
              name: friendProfile.first_name || friendProfile.username || 'Unknown',
              type: 'user'
            }
          })
          .filter(Boolean)
        setNetworkFriends(parsedFriends)
      }
    }
    fetchNetworkAndContacts()
  }, [user?.id, isAddModalOpen])

  // Collapse ghosts again when the modal closes
  useEffect(() => {
    if (!isAddModalOpen) setShowGhosts(false)
  }, [isAddModalOpen])

  // Auto-expand the ghost section when the search matches a ghost
  useEffect(() => {
    if (
      searchQuery.trim().length > 0 &&
      ghostContacts.some(g =>
        g.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    ) {
      setShowGhosts(true)
    }
  }, [searchQuery, ghostContacts])

  // Live username search across all profiles (debounced)
  useEffect(() => {
    if (!isAddModalOpen) {
      setProfileSearchResults([])
      return
    }
    const q = searchQuery.trim()
    if (q.length < 2) {
      setProfileSearchResults([])
      return
    }

    let cancelled = false
    const t = setTimeout(async () => {
      setSearchingProfiles(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, username')
        .or(`username.ilike.%${q}%,first_name.ilike.%${q}%`)
        .neq('id', user.id)
        .limit(10)

      if (!cancelled) {
        if (!error) setProfileSearchResults(data || [])
        else setProfileSearchResults([])
        setSearchingProfiles(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [searchQuery, isAddModalOpen, user?.id])

  // ------------------------------------------------------------
  // OCR Ingestion
  // ------------------------------------------------------------
  const handleParseReceipt = async () => {
    if (!rawText.trim()) {
      showToast('Please paste the receipt text first.', 'warning')
      return
    }
    setAppState('processing')
    try {
      const { data, error } = await supabase.functions.invoke('parse-receipt', {
        body: { rawText: rawText.trim() }
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setReceiptData(data)
      setClaims({})
      setAppState('review')
    } catch (err) {
      showToast('Failed to parse receipt.', 'error')
      setAppState('idle')
    }
  }

  const handleParseImage = async (image) => {
    if (!image?.base64) return
    setAppState('processing')
    try {
      const { data, error } = await supabase.functions.invoke('parse-receipt', {
        body: {
          imageBase64: image.base64,
          imageMimeType: image.mimeType
        }
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setReceiptData(data)
      setClaims({})
      setCapturedImage(null)
      setAppState('review')
    } catch (err) {
      showToast('Failed to parse receipt image.', 'error')
      setAppState('capturing')
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
      showToast('Please choose an image file.', 'warning')
      return
    }

    try {
      const processed = await processImageFile(file)

      // Warn if the raw file is very large — Supabase has a body size limit
      // (~6 MB on the free plan). Gemini itself is fine up to 20 MB.
      if (!processed.wasCompressed && processed.originalSize > 4_500_000) {
        showToast('Image is quite large — the upload may fail. Try a screenshot instead.', 'warning')
      }

      setCapturedImage(processed)
      setAppState('capturing')
    } catch (err) {
      showToast('Could not read the image. Try a different file.', 'error')
    }
  }

  const openCamera = () => {
    fileInputRef.current?.click()
  }

  const handleUsePhoto = () => {
    if (capturedImage) handleParseImage(capturedImage)
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setAppState('idle')
  }

  const handleReviewComplete = (reviewedData) => {
    setReceiptData(reviewedData)
    setClaims({})
    setAppState('claiming')
  }

  const handleReviewCancel = () => {
    setReceiptData(null)
    setCapturedImage(null)
    setClaims({})
    setAppState('idle')
  }

  // Matrix Logic
  const toggleClaim = (itemIndex) => {
    setClaims(prev => {
      const currentClaimants = prev[itemIndex] || []
      const hasClaimed = currentClaimants.includes(activeClaimant)
      let newClaimants
      if (hasClaimed) {
        newClaimants = currentClaimants.filter(id => id !== activeClaimant)
      } else {
        newClaimants = [...currentClaimants, activeClaimant]
      }
      return { ...prev, [itemIndex]: newClaimants }
    })
  }

  // Progress Bar Math
  const { totalClaimed, subtotal } = useMemo(() => {
    if (!receiptData) return { totalClaimed: 0, subtotal: 0 }
    let claimed = 0
    receiptData.items.forEach((item, index) => {
      const claimants = claims[index] || []
      if (claimants.length > 0) claimed += item.price
    })
    return { totalClaimed: claimed, subtotal: receiptData.subtotal }
  }, [receiptData, claims])

  // ============================================
  // SETTLEMENT ENGINE
  // ============================================

  const handleOpenReview = () => {
    if (!receiptData || totalClaimed !== subtotal) return

    const rawTotals = {}
    sessionParticipants.forEach(p => rawTotals[p.id] = 0)

    receiptData.items.forEach((item, index) => {
      const claimants = claims[index] || []
      if (claimants.length > 0) {
        const splitPrice = item.price / claimants.length
        claimants.forEach(id => {
          if (rawTotals[id] !== undefined) rawTotals[id] += splitPrice
        })
      }
    })

    const totalExtras = (receiptData.tax || 0) + (receiptData.service_charge || 0)
    let distributedExtras = 0
    const finalLedger = []

    sessionParticipants.forEach(person => {
      const itemTotal = rawTotals[person.id]
      if (itemTotal === 0) return

      const proportion = itemTotal / subtotal
      let extraShare = Math.round((totalExtras * proportion) * 100) / 100

      distributedExtras += extraShare

      finalLedger.push({
        id: person.id,
        name: person.name,
        type: person.type,
        items_total: itemTotal,
        tax_share: extraShare,
        final_owed: itemTotal + extraShare
      })
    })

    // Penny Sweeper — assign any rounding remainder to the host if they have
    // a share, otherwise to the largest share so the receipt total is exact.
    const difference = Math.round((totalExtras - distributedExtras) * 100) / 100
    if (difference !== 0 && finalLedger.length > 0) {
      const hostIndex = finalLedger.findIndex(p => p.id === user.id)
      const targetIndex = hostIndex !== -1
        ? hostIndex
        : finalLedger.reduce(
            (best, p, i) =>
              p.final_owed > finalLedger[best].final_owed ? i : best,
            0
          )
      finalLedger[targetIndex].tax_share += difference
      finalLedger[targetIndex].final_owed += difference
    }

    setLedgerPreview(finalLedger)
    setShowReviewModal(true)
  }

  const handleLockSession = async () => {
    if (!ledgerPreview) return
    setIsLocking(true)

    try {
      const { data: session, error: sessionErr } = await supabase
        .from('split_sessions')
        .insert({
          host_id: user.id,
          merchant: receiptData.merchant,
          subtotal: receiptData.subtotal,
          tax: receiptData.tax || 0,
          service_charge: receiptData.service_charge || 0,
          total: receiptData.total,
          status: 'locked'
        })
        .select()
        .single()

      if (sessionErr) throw sessionErr

      const claimsPayload = []
      receiptData.items.forEach((item, index) => {
        const claimants = claims[index] || []
        const splitWeight = 1 / claimants.length

        claimants.forEach(claimantId => {
          const person = sessionParticipants.find(p => p.id === claimantId)
          claimsPayload.push({
            session_id: session.id,
            item_name: item.name,
            item_price: item.price,
            user_id: person.type === 'user' ? person.id : null,
            contact_id: person.type === 'ghost' ? person.id : null,
            share_weight: splitWeight
          })
        })
      })

      const debtsPayload = ledgerPreview
        .filter(person => person.id !== user.id && person.final_owed > 0)
        .map(person => ({
          creditor_id: user.id,
          debtor_user_id: person.type === 'user' ? person.id : null,
          debtor_contact_id: person.type === 'ghost' ? person.id : null,
          session_id: session.id,
          amount: parseFloat(person.final_owed.toFixed(2)),
          status: 'pending'
        }))

      if (claimsPayload.length > 0) await supabase.from('split_claims').insert(claimsPayload)
      if (debtsPayload.length > 0) await supabase.from('split_debts').insert(debtsPayload)

      showToast('Session locked and debts recorded!', 'success')
      setShowReviewModal(false)
      setLedgerPreview(null)
      setActiveTab('debts')
      setAppState('idle')
      setReceiptData(null)
      setClaims({})
      setRawText('')
      setCapturedImage(null)
      await refreshPendingCount()

    } catch (err) {
      console.error('Lock Error:', err)
      showToast('Failed to lock session.', 'error')
    } finally {
      setIsLocking(false)
    }
  }

  // Helpers
  const handleCreateGhost = async () => {
    if (!newGhostName.trim()) return
    setIsCreatingGhost(true)
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({ host_id: user.id, name: newGhostName.trim() })
        .select()
        .single()
      if (error) throw error
      const newParticipant = { id: data.id, name: data.name, type: 'ghost' }
      setSessionParticipants(prev => [...prev, newParticipant])
      setActiveClaimant(data.id)
      setNewGhostName('')
      setIsAddModalOpen(false)
      showToast(`${data.name} added.`, 'success')
    } catch (err) {
      showToast('Failed to create guest.', 'error')
    } finally {
      setIsCreatingGhost(false)
    }
  }

  const addParticipantToBill = (person) => {
    if (!sessionParticipants.find(p => p.id === person.id)) {
      setSessionParticipants(prev => [
        ...prev,
        { id: person.id, name: person.name, type: person.type || 'ghost' }
      ])
    }
    setActiveClaimant(person.id)
    setIsAddModalOpen(false)
  }

  const getInitials = (id) => {
    const person = sessionParticipants.find(p => p.id === id)
    return person ? person.name.substring(0, 2).toUpperCase() : '?'
  }

  const filteredFriends = networkFriends.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredGhosts = ghostContacts.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const visibleSearchResults = profileSearchResults
    .filter(p => !networkFriends.find(f => f.id === p.id))
    .filter(p => !sessionParticipants.find(sp => sp.id === p.id))
  
    // ------------------------------------------------------------
  // Review mode takes over the whole screen — no back button,
  // no tab bar, just the editable receipt form.
  // ------------------------------------------------------------
  const isReviewMode = activeTab === 'new' && appState === 'review'

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 space-y-4">
      {/* Hidden camera input — always mounted so the ref is stable */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* ===================== REVIEW STEP ===================== */}
      {isReviewMode && (
        <ItemReviewStep
          initialData={receiptData}
          onContinue={handleReviewComplete}
          onCancel={handleReviewCancel}
        />
      )}

      {/* ===================== NORMAL APP CHROME ===================== */}
      {!isReviewMode && (
        <>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-bold text-fg-muted hover:text-fg transition-colors mb-4 px-1"
            style={{ minHeight: 44 }}
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          {/* ===================== TAB BAR ===================== */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-surface-2 rounded-2xl mb-2">
            <button
              onClick={() => setActiveTab('new')}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'new'
                  ? 'bg-surface text-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg'
              }`}
              style={{ minHeight: 44 }}
            >
              <Receipt className="w-4 h-4" />
              New Split
            </button>
            <button
              onClick={() => setActiveTab('debts')}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'debts'
                  ? 'bg-surface text-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg'
              }`}
              style={{ minHeight: 44 }}
            >
              <HandCoins className="w-4 h-4" />
              Debts
              {pendingCount > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === 'debts'
                    ? 'bg-brand-solid text-white'
                    : 'bg-brand-soft text-brand'
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          {/* ===================== NEW SPLIT TAB ===================== */}
          {activeTab === 'new' && (
            <>
              {appState === 'idle' && (
                <section className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-brand-soft text-brand shadow-sm">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-base text-fg">New Split Bill</span>
                  </div>

                  <p className="text-sm text-fg-muted mb-4">
                    Snap a photo of your receipt, or paste its text below.
                  </p>

                  <button
                    onClick={openCamera}
                    className="w-full flex items-center justify-center gap-2.5 bg-brand-solid hover:bg-brand-solid-hover text-white py-4 rounded-2xl text-sm font-bold transition-colors mb-5"
                    style={{ minHeight: 56 }}
                  >
                    <Camera className="w-5 h-5" />
                    Scan Receipt
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-line" />
                    <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
                      or paste text
                    </span>
                    <div className="flex-1 h-px bg-line" />
                  </div>

                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Murni Discovery&#10;Nasi Goreng 12.00..."
                    className="w-full h-40 bg-surface-2 border border-line rounded-xl p-4 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand transition-all resize-none mb-3"
                  />

                  <button
                    onClick={handleParseReceipt}
                    disabled={!rawText.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-surface hover:bg-surface-2 border border-line-strong text-fg py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                    style={{ minHeight: 44 }}
                  >
                    <FileText className="w-4 h-4" />
                    Extract from Text
                  </button>
                </section>
              )}

              {appState === 'capturing' && capturedImage && (
                <section className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-brand-soft text-brand shadow-sm">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-base text-fg block">Confirm Photo</span>
                      <span className="text-xs text-fg-muted">
                        Make sure the receipt is fully visible and in focus.
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-line bg-surface-2 mb-4">
                    {capturedImage.previewSupported ? (
                      <img
                        src={capturedImage.previewUrl}
                        alt="Receipt preview"
                        className="w-full max-h-[55vh] object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const parent = e.currentTarget.parentElement
                          if (parent && !parent.querySelector('[data-heic-fallback]')) {
                            const fallback = document.createElement('div')
                            fallback.dataset.heicFallback = 'true'
                            fallback.className =
                              'flex flex-col items-center justify-center p-8 text-fg-muted'
                            fallback.innerHTML = `
                              <div style="font-size:12px;font-weight:700;color:var(--fg)">HEIC image ready</div>
                              <div style="font-size:11px;margin-top:4px">${(capturedImage.originalSize / 1024 / 1024).toFixed(1)} MB · tap Use This Photo to continue</div>
                            `
                            parent.appendChild(fallback)
                          }
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <ImageIcon className="w-10 h-10 text-fg-subtle mb-3" />
                        <p className="text-sm font-bold text-fg">HEIC image ready</p>
                        <p className="text-[11px] text-fg-muted mt-1">
                          {(capturedImage.originalSize / 1024 / 1024).toFixed(1)} MB · Tap Use This Photo to continue
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleRetake}
                      className="flex items-center justify-center gap-2 bg-surface hover:bg-surface-2 border border-line-strong text-fg py-3 rounded-xl text-sm font-bold transition-colors"
                      style={{ minHeight: 48 }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Retake
                    </button>
                    <button
                      onClick={handleUsePhoto}
                      className="flex items-center justify-center gap-2 bg-brand-solid hover:bg-brand-solid-hover text-white py-3 rounded-xl text-sm font-bold transition-colors"
                      style={{ minHeight: 48 }}
                    >
                      <Check className="w-4 h-4" />
                      Use This Photo
                    </button>
                  </div>
                </section>
              )}

              {appState === 'processing' && (
                <section className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-12 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 relative flex items-center justify-center mb-4">
                    <div className="absolute inset-0 border-4 border-brand-soft rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                    <FileText className="w-6 h-6 text-brand absolute" />
                  </div>
                  <h3 className="text-lg font-bold text-fg mb-1">Analyzing Receipt</h3>
                </section>
              )}

              {appState === 'claiming' && receiptData && (
                <>
                  <section className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 shadow-sm sticky top-4 z-30">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-bold text-lg text-fg truncate pr-4">
                        {receiptData.merchant || 'Merchant'}
                      </h2>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
                          Receipt Total
                        </div>
                        <div className="text-sm font-black text-fg">
                          RM {receiptData.total?.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-fg-muted">Items Claimed</span>
                      <span className={totalClaimed === subtotal ? 'text-success' : 'text-fg'}>
                        RM {totalClaimed.toFixed(2)} / RM {subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-surface-3 rounded-full overflow-hidden mb-4">
                      <div
                        className={`h-full transition-all duration-300 ${
                          totalClaimed === subtotal ? 'bg-success' : 'bg-brand-solid'
                        }`}
                        style={{ width: `${Math.min((totalClaimed / subtotal) * 100, 100)}%` }}
                      />
                    </div>

                    <button
                      onClick={handleOpenReview}
                      disabled={totalClaimed !== subtotal}
                      className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                      style={{ minHeight: 44 }}
                    >
                      Review & Lock Session
                    </button>
                  </section>

                  <section className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                    {sessionParticipants.map(person => (
                      <button
                        key={person.id}
                        onClick={() => setActiveClaimant(person.id)}
                        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          activeClaimant === person.id
                            ? person.type === 'user'
                              ? 'bg-brand-solid text-white shadow-md'
                              : 'bg-purple-500 text-white shadow-md'
                            : 'bg-surface/60 backdrop-blur-xl text-fg-muted hover:text-fg border border-line/50'
                        }`}
                        style={{ minHeight: 44 }}
                      >
                        {person.type === 'user'
                          ? <User className="w-4 h-4" />
                          : <Users className="w-4 h-4" />}
                        {person.name}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-fg bg-surface-2 border border-dashed border-line-strong hover:bg-surface-3 transition-colors"
                      style={{ minHeight: 44 }}
                    >
                      <Plus className="w-4 h-4" /> Add Person
                    </button>
                  </section>

                  <section className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl shadow-sm overflow-hidden pb-2">
                    <div className="divide-y divide-line">
                      {receiptData.items.map((item, index) => {
                        const claimants = claims[index] || []
                        const isClaimedByActive = claimants.includes(activeClaimant)
                        const isFullyClaimed = claimants.length > 0

                        return (
                          <button
                            key={index}
                            onClick={() => toggleClaim(index)}
                            className="w-full flex items-center justify-between p-4 hover:bg-surface-2/50 transition-colors text-left"
                            style={{ minHeight: 44 }}
                          >
                            <div className="flex items-center gap-3">
                              {isClaimedByActive
                                ? <CheckCircle2 className="w-5 h-5 text-brand" />
                                : <Circle className="w-5 h-5 text-line-strong" />}
                              <div>
                                <p className={`text-sm font-bold transition-colors ${
                                  isFullyClaimed ? 'text-fg' : 'text-fg-muted'
                                }`}>
                                  {item.name}
                                </p>
                                {isFullyClaimed && (
                                  <div className="flex gap-1 mt-1.5">
                                    {claimants.map(id => {
                                      const p = sessionParticipants.find(x => x.id === id)
                                      const isUser = p?.type === 'user'
                                      return (
                                        <span
                                          key={id}
                                          className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                            isUser
                                              ? 'bg-brand-soft text-brand'
                                              : 'bg-purple-soft text-purple'
                                          }`}
                                        >
                                          {getInitials(id)}
                                        </span>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-bold text-fg">
                              RM {item.price.toFixed(2)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                </>
              )}
            </>
          )}

          {/* ===================== DEBTS TAB ===================== */}
          {activeTab === 'debts' && (
            <DebtHub
              user={user}
              showToast={showToast}
              onDebtsChanged={refreshPendingCount}
            />
          )}
        </>
      )}

      {/* ===================== REVIEW & LOCK MODAL ===================== */}
      {showReviewModal && ledgerPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isLocking && setShowReviewModal(false)}
          />
          <div className="relative bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-line">
              <h3 className="font-bold text-lg text-fg mb-1">Confirm Final Split</h3>
              <p className="text-xs text-fg-muted">
                Taxes and service charges have been distributed proportionally.
              </p>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5 space-y-4">
              {ledgerPreview.map(person => (
                <div
                  key={person.id}
                  className={`p-4 rounded-xl border ${
                    person.id === user.id
                      ? 'bg-brand-soft border-brand-soft'
                      : 'bg-surface-2 border-line'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-bold text-sm ${
                      person.id === user.id ? 'text-brand' : 'text-fg'
                    }`}>
                      {person.name} {person.id === user.id && '(Host)'}
                    </span>
                    <span className="font-black text-sm text-fg">
                      RM {person.final_owed.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-fg-muted">
                    <span>Items claimed:</span>
                    <span>RM {person.items_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-fg-muted mt-1">
                    <span>Proportional tax:</span>
                    <span>RM {person.tax_share.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-line bg-surface-2/50 flex gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                disabled={isLocking}
                className="flex-1 bg-surface border border-line hover:bg-surface-3 text-fg py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                style={{ minHeight: 44 }}
              >
                Cancel
              </button>
              <button
                onClick={handleLockSession}
                disabled={isLocking}
                className="flex-1 bg-brand-solid hover:bg-brand-solid-hover text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                style={{ minHeight: 44 }}
              >
                {isLocking
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Check className="w-4 h-4" />}
                Confirm & Lock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== ADD PARTICIPANT MODAL ===================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsAddModalOpen(false)}
          />
          <div
            className="relative bg-surface rounded-t-3xl p-5 shadow-2xl animate-in slide-in-from-bottom max-h-[80vh] overflow-y-auto"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-fg">Add to Bill</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 bg-surface-2 rounded-full text-fg-muted hover:text-fg"
                style={{ minHeight: 44, minWidth: 44 }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6 bg-surface-2 p-4 rounded-xl border border-line">
              <p className="text-xs font-bold text-fg-subtle uppercase tracking-wider mb-2">
                Create Guest Profile
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGhostName}
                  onChange={(e) => setNewGhostName(e.target.value)}
                  placeholder="e.g. Encik Wan"
                  className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-brand"
                />
                <button
                  onClick={handleCreateGhost}
                  disabled={!newGhostName.trim() || isCreatingGhost}
                  className="bg-brand-solid text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2"
                  style={{ minHeight: 44 }}
                >
                  {isCreatingGhost
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Plus className="w-4 h-4" />}
                  Add
                </button>
              </div>
            </div>

            <p className="text-xs font-bold text-fg-subtle uppercase tracking-wider mb-2">
              Search Network & Contacts
            </p>
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-fg-subtle absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or name..."
                className="w-full bg-surface-2 border border-line rounded-lg pl-9 pr-3 py-2.5 text-sm text-fg outline-none focus:border-brand"
              />
            </div>

            <div className="space-y-2">
              {filteredFriends.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => addParticipantToBill(friend)}
                  className="w-full flex items-center gap-3 p-3 bg-surface border border-line rounded-xl hover:bg-surface-2 transition-colors text-left"
                  style={{ minHeight: 44 }}
                >
                  <div className="w-8 h-8 bg-brand-soft text-brand rounded-full flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-fg">{friend.name}</span>
                </button>
              ))}

              {ghostContacts.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowGhosts(s => !s)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-surface-2 transition-colors"
                    style={{ minHeight: 44 }}
                    aria-expanded={showGhosts}
                  >
                    <span className="text-xs font-bold text-fg-subtle uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-purple" />
                      Guests ({ghostContacts.length})
                    </span>
                    {showGhosts
                      ? <ChevronUp className="w-4 h-4 text-fg-muted" />
                      : <ChevronDown className="w-4 h-4 text-fg-muted" />}
                  </button>

                  {showGhosts && (
                    <div className="space-y-2 mt-1">
                      {filteredGhosts.map(ghost => (
                        <button
                          key={ghost.id}
                          onClick={() => addParticipantToBill(ghost)}
                          className="w-full flex items-center gap-3 p-3 bg-surface border border-line rounded-xl hover:bg-surface-2 transition-colors text-left"
                          style={{ minHeight: 44 }}
                        >
                          <div className="w-8 h-8 bg-purple-soft text-purple rounded-full flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-fg">{ghost.name}</span>
                        </button>
                      ))}
                      {filteredGhosts.length === 0 && (
                        <p className="text-xs text-fg-muted py-3 px-3">
                          No guests match "{searchQuery.trim()}".
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {searchQuery.trim().length >= 2 && (
              <div className="mt-5">
                <p className="text-xs font-bold text-fg-subtle uppercase tracking-wider mb-2">
                  Other users
                </p>

                {searchingProfiles && (
                  <p className="text-xs text-fg-muted py-3">Searching…</p>
                )}

                {!searchingProfiles && visibleSearchResults.length === 0 && (
                  <p className="text-xs text-fg-muted py-3">
                    No users match "{searchQuery.trim()}". They need to sign up first,
                    or you can create a guest profile above.
                  </p>
                )}

                {!searchingProfiles && visibleSearchResults.length > 0 && (
                  <div className="space-y-2">
                    {visibleSearchResults.map(person => {
                      const displayName =
                        person.first_name || person.username || 'Unknown'
                      return (
                        <button
                          key={person.id}
                          onClick={() =>
                            addParticipantToBill({
                              id: person.id,
                              name: displayName,
                              type: 'user'
                            })
                          }
                          className="w-full flex items-center gap-3 p-3 bg-surface border border-line rounded-xl hover:bg-surface-2 transition-colors text-left"
                          style={{ minHeight: 44 }}
                        >
                          <div className="w-8 h-8 bg-brand-soft text-brand rounded-full flex items-center justify-center shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-fg truncate">
                              {displayName}
                            </p>
                            {person.username && (
                              <p className="text-[11px] text-fg-subtle truncate">
                                @{person.username}
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}