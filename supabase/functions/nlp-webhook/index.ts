// supabase/functions/nlp-webhook/index.ts
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
// 2. COMMON BANK ALIASES (Malaysian-focused)
// ============================================
// Each key is a canonical identifier. The array contains variations
// that should all resolve to the same account. When the user has an
// account whose name contains ANY of these strings, all variations
// become valid lookup keys for that account.
//
// To add a new bank: just add a new entry here.
const COMMON_BANK_ALIASES: Record<string, string[]> = {
  maybank: [
    'maybank', 'mbb', 'malayan banking', 'maybank2u', 'mae',
    'maybank islamic', 'maybank investment'
  ],
  cimb: [
    'cimb', 'cimb bank', 'cimb clicks', 'cimb octo', 'cimb niaga'
  ],
  tng: [
    'tng', 'touch n go', 'touchngo', 'tngo', 'tng ewallet',
    'tng wallet', 'touch and go'
  ],
  gx: [
    'gx', 'gxbank', 'gx bank', 'gxbank berhad'
  ],
  bank_rakyat: [
    'bank rakyat', 'br', 'bank kerjasama rakyat',
    'bank rakyat malaysia'
  ],
  public_bank: [
    'public bank', 'pbb', 'pbe', 'public bank berhad',
    'public islamic bank'
  ],
  rhb: [
    'rhb', 'rhb bank', 'rhb islamic', 'rhb reflex'
  ],
  hong_leong: [
    'hong leong', 'hlb', 'hong leong bank', 'hong leong connect',
    'hong leong islamic'
  ],
  ambank: [
    'ambank', 'am bank', 'ammb', 'am bank islamic'
  ],
  bank_islam: [
    'bank islam', 'bimb', 'bank islam malaysia'
  ],
  bsn: [
    'bsn', 'bank simpanan nasional'
  ],
  bnm: [
    'bank negara', 'bnm'
  ],
  boost: [
    'boost', 'boost bank', 'boost ewallet'
  ],
  grab: [
    'grab', 'grabpay', 'grab pay', 'grab ewallet'
  ],
  shopee: [
    'shopeepay', 'shopee pay', 'shopee'
  ],
  alrajhi: [
    'al rajhi', 'alrajhi', 'al rajhi bank'
  ],
  bank_muamalat: [
    'bank muamalat', 'muamalat'
  ],
  affin: [
    'affin', 'affin bank'
  ],
  alliance: [
    'alliance', 'alliance bank'
  ],
  bnp: [
    'bnp', 'bnp paribas'
  ],
  aeon_bank: [
    'aeon bank', 'aeonbank', 'aeon', '/ON BANK', '/on bank', '/onbank'
  ],
}

// ============================================
// 3. BUILD ACCOUNT DICTIONARY WITH ALIASES
// ============================================
function buildAccountDictionary(accounts: any[]): Record<string, string> {
  const dict: Record<string, string> = {}

  for (const acc of accounts) {
    const name = acc.account_name.toLowerCase().trim()
    dict[name] = acc.id

    // Add classification as a lookup key (e.g., "ewallet", "digital_bank")
    if (acc.classification) {
      dict[acc.classification] = acc.id
    }

    // Match against common bank aliases
    for (const [canonical, aliases] of Object.entries(COMMON_BANK_ALIASES)) {
      const matches = aliases.some(alias => name.includes(alias))
      if (matches) {
        // Register ALL aliases for this account (not just the matched one)
        for (const alias of aliases) {
          if (!dict[alias]) dict[alias] = acc.id
        }
        // Also register the canonical key itself
        if (!dict[canonical]) dict[canonical] = acc.id
      }
    }

    // Add user-specified aliases if the column exists
    if (Array.isArray(acc.aliases)) {
      for (const alias of acc.aliases) {
        const key = String(alias).toLowerCase().trim()
        if (key) dict[key] = acc.id
      }
    }
  }

  return dict
}

// ============================================
// 4. HIERARCHICAL NLP & OCR PARSER
// ============================================
class TransactionParser {
  accountDict: Record<string, string>;
  categories: any[];

