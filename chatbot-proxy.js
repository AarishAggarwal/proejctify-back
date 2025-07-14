import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // No baseURL needed for OpenAI
});

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
    // 1. Get draft and reasoning from DeepSeek Reasoner
    const dsResponse = await deepseek.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [{ role: "user", content: message }],
      max_tokens: 2048,
    });
    const reasoning = dsResponse.choices?.[0]?.message?.reasoning_content;
    const draft = dsResponse.choices?.[0]?.message?.content;

    if (!draft) throw new Error('DeepSeek returned no content.');

    // 2. Refine with OpenAI GPT
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

    const openaiPrompt = `
Here’s the draft reply from DeepSeek; please:
1. Polish it for a high‑school audience.
2. Propose one unique, sensible, original project idea.
3. Recommend one relevant competition to apply for (with name and deadline).
4. Suggest the best AI model or integration to help build the project.

"""
${draft}
"""

${detailedStructure}
`.trim();

    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: openaiPrompt },
      ],
      max_tokens: 1024,
    });

    const finalReply = openaiResponse.choices?.[0]?.message?.content?.trim();
    if (!finalReply) throw new Error('OpenAI returned no content.');

    res.status(200).json({
      reasoning,
      draft,
      reply: finalReply,
    });

  } catch (err) {
    console.error('❌ Chatbot error:', err);
    res.status(500).json({ error: err.message || 'Internal error.' });
  }
});

export default router; 