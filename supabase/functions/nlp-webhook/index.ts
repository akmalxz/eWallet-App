import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// ============================================
// 1. CORS CONFIGURATION
// ============================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// 2. THE UPGRADED NLP & OCR PARSER
// ============================================
class TransactionParser {
  accountDict: Record<string, string>;
  categoryDict: Record<string, string[]>;

  constructor(accountDict: Record<string, string>, categoryDict?: Record<string, string[]>) {
    this.accountDict = accountDict;
    this.categoryDict = categoryDict || {};
  }

  findAccountId(name: string) {
    if (!name || Object.keys(this.accountDict).length === 0) return null;
    const normalized = name.toLowerCase().trim();
    if (this.accountDict[normalized]) return this.accountDict[normalized];
    for (const [key, uuid] of Object.entries(this.accountDict)) {
      if (normalized.includes(key) || key.includes(normalized)) return uuid;
    }
    return null;
  }

  extractAmount(text: string) {
    // 1. Strict receipt formatting (e.g., RM 15.00, MYR1,200.50)
    const strictPattern = /(?:rm|myr|ringgit)\s*([\d,]+\.\d{2})/i;
    const strictMatch = text.match(strictPattern);
    if (strictMatch) return parseFloat(strictMatch[1].replace(/,/g, ''));

    // 2. Second priority: Any number with exactly two decimal places
    const decimalPattern = /([\d,]+\.\d{2})/;
    const decimalMatch = text.match(decimalPattern);
    if (decimalMatch) return parseFloat(decimalMatch[1].replace(/,/g, ''));

    // 3. Fallback: Loose number matching for manual typing
    const patterns = [
      /(?:rm|myr|ringgit)?\s*([\d,]+\.?\d*)\s*(?:rm|myr|ringgit)?/i,
      /([\d,]+\.?\d*)\s*(?:rm|myr|ringgit)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return parseFloat(match[1].replace(/,/g, ''));
    }
    return null;
  }

  extractCategory(text: string) {
    const lowerText = text.toLowerCase();
    
    // Check against custom user categories first
    for (const [categoryName, keywords] of Object.entries(this.categoryDict)) {
      if (keywords && keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        return categoryName;
      }
      if (lowerText.includes(categoryName.toLowerCase())) return categoryName;
    }

    // Static Fallbacks
    if (/(?:grab|foodpanda|shopeefood)/i.test(lowerText)) return 'Food';
    if (/(?:netflix|spotify|steam)/i.test(lowerText)) return 'Entertainment';
    if (/(?:tnb|syabas|celcom|maxis|unifi)/i.test(lowerText)) return 'Utilities';

    return 'uncategorized';
  }

  parse(text: string) {
    const normalizedText = text.trim();
    const result = {
      amount: null as number | null, 
      sourceAccountId: null as string | null, 
      destinationAccountId: null as string | null,
      category: 'uncategorized', 
      description: '', 
      type: 'expense'
    };

    result.amount = this.extractAmount(normalizedText);
    if (!result.amount) throw new Error('Could not find amount in the provided text/image.');

    const lowerText = normalizedText.toLowerCase();
    
    for (const acc of Object.keys(this.accountDict)) {
      if (lowerText.includes(acc)) {
        if (/(?:received|deposit)/i.test(lowerText)) {
          result.destinationAccountId = this.accountDict[acc];
        } else {
          result.sourceAccountId = this.accountDict[acc];
        }
        break;
      }
    }

    result.category = this.extractCategory(normalizedText);
    
    // Clean up OCR text
    const isOCR = normalizedText.length > 100 || normalizedText.includes('\n');
    if (isOCR) {
        result.description = `[OCR] Scanned Receipt`;
    } else {
        let description = normalizedText
          .replace(/RM\s*[\d,]+\.?\d*/gi, '').replace(/[\d,]+\.?\d*/g, '')
          .replace(/(?:from|to|at|into|for|dari|ke|di|pada)\s+[a-zA-Z\s]+/gi, '').trim();
        result.description = description || `${result.type} ${result.amount}`;
    }
    
    return result;
  }
}

// ============================================
// 3. EDGE FUNCTION HANDLER
// ============================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer automation-secret-123`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const { text, userId } = await req.json()
    if (!text) throw new Error('No text provided')
    if (!userId) throw new Error('No user ID provided. Update your Apple Shortcut.')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch Accounts
    const { data: accounts, error: fetchError } = await supabaseClient
      .from('accounts')
      .select('id, account_name, classification')
      .eq('user_id', userId)

    if (fetchError || !accounts) throw new Error('Failed to fetch user accounts')

    // Fetch Custom Categories
    const { data: categories } = await supabaseClient
      .from('categories')
      .select('name, keywords')
      .eq('user_id', userId)

    // Build Account Dictionary
    const dynamicDictionary: Record<string, string> = {}
    accounts.forEach(acc => {
      const name = acc.account_name.toLowerCase()
      dynamicDictionary[name] = acc.id
      if (acc.classification === 'ewallet' && name.includes('tng')) dynamicDictionary['tng'] = acc.id
      if (acc.classification === 'digital_bank' && name.includes('gx')) dynamicDictionary['gx'] = acc.id
      if (acc.classification === 'hub' && name.includes('maybank')) dynamicDictionary['mbb'] = acc.id
      dynamicDictionary[acc.classification] = acc.id
    })

    // Build Category Dictionary
    const categoryDictionary: Record<string, string[]> = {}
    if (categories) {
      categories.forEach(cat => {
        categoryDictionary[cat.name.toLowerCase()] = cat.keywords || [cat.name.toLowerCase()]
      })
    }

    const parser = new TransactionParser(dynamicDictionary, categoryDictionary)
    const parsedData = parser.parse(text)

    const payload = {
      user_id: userId,
      description: parsedData.description,
      amount: Math.abs(parsedData.amount), 
      source_account_id: parsedData.sourceAccountId,
      destination_account_id: parsedData.destinationAccountId,
      category: parsedData.category,
      metadata: { source: 'webhook_automation', raw_text: text }
    }

    const { error: insertError } = await supabaseClient.from('transactions').insert([payload])
    if (insertError) throw insertError

    return new Response(JSON.stringify({ success: true, payload }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})