  constructor(accountDict: Record<string, string>, categories?: any[]) {
    this.accountDict = accountDict;
    this.categories = categories || [];
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
    const strictPattern = /(?:rm|myr|ringgit)\s*([\d,]+\.\d{2})/i;
    const strictMatch = text.match(strictPattern);
    if (strictMatch) return parseFloat(strictMatch[1].replace(/,/g, ''));

    const decimalPattern = /([\d,]+\.\d{2})/;
    const decimalMatch = text.match(decimalPattern);
    if (decimalMatch) return parseFloat(decimalMatch[1].replace(/,/g, ''));

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
    if (this.categories.length === 0) return 'uncategorized';
    const lowerText = text.toLowerCase();

    // Look for subcategories first — check name AND keywords
    const subCategories = this.categories.filter(c => c.parent_id);
    for (const sub of subCategories) {
      // Match by subcategory name
      if (lowerText.includes(sub.name.toLowerCase())) {
        const parent = this.categories.find(c => c.id === sub.parent_id);
        return parent ? `${parent.name} > ${sub.name}` : sub.name;
      }
      // Match by keyword
      if (sub.keywords && Array.isArray(sub.keywords)) {
        for (const keyword of sub.keywords) {
          if (keyword && lowerText.includes(String(keyword).toLowerCase())) {
            const parent = this.categories.find(c => c.id === sub.parent_id);
            return parent ? `${parent.name} > ${sub.name}` : sub.name;
          }
        }
      }
    }

    // Fallback to main categories — check name AND keywords
    const mainCategories = this.categories.filter(c => !c.parent_id);
    for (const main of mainCategories) {
      if (lowerText.includes(main.name.toLowerCase())) {
        return main.name;
      }
      if (main.keywords && Array.isArray(main.keywords)) {
        for (const keyword of main.keywords) {
          if (keyword && lowerText.includes(String(keyword).toLowerCase())) {
            return main.name;
          }
        }
      }
    }

    return 'uncategorized';
  }

  validateCategory(category: string): { valid: boolean; normalizedCategory: string } {
    if (!category || category === 'uncategorized') {
      return { valid: true, normalizedCategory: 'uncategorized' };
    }

    const exactMatch = this.categories.find(c => c.name === category);
    if (exactMatch) {
      return { valid: true, normalizedCategory: category };
    }

    const parts = category.split(' > ');
    if (parts.length === 2) {
      const [parentName, childName] = parts;
      const parent = this.categories.find(c => c.name === parentName && !c.parent_id);
      if (parent) {
        const child = this.categories.find(c => c.name === childName && c.parent_id === parent.id);
        if (child) {
          return { valid: true, normalizedCategory: `${parentName} > ${childName}` };
        }
      }
    }

    return { valid: false, normalizedCategory: 'uncategorized' };
  }

  // Detect whether the input looks like OCR'd receipt text
  private detectOCRSource(text: string): boolean {
    const lower = text.toLowerCase();
    // Strong signals: receipt-specific keywords
    const ocrKeywords = [
      'biller', 'recipient', 'recipient reference', 'reference',
      'receipt', 'invoice', 'total amount', 'payment details',
      'ref-1', 'ref no', 'transaction id', 'merchant'
    ];
    if (ocrKeywords.some(kw => lower.includes(kw))) return true;

    // Medium signal: multi-line + length
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    return lines.length >= 4 && text.length > 80;
  }

