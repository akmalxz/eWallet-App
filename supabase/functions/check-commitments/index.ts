// supabase/functions/check-commitments/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Malaysia time offset (UTC+8) in milliseconds
const MY_TZ_OFFSET_MS = 8 * 60 * 60 * 1000

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ============================================
    // AUTH: Require CRON_SECRET Bearer token
    // ============================================
    const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

    if (!CRON_SECRET) {
      console.error('CRON_SECRET environment variable is not set')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ============================================
    // TIMEZONE-AWARE "TODAY"
    // ============================================
    const nowUTC = new Date()
    const nowMY = new Date(nowUTC.getTime() + MY_TZ_OFFSET_MS)
    const currentDay = nowMY.getUTCDate()
    const currentMonth = nowMY.getUTCMonth()

    // Start of "today" in MYT expressed as UTC ISO string
    const startOfDayMY = new Date(
      Date.UTC(nowMY.getUTCFullYear(), nowMY.getUTCMonth(), nowMY.getUTCDate(), 0, 0, 0)
    )
    const startOfDayUTC = new Date(startOfDayMY.getTime() - MY_TZ_OFFSET_MS)

    // ============================================
    // FETCH DUE COMMITMENTS
    // ============================================
    const { data: commitments, error } = await supabaseClient
      .from('commitments')
      .select('*, accounts(user_id)')
      .eq('due_day_of_month', currentDay)
      .eq('is_active', true)

    if (error) throw error

    const results: any[] = []

    for (const commitment of commitments || []) {
      // ============================================
      // GUARD: Skip commitments with no linked account
      // ============================================
      const ownerId = commitment.accounts?.user_id
      if (!ownerId || !commitment.account_id) {
        results.push({
          commitment: commitment.name,
          status: 'skipped_no_account'
        })
        continue
      }

      // ============================================
      // IDEMPOTENCY: Skip if already processed today
      // ============================================
      const { data: existing, error: checkError } = await supabaseClient
        .from('transactions')
        .select('id')
        .eq('description', `[Auto] ${commitment.name}`)
        .gte('transaction_date', startOfDayUTC.toISOString())
        .limit(1)

      if (checkError) {
        console.error('Error checking existing:', checkError)
        results.push({
          commitment: commitment.name,
          status: 'error',
          error: checkError.message
        })
        continue
      }

      if (existing && existing.length > 0) {
        results.push({
          commitment: commitment.name,
          status: 'already_processed',
          transaction_id: existing[0].id
        })
        continue
      }

      // ============================================
      // BALANCE CHECK (safe with maybeSingle)
      // ============================================
      const { data: accountData } = await supabaseClient
        .from('v_account_balances')
        .select('balance')
        .eq('account_id', commitment.account_id)
        .maybeSingle()

      const currentBalance = accountData?.balance ?? 0
      const isOverdraft = currentBalance < commitment.amount

      // ============================================
      // INSERT TRANSACTION
      // ============================================
      const { data: inserted, error: insertError } = await supabaseClient
        .from('transactions')
        .insert({
          user_id: ownerId,
          description: `[Auto] ${commitment.name}`,
          amount: commitment.amount,
          source_account_id: commitment.account_id,
          destination_account_id: null,
          category: 'Commitments',
          transaction_date: new Date().toISOString(),
          needs_review: isOverdraft,
          metadata: {
            commitment_id: commitment.id,
            auto_generated: true,
            due_day: commitment.due_day_of_month,
            is_overdraft: isOverdraft,
            balance_before: currentBalance
          }
        })
        .select()

      if (insertError) {
        results.push({
          commitment: commitment.name,
          status: 'error',
          error: insertError.message
        })
        console.error('Error inserting:', insertError)
        continue
      }

      // ============================================
      // UPDATE COMMITMENT last_paid + last_paid_month
      // ============================================
      const { error: updateError } = await supabaseClient
        .from('commitments')
        .update({
          last_paid: new Date().toISOString(),
          last_paid_month: currentMonth
        })
        .eq('id', commitment.id)

      if (updateError) {
        console.error('Failed to update commitment:', updateError)
      }

      results.push({
        commitment: commitment.name,
        status: isOverdraft ? 'processed_with_warning' : 'processed',
        transaction_id: inserted?.[0]?.id,
        is_overdraft: isOverdraft
      })
    }

    return new Response(JSON.stringify({
      success: true,
      processed: results,
      date: new Date().toISOString(),
      timezone: 'Asia/Kuala_Lumpur',
      current_day: currentDay,
      summary: {
        total: results.length,
        processed: results.filter(r => r.status === 'processed').length,
        warnings: results.filter(r => r.status === 'processed_with_warning').length,
        errors: results.filter(r => r.status === 'error').length,
        skipped: results.filter(r => r.status === 'already_processed').length,
        skipped_no_account: results.filter(r => r.status === 'skipped_no_account').length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})