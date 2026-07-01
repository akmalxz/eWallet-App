// supabase/functions/check-commitments/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = new Date()
    const currentDay = today.getDate()

    // Find all active commitments due today
    const { data: commitments, error } = await supabaseClient
      .from('commitments')
      .select('*, accounts(user_id)')
      .eq('due_day_of_month', currentDay)
      .eq('is_active', true)

    if (error) throw error

    console.log(`📋 Found ${commitments?.length || 0} commitments due today`)

    const results = []

    for (const commitment of commitments || []) {
      // Check if already processed today
      const startOfDay = new Date(today)
      startOfDay.setHours(0, 0, 0, 0)
      
      const { data: existing, error: checkError } = await supabaseClient
        .from('transactions')
        .select('id')
        .eq('description', `[Auto] ${commitment.name}`)
        .gte('transaction_date', startOfDay.toISOString())
        .limit(1)

      if (checkError) {
        console.error('Error checking existing:', checkError)
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

      // Check if there's enough balance
      const { data: accountData } = await supabaseClient
        .from('v_account_balances')
        .select('balance')
        .eq('account_id', commitment.account_id)
        .single()

      const currentBalance = accountData?.balance || 0
      const isOverdraft = currentBalance < commitment.amount

      // Create transaction for the commitment
      const { data: inserted, error: insertError } = await supabaseClient
        .from('transactions')
        .insert({
          user_id: commitment.accounts.user_id,
          description: `[Auto] ${commitment.name}`,
          amount: commitment.amount,
          source_account_id: commitment.account_id,
          destination_account_id: null,
          category: 'Commitments',
          transaction_date: new Date().toISOString(),
          needs_review: isOverdraft, // Flag for review if overdraft
          metadata: { 
            commitment_id: commitment.id,
            auto_generated: true,
            due_day: commitment.due_day_of_month,
            is_overdraft: isOverdraft
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
      } else {
        results.push({ 
          commitment: commitment.name, 
          status: isOverdraft ? 'processed_with_warning' : 'processed',
          transaction_id: inserted?.[0]?.id,
          is_overdraft: isOverdraft
        })
        console.log(`✅ Processed: ${commitment.name} (${isOverdraft ? '⚠️ overdraft' : '✅'})`)
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results,
      date: new Date().toISOString(),
      summary: {
        total: results.length,
        processed: results.filter(r => r.status === 'processed').length,
        warnings: results.filter(r => r.status === 'processed_with_warning').length,
        errors: results.filter(r => r.status === 'error').length,
        skipped: results.filter(r => r.status === 'already_processed').length
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