    parse(text: string) {
    // Normalize common OCR misreads before parsing
    const normalizedText = text
      .replace(/Æ/g, 'AE')
      .replace(/æ/g, 'ae')
      .replace(/[`´'’‘“”]/g, '')
      .trim();

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

    // Account matching
    for (const acc of Object.keys(this.accountDict)) {
      if (lowerText.includes(acc)) {
        if (/(?:received|deposit|income|credited)/i.test(lowerText)) {
          result.destinationAccountId = this.accountDict[acc];
        } else {
          result.sourceAccountId = this.accountDict[acc];
        }
        break;
      }
    }

    // Category
    const extractedCategory = this.extractCategory(normalizedText);
    const validation = this.validateCategory(extractedCategory);
    result.category = validation.valid ? validation.normalizedCategory : 'uncategorized';

    // Description
    const isOCR = this.detectOCRSource(normalizedText);

    if (isOCR) {
      const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l);
      let extractedName = '';
      let extractedRef = '';

      const NAME_LABELS = ['biller', 'recipient', 'merchant name', 'transfer to'];
      const REF_LABELS  = ['recipient reference', 'ref-1', 'reference'];

      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const line = raw.toLowerCase();

        if (!extractedName) {
          for (const label of NAME_LABELS) {
            if (line.startsWith(label + ' ')) {
              const rest = raw.substring(label.length).trim();
              if (rest) { extractedName = rest; break; }
            } else if (line === label && i + 1 < lines.length) {
              extractedName = lines[i + 1];
              break;
            }
          }
        }

        if (!extractedRef) {
          for (const label of REF_LABELS) {
            if (line === label && i + 1 < lines.length) {
              extractedRef = lines[i + 1];
              break;
            }
            if (line.startsWith(label + ' ')) {
              const rest = raw.substring(label.length).trim();
              if (rest) { extractedRef = rest; break; }
            }
          }
        }
      }

      if (extractedName) {
        const trimmed = extractedName.trim();
        const cleanName = trimmed === trimmed.toLowerCase()
          ? trimmed.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1))
          : trimmed;

        result.description = `[OCR] Paid ${cleanName}`;

        if (extractedRef && extractedRef.length < 25) {
          result.description += ` (${extractedRef})`;
        }
      } else {
        result.description = `[OCR] Scanned Receipt`;
      }
    } else {
      let description = normalizedText
        .replace(/RM\s*[\d,]+\.?\d*/gi, '')
        .replace(/[\d,]+\.?\d*/g, '')
        .replace(/(?:from|to|at|into|for|dari|ke|di|pada)\s+[a-zA-Z\s]+/gi, '')
        .trim();
      result.description = description || `${result.type} ${result.amount}`;
    }

    return result;
  }
}

// ============================================
// 5. VALIDATION
// ============================================
function validateTransaction(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload.amount || payload.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (!payload.source_account_id && !payload.destination_account_id) {
    errors.push('At least one account must be specified');
  }

  if (!payload.description || payload.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (!payload.category || payload.category === 'uncategorized') {
    payload.needs_review = true;
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// 6. RATE LIMITING
// ============================================
const rateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 10;

  const record = rateLimit.get(userId);

  if (!record || now > record.resetTime) {
    rateLimit.set(userId, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, message: 'Rate limit exceeded. Please wait before trying again.' };
  }

  record.count++;
  return { allowed: true };
}

// ============================================
// 7. EDGE FUNCTION HANDLER
// ============================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? '';

    if (!WEBHOOK_SECRET) {
      console.error('WEBHOOK_SECRET environment variable is not set');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('Authorization');

    if (!authHeader || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { text, userId, source = 'webhook_automation' } = body;

    if (!text) {
      return new Response(JSON.stringify({ error: 'No text provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'No user ID provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return new Response(JSON.stringify({ error: rateLimitCheck.message }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase environment variables are not set');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user exists via profiles (more reliable than accounts)
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profileData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch Accounts (include aliases if the column exists)
    const { data: accounts, error: fetchError } = await supabaseClient
      .from('accounts')
      .select('id, account_name, classification, aliases')
      .eq('user_id', userId);

    // Graceful fallback if 'aliases' column doesn't exist yet
    let safeAccounts = accounts;
    if (fetchError) {
      const fallback = await supabaseClient
        .from('accounts')
        .select('id, account_name, classification')
        .eq('user_id', userId);
      if (fallback.error) {
        console.error('Failed to fetch accounts:', fallback.error);
        throw new Error('Failed to fetch user accounts');
      }
      safeAccounts = fallback.data || [];
    }

    if (!safeAccounts || safeAccounts.length === 0) {
      return new Response(JSON.stringify({
        error: 'User has no accounts. Please add at least one account in the app first.'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch Custom Categories (include keywords!)
    const { data: categories } = await supabaseClient
      .from('categories')
      .select('id, name, parent_id, keywords')
      .eq('user_id', userId);

    // Build Alias-Expanded Account Dictionary
    const dynamicDictionary = buildAccountDictionary(safeAccounts);
    console.log('[DEBUG] userId received:', userId);
    console.log('[DEBUG] Accounts for this user:', safeAccounts.map(a => a.account_name));
    console.log('[DEBUG] Dict keys:', Object.keys(dynamicDictionary).filter(k => 
      k.includes('aeon') || k.includes('/on')
    ));
    console.log('[DEBUG] Text preview:', text.substring(0, 100));

    // Parse transaction
    const parser = new TransactionParser(dynamicDictionary, categories || []);
    let parsedData;
    try {
      parsedData = parser.parse(text);
    } catch (parseError) {
      return new Response(JSON.stringify({ error: parseError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine confidence
    const isHighConfidence = !parser['detectOCRSource'].call(parser, text)
      && parsedData.category !== 'uncategorized'
      && (parsedData.sourceAccountId || parsedData.destinationAccountId);

    const payload = {
      user_id: userId,
      description: parsedData.description || 'Webhook transaction',
      amount: Math.abs(parsedData.amount),
      source_account_id: parsedData.sourceAccountId,
      destination_account_id: parsedData.destinationAccountId,
      category: parsedData.category,
      needs_review: !isHighConfidence,
      metadata: {
        source: source,
        raw_text: text,
        parsed_at: new Date().toISOString(),
        parser_version: '1.1.0'
      }
    };

    const validation = validateTransaction(payload);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: validation.errors
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Duplicate check — only for OCR-sourced inputs, and include account in the check
    const isOCR = parser['detectOCRSource'].call(parser, text);
    if (isOCR) {
      const { data: existingTx } = await supabaseClient
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('amount', payload.amount)
        .eq('description', payload.description)
        .eq('source_account_id', payload.source_account_id ?? '')
        .gte('transaction_date', new Date(Date.now() - 120000).toISOString())
        .limit(1);

      if (existingTx && existingTx.length > 0) {
        return new Response(JSON.stringify({
          warning: 'Duplicate transaction detected',
          transaction_id: existingTx[0].id
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const { error: insertError, data: insertedData } = await supabaseClient
      .from('transactions')
      .insert([payload])
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({
      success: true,
      transaction_id: insertedData?.[0]?.id,
      needs_review: payload.needs_review,
      payload
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});