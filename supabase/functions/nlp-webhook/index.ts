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
const COMMON_BANK_ALIASES: Record<string, string[]> = {
  maybank: [
    'maybank', 'mbb', 'malayan banking', 'maybank2u', 'mae',
    'maybank islamic', 'maybank investment', ') maybank'
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
  aeon_bank: [
    'aeon bank', 'aeonbank', 'aeon',
    '/on bank', '/onbank', '/on',
    'eon bank', 'eonbank',
    '2aeon bank', '2aeonbank'
  ],
  bank_rakyat: [
    'bank rakyat', 'br', 'bank kerjasama rakyat',
    'bank rakyat malaysia'
  ],
  public_bank: [
    'public bank', 'pbb', 'pbe', 'public bank berhad',
    'public islamic bank'
  ],
  rhb: ['rhb', 'rhb bank', 'rhb islamic', 'rhb reflex'],
  hong_leong: [
    'hong leong', 'hlb', 'hong leong bank', 'hong leong connect',
    'hong leong islamic'
  ],
  ambank: ['ambank', 'am bank', 'ammb', 'am bank islamic'],
  bank_islam: ['bank islam', 'bimb', 'bank islam malaysia'],
  bsn: ['bsn', 'bank simpanan nasional'],
  bnm: ['bank negara', 'bnm'],
  boost: ['boost', 'boost bank', 'boost ewallet'],
  grab: ['grab', 'grabpay', 'grab pay', 'grab ewallet'],
  shopee: ['shopeepay', 'shopee pay', 'shopee'],
  alrajhi: ['al rajhi', 'alrajhi', 'al rajhi bank'],
  bank_muamalat: ['bank muamalat', 'muamalat'],
  affin: ['affin', 'affin bank'],
  alliance: ['alliance', 'alliance bank'],
}

// ============================================
// 3. OCR TEXT NORMALIZER
// ============================================
function normalizeOCRText(text: string): string {
  let out = text
    .replace(/Æ/g, 'AE')
    .replace(/æ/g, 'ae')
    .replace(/[`´'’‘“”]/g, '')

  out = out.replace(/^[^a-zA-Z\n]*A?E?ON\s*Bank\b/i, 'AEON Bank')
  out = out.replace(/\n[^a-zA-Z\n]*A?E?ON\s*Bank\b/gi, '\nAEON Bank')

  return out.trim()
}

// ============================================
// 4. OCR LABEL EXTRACTION HELPERS
// ============================================
// Ordered longest-first so multi-word labels win over their prefixes.
const NAME_LABELS = [
  'recipient name', 'biller name', 'merchant name', 'payee name',
  'transfer to', 'beneficiary name', 'vendor name',
  'recipient', 'biller', 'merchant', 'payee', 'vendor', 'beneficiary',
  'name', 'to'
]

const REF_LABELS = [
  'recipient reference', 'reference number', 'reference no',
  'ref number', 'ref no', 'transaction id', 'ref-1', 'reference', 'ref'
]

// Words that are likely labels, not values. If the same-line text after
// a label is one of these, we skip to the next line for the real value.
const LABEL_STOPWORDS = new Set([
  'name', 'nama', 'reference', 'ref', 'details', 'detail',
  'info', 'information', 'id', 'no', 'number', 'recipient',
  'biller', 'merchant', 'payee', 'vendor', 'beneficiary', 'to',
  'recipient name', 'biller name', 'merchant name', 'payee name',
  'recipient reference', 'transfer to', 'transaction id'
])

// Match `line` against a `label`. Returns:
//   - null  → no match
//   - ""    → label matched but no same-line value
//   - "..." → same-line value after the label
function matchLabel(line: string, label: string): string | null {
  const lower = line.toLowerCase()
  const lab = label.toLowerCase()

  if (lower === lab) return ''

  if (lower.startsWith(lab + ':')) {
    return line.slice(lab.length + 1).trim()
  }
  if (lower.startsWith(lab + ' ')) {
    return line.slice(lab.length + 1).trim()
  }
  return null
}

// Find a value for the first matching label in `lines`.
function extractLabeledValue(lines: string[], labels: string[]): string {
  for (let i = 0; i < lines.length; i++) {
    for (const label of labels) {
      const sameLineValue = matchLabel(lines[i], label)
      if (sameLineValue === null) continue

      // Same-line value is valid only if it's not itself a label suffix
      if (
        sameLineValue &&
        !LABEL_STOPWORDS.has(sameLineValue.toLowerCase())
      ) {
        return sameLineValue
      }

      // Walk forward, skipping blank/stopword-only lines
      for (let j = i + 1; j < lines.length; j++) {
        const candidate = lines[j].trim()
        if (!candidate) continue
        if (LABEL_STOPWORDS.has(candidate.toLowerCase())) continue
        return candidate
      }

      // Matched a label but no value after it — try the next label/line
      break
    }
  }
  return ''
}

// ============================================
// 5. BUILD ACCOUNT DICTIONARY WITH ALIASES
// ============================================
function buildAccountDictionary(accounts: any[]): Record<string, string> {
  const dict: Record<string, string> = {}

  for (const acc of accounts) {
    const name = acc.account_name.toLowerCase().trim()
    dict[name] = acc.id

    if (acc.classification) {
      dict[acc.classification] = acc.id
    }

    for (const [canonical, aliases] of Object.entries(COMMON_BANK_ALIASES)) {
      const matches = aliases.some(alias => name.includes(alias))
      if (matches) {
        for (const alias of aliases) {
          if (!dict[alias]) dict[alias] = acc.id
        }
        if (!dict[canonical]) dict[canonical] = acc.id
      }
    }

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
// 6. HIERARCHICAL NLP & OCR PARSER
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

    const subCategories = this.categories.filter(c => c.parent_id);
    for (const sub of subCategories) {
      if (lowerText.includes(sub.name.toLowerCase())) {
        const parent = this.categories.find(c => c.id === sub.parent_id);
        return parent ? `${parent.name} > ${sub.name}` : sub.name;
      }
      if (sub.keywords && Array.isArray(sub.keywords)) {
        for (const keyword of sub.keywords) {
          if (keyword && lowerText.includes(String(keyword).toLowerCase())) {
            const parent = this.categories.find(c => c.id === sub.parent_id);
            return parent ? `${parent.name} > ${sub.name}` : sub.name;
          }
        }
      }
    }

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

  detectOCRSource(text: string): boolean {
    const lower = text.toLowerCase();
    const ocrKeywords = [
      'biller', 'recipient', 'recipient reference', 'reference',
      'receipt', 'invoice', 'total amount', 'payment details',
      'ref-1', 'ref no', 'transaction id', 'merchant',
      'transfer to', 'duitnow', 'successful'
    ];
    if (ocrKeywords.some(kw => lower.includes(kw))) return true;

    const lines = text.split('\n').filter(l => l.trim().length > 0);
    return lines.length >= 4 && text.length > 80;
  }

  parse(rawText: string) {
    const normalizedText = normalizeOCRText(rawText);

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
        if (/(?:received|deposit|income|credited)/i.test(lowerText)) {
          result.destinationAccountId = this.accountDict[acc];
        } else {
          result.sourceAccountId = this.accountDict[acc];
        }
        break;
      }
    }

    const extractedCategory = this.extractCategory(normalizedText);
    const validation = this.validateCategory(extractedCategory);
    result.category = validation.valid ? validation.normalizedCategory : 'uncategorized';

    const isOCR = this.detectOCRSource(normalizedText);

    if (isOCR) {
      const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l);

      const extractedName = extractLabeledValue(lines, NAME_LABELS);

      if (extractedName) {
        const trimmed = extractedName.trim();
        const cleanName = trimmed === trimmed.toLowerCase()
          ? trimmed.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1))
          : trimmed;
        result.description = cleanName;
      } else {
        result.description = 'Scanned Receipt';
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
// 7. VALIDATION
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
// 8. RATE LIMITING (simple in-memory)
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
// 9. EDGE FUNCTION HANDLER
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

    const { data: accounts, error: fetchError } = await supabaseClient
      .from('accounts')
      .select('id, account_name, classification, aliases')
      .eq('user_id', userId);

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

    const { data: categories } = await supabaseClient
      .from('categories')
      .select('id, name, parent_id, keywords')
      .eq('user_id', userId);

    const dynamicDictionary = buildAccountDictionary(safeAccounts);

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

    const isOCR = parser.detectOCRSource(normalizeOCRText(text));
    const isHighConfidence = !isOCR
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
        normalized_text: normalizeOCRText(text),
        parsed_at: new Date().toISOString(),
        parser_version: '1.2.2'
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

    if (isOCR && payload.source_account_id) {
      const { data: existingTx } = await supabaseClient
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('amount', payload.amount)
        .eq('description', payload.description)
        .eq('source_account_id', payload.source_account_id)
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