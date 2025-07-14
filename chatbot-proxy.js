import express from 'express';
import OpenAI from 'openai';
import fetch from 'node-fetch';

const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DEEPSEEK_URL = process.env.OPENROUTER_URL; // e.g. "https://api.openrouter.ai"
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;

const SYSTEM_PROMPT = `
You are HighSchoolTutorAI: a friendly, expert tutor for grades 9–12.
- Define any technical term in simple language.
- Use real‑world examples.
- Keep tone encouraging and concise.
- Always tailor content to a high‑school audience.
`;

router.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'No message provided.' });
  }

  try {
    // 1) Get a base response from DeepSeek
    const dsResp = await fetch(`${DEEPSEEK_URL}/v1/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-r1:free',
        prompt: message,
        max_tokens: 400,
        temperature: 0.7,
      }),
    });
    const dsJson = await dsResp.json();
    const draft = dsJson.choices?.[0]?.text?.trim();
    if (!draft) throw new Error('DeepSeek returned no text.');

    // 2) Refine with OpenAI GPT, merging original refinement and detailed project structure
    const detailedStructure = `
Additionally, format the project idea using exactly this structure:

Project Title: <Concise, engaging title>
Summary: <One-sentence overview>
Problem Being Solved: <What real issue it addresses>
Proposed Solution: <How the idea solves it>
Resources Required: <Key materials or expertise>
Basic Items Needed & Approximate Cost (₹):
- Item 1: ₹X (under ₹300)
- Item 2: ₹Y
- Item 3: ₹Z
Total Cost: ₹<sum of items>
Timeline: <High-level phases and durations>
Recommended Competition: <Contest name + deadline>
Step-by-Step Execution:
1. ...
2. ...
…
How to Measure Success: <Metrics or outcomes>
Final Tips for Completion: <Any final advice>
`.trim();

    const chat = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `
Here’s the draft reply from DeepSeek; please:
1. Polish it for a high‑school audience.
2. Propose one unique, sensible, original project idea.
3. Recommend one relevant competition to apply for (with name and deadline).
4. Suggest the best AI model or integration to help build the project.

"""
${draft}
"""

${detailedStructure}
`.trim() },
      ],
      max_tokens: 700,
      temperature: 0.8,
    });

    const finalReply = chat.choices?.[0]?.message?.content?.trim();
    if (!finalReply) throw new Error('GPT returned no content.');

    res.status(200).json({ reply: finalReply });
  } catch (err) {
    console.error('❌ Chat error:', err);
    res.status(500).json({ error: err.message || 'Internal error.' });
  }
});

export default router; 