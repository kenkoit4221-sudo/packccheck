export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, apiKey } = req.body;

    const PROMPT = `You are an expert food packaging compliance analyst for EU and UK markets.

Analyze this food packaging image carefully. Look at every detail — text blocks, symbols, logos, ingredient lists, nutritional tables, allergen declarations, recycling symbols, contact information, and any claims.

Return ONLY a raw JSON object (no markdown, no code blocks, no explanation):

{
  "issues": [
    {
      "id": 1,
      "type": "error",
      "title": "Short title max 8 words",
      "body": "Clear explanation of the problem and why it matters.",
      "regulation": "Specific regulation reference",
      "pin_x": 0.25,
      "pin_y": 0.45,
      "box_x": 0.10,
      "box_y": 0.40,
      "box_w": 0.30,
      "box_h": 0.12
    }
  ],
  "ok_count": 11
}

COORDINATE SYSTEM: All values are fractions 0.0-1.0 of the IMAGE dimensions.
- pin_x, pin_y: exact center of the problem area (where the pin tip should point)
- box_x, box_y: top-left corner of highlight rectangle
- box_w, box_h: width and height of highlight rectangle

Be very precise with coordinates. Look carefully at the actual position of each element.

type: "error" = critical non-compliance, "warning" = minor issue or recommendation
ok_count: integer count of requirements that ARE met

Focus on:
1. Allergen highlighting — FIC 1169/2011 Art.21: allergens must be visually distinct in EVERY language version
2. Minimum font size — FIC Art.13: x-height 1.2mm for mandatory info on packs over 80cm2
3. Gluten/health claims — EU 41/2009, EU 1924/2006: claims must be substantiated
4. Green/carbon claims — Green Claims Directive 2024/825: environmental claims need verified methodology
5. Recycling symbols — PPWR 2025/40: material identification codes
6. UK market — UK FIR 2014: UK responsible person required if selling in UK
7. Net quantity placement and format
8. Any other visible compliance issues`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64
              }
            },
            { type: 'text', text: PROMPT }
          ]
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    const raw = (data.content || []).map(b => b.text || '').join('').trim();
    const parsed = JSON.parse(raw);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
