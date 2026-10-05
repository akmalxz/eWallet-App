// supabase/functions/parse-receipt/index.ts

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { rawText, imageBase64, imageMimeType } = body;

    const hasText = typeof rawText === 'string' && rawText.trim().length > 0;
    const hasImage =
      typeof imageBase64 === 'string' &&
      imageBase64.length > 0 &&
      typeof imageMimeType === 'string' &&
      imageMimeType.startsWith('image/');

    if (!hasText && !hasImage) {
      throw new Error("Request must include either 'rawText' or 'imageBase64' + 'imageMimeType'.");
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY secret is not set.");
    }

    // ------------------------------------------------------------
    // Build the multimodal parts array. Image wins if both present
    // (image is the higher-fidelity source).
    // ------------------------------------------------------------
    const parts: any[] = [];
    if (hasImage) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
      });
      parts.push({
        text: 'Parse this receipt image. Read every line carefully — some may be faded or handwritten.',
      });
    } else {
      parts.push({ text: rawText });
    }

    const payload = {
      contents: [{ parts }],
      systemInstruction: {
        parts: [{
          text: `You are a highly accurate financial receipt parsing engine.
Extract the data from the provided receipt and return it strictly matching this JSON schema:
{
  "merchant": "string",
  "items": [ { "name": "string", "price": number } ],
  "subtotal": number,
  "tax": number,
  "service_charge": number,
  "total": number
}
Rules:
- Do not include markdown formatting or backticks.
- Items should only include food/products, not subtotals or taxes.
- If a tax or service charge is missing, return 0.
- All numerical values must be floats (e.g., 15.50).
- If a line item's price is unreadable, use 0 and keep the name.`,
        }],
      },
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonString) {
      throw new Error('Gemini returned an empty response.');
    }

    const parsedReceipt = JSON.parse(jsonString);

    return new Response(JSON.stringify(parsedReceipt), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});