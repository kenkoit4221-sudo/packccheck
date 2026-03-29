export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, apiKey } = req.body;

    const PROMPT = `You are an expert food packaging compliance analyst for EU and UK markets.

This image shows a food packaging design as a flat unfolded layout — the full packaging spread horizontally across the image.

COORDINATE SYSTEM — read carefully:
All coordinates are fractions 0.0-1.0 of the FULL image width and height.
x=0.0 is the very left edge, x=1.0 is the very right edge.
y=0.0 is the very top edge, y=1.0 is the very bottom edge.

To find coordinates of any element:
1. Estimate how far from the LEFT the element is as a fraction → that is pin_x
2. Estimate how far from the TOP the element is as a fraction → that is pin_y
3. For the bounding box, estimate the top-left corner (box_x, box_y) and size (box_w, box_h)

TYPICAL PANEL POSITIONS for this Tetra Pak horizontal layout:
- Far left panel (marketing slogans): x≈0.00-0.17
- Ingredient/nutrition panel: x≈0.17-0.42
- Center panel (large logo + product image): x≈0.42-0.65
- Multilingual text panel: x≈0.65-0.82
- Setup info panel (right): x≈0.82-1.00
- Main content vertically: y≈0.08-0.78
- Symbol strip (FSC, barcodes): y≈0.78-0.90
- Bottom branding strip: y≈0.90-1.00

Return ONLY raw JSON, no markdown, no explanation:

{"issues":[{"id":1,"type":"error","title":"max 8 word title","body":"Clear 2-3 sentence explanation.","regulation":"Specific regulation","pin_x":0.25,"pin_y":0.45,"box_x":0.18,"box_y":0.40,"box_w":0.20,"box_h":0.10}],"ok_count":10}

type: "error"=critical violation, "warning"=minor issue
ok_count: integer, number of requirements that ARE met

Check these compliance areas:
1. Allergen highlighting — FIC 1169/2011 Art.21: allergens must be bold/italic/coloured in EVERY language version shown on pack
2. Font size — FIC Art.13 Annex IV: mandatory info x-height must be ≥1.2mm on packs >80cm²
3. Gluten-free claim — EU 41/2009: must be substantiated, gluten content ≤20mg/kg
4. Carbon/green claims — Green Claims Directive 2024/825: all environmental claims need verified methodology publicly available
5. Organic claim — EU 2018/848 Art.32: control body code must appear on same display panel as organic logo
6. UK responsible person — UK FIR 2014: if sold in UK, a UK address must appear on pack
7. Recycling/material codes — PPWR 2025/40 and Decision 97/129/EC
8. Storage and use instructions — FIC Art.25: must be present and legible
9. Any other issues you observe`;

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
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
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

