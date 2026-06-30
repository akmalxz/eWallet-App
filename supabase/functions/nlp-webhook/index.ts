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
// 2. HIERARCHICAL NLP & OCR PARSER
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
    // Strict receipt formatting
    const strictPattern = /(?:rm|myr|ringgit)\s*([\d,]+\.\d{2})/i;
    const strictMatch = text.match(strictPattern);
    if (strictMatch) return parseFloat(strictMatch[1].replace(/,/g, ''));

    // Decimal pattern
    const decimalPattern = /([\d,]+\.\d{2})/;
    const decimalMatch = text.match(decimalPattern);
    if (decimalMatch) return parseFloat(decimalMatch[1].replace(/,/g, ''));

    // Fallback
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
    
    // Look for subcategories first
    const subCategories = this.categories.filter(c => c.parent_id);
    for (const sub of subCategories) {
      if (lowerText.includes(sub.name.toLowerCase())) {
        const parent = this.categories.find(c => c.id === sub.parent_id);
        return parent ? `${parent.name} > ${sub.name}` : sub.name;
      }
    }
    
    // Fallback to main categories
    const mainCategories = this.categories.filter(c => !c.parent_id);
    for (const main of mainCategories) {
      if (lowerText.includes(main.name.toLowerCase())) return main.name;
    }
    
    return 'uncategorized';
  }

  // Validate if category exists in user's categories
  validateCategory(category: string): { valid: boolean; normalizedCategory: string } {
    if (!category || category === 'uncategorized') {
      return { valid: true, normalizedCategory: 'uncategorized' };
    }

    // Check exact match
    const exactMatch = this.categories.find(c => c.name === category);
    if (exactMatch) {
      return { valid: true, normalizedCategory: category };
    }

    // Check hierarchical match (e.g., "Food & Beverages > Lunch")
    const hierarchyMatch = this.categories.find(c => `${c.name}` === category);
    if (hierarchyMatch) {
      return { valid: true, normalizedCategory: category };
    }

    // Try to find parent > child match
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
    
    // Bank name normalization
    let searchSpace = lowerText;
    if (searchSpace.includes('bank kerjasama') || searchSpace.includes('bankrakyat')) searchSpace += ' bank rakyat ';
    if (searchSpace.includes('gxbank')) searchSpace += ' gx bank ';
    if (searchSpace.includes('malayan banking')) searchSpace += ' maybank ';
    
    for (const acc of Object.keys(this.accountDict)) {
      if (searchSpace.includes(acc)) {
        if (/(?:received|deposit|income)/i.test(searchSpace)) {
          result.destinationAccountId = this.accountDict[acc];
        } else {
          result.sourceAccountId = this.accountDict[acc];
        }
        break;
      }
    }

    // Extract and validate category
    const extractedCategory = this.extractCategory(normalizedText);
    const validation = this.validateCategory(extractedCategory);
    result.category = validation.valid ? validation.normalizedCategory : 'uncategorized';
    
    // Smart description extractor
    const isOCR = normalizedText.length > 50 || normalizedText.includes('\n');
    
    if (isOCR) {
        const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l);
        let extractedName = '';
        let extractedRef = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            
            if ((line === 'biller' || line === 'recipient' || line === 'merchant name') && !extractedName) {
                if (i + 1 < lines.length) extractedName = lines[i + 1];
            }
            
            if ((line === 'recipient reference' || line.includes('ref-1')) && !extractedRef) {
                if (i + 1 < lines.length) extractedRef = lines[i + 1];
            }
        }
        
        if (extractedName) {
            const cleanName = extractedName.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
            result.description = `[OCR] Paid ${cleanName}`;
            
            if (extractedRef && extractedRef.length < 25) {
                result.description += ` (${extractedRef})`;
            }
        } else {
            result.description = `[OCR] Scanned Receipt`;
        }
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
// 3. VALIDATION FUNCTIONS
// ============================================
function validateTransaction(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate amount
  if (!payload.amount || payload.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  // Validate accounts
  if (!payload.source_account_id && !payload.destination_account_id) {
    errors.push('At least one account must be specified');
  }

  // Validate description
  if (!payload.description || payload.description.trim().length === 0) {
    errors.push('Description is required');
  }

  // Validate category
  if (!payload.category || payload.category === 'uncategorized') {
    // Allow uncategorized but flag for review
    payload.needs_review = true;
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// 4. RATE LIMITING (Simple in-memory)
// ============================================
const rateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10; // 10 requests per minute

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
// 5. EDGE FUNCTION HANDLER
// ============================================
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ✅ SECURITY FIX: Use environment variable for secret
    const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? '';
    
    if (!WEBHOOK_SECRET) {
      console.error('WEBHOOK_SECRET environment variable is not set');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('Authorization');
    
    // ✅ SECURITY FIX: Proper token validation
    if (!authHeader || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Parse request body
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

    // Validate required fields
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

    // ✅ RATE LIMITING: Check rate limit per user
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return new Response(JSON.stringify({ error: rateLimitCheck.message }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
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

    // Verify user exists
    const { data: userData, error: userError } = await supabaseClient
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (userError || !userData || userData.length === 0) {
      return new Response(JSON.stringify({ error: 'User not found or has no accounts' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch Accounts
    const { data: accounts, error: fetchError } = await supabaseClient
      .from('accounts')
      .select('id, account_name, classification')
      .eq('user_id', userId);

    if (fetchError || !accounts) {
      console.error('Failed to fetch accounts:', fetchError);
      throw new Error('Failed to fetch user accounts');
    }

    // Fetch Custom Categories
    const { data: categories } = await supabaseClient
      .from('categories')
      .select('id, name, parent_id')
      .eq('user_id', userId);

    // Build Account Dictionary
    const dynamicDictionary: Record<string, string> = {};
    accounts.forEach(acc => {
      const name = acc.account_name.toLowerCase();
      dynamicDictionary[name] = acc.id;
      if (acc.classification === 'ewallet' && name.includes('tng')) dynamicDictionary['tng'] = acc.id;
      if (acc.classification === 'digital_bank' && name.includes('gx')) dynamicDictionary['gx'] = acc.id;
      if (acc.classification === 'hub' && name.includes('maybank')) dynamicDictionary['mbb'] = acc.id;
      dynamicDictionary[acc.classification] = acc.id;
    });

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

    // Determine if transaction needs review
    const isHighConfidence = !text.includes('\n') && parsedData.category !== 'uncategorized';

    // Build payload
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
        parser_version: '1.0.0'
      }
    };

    // ✅ VALIDATION: Validate transaction before insert
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

    // Check for duplicate transaction (idempotency)
    const { data: existingTx, error: duplicateCheckError } = await supabaseClient
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('amount', payload.amount)
      .eq('description', payload.description)
      .gte('transaction_date', new Date(Date.now() - 60000).toISOString()) // Last minute
      .limit(1);

    if (duplicateCheckError) {
      console.error('Duplicate check error:', duplicateCheckError);
    }

    if (existingTx && existingTx.length > 0) {
      return new Response(JSON.stringify({ 
        warning: 'Duplicate transaction detected',
        transaction_id: existingTx[0].id
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Insert transaction
    const { error: insertError, data: insertedData } = await supabaseClient
      .from('transactions')
      .insert([payload])
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Success response
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