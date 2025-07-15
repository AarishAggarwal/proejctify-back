import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are HighSchoolTutorAI: a friendly, expert tutor for grades 9–12.
- Define any technical term in simple language.
- Use real‑world examples.
- Keep tone encouraging and concise.
- Always tailor content to a high‑school audience.
`;

// Helper to extract number of ideas requested
function extractIdeaCount(message) {
  const match = message.match(/(\d+)\s*(project|idea)/i);
  if (match) {
    const n = parseInt(match[1], 10);
    if (!isNaN(n) && n > 0 && n < 10) return n;
  }
  return 1;
}

// Helper to detect 'more details' requests
function isMoreDetailsRequest(message) {
  return /more details|expand|explain|full details|step by step|breakdown|how to/i.test(message);
}

router.post('/api/chatbot', async (req, res) => {
  console.log('Received POST /api/chatbot');
  const { message, lastIdea } = req.body;
  if (!message) {
    console.log('No message provided');
    return res.status(400).json({ error: 'No message provided.' });
  }

  try {
    if (isMoreDetailsRequest(message) && lastIdea) {
      // User wants more details about a specific idea
      const detailedStructure = `
Provide a detailed, step-by-step project plan for the following idea, using this structure:

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

Keep the answer under 1200 characters and format for chat.`.trim();

      const refinePrompt = `
The user wants more details about this project idea:
"""
${lastIdea}
"""

${detailedStructure}
`;
      console.log('Calling OpenAI for more details...');
      const refineResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: refinePrompt },
        ],
        max_tokens: 900,
      });
      console.log('Received detailed response from OpenAI');
      const reply = refineResponse.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new Error('OpenAI (details) returned no content.');
      console.log('Sending detailed response to client');
      return res.status(200).json({ reply });
    }

    // Otherwise, generate project ideas (short format)
    const ideaCount = extractIdeaCount(message);
    const ideaPrompt = `
The user is asking for project ideas. For each idea, return ONLY:
- Project Title
- Unique Selling Point (USP)
- Recommended Competition (name + deadline)
- Cheats (AI to use, website, or shortcut to make the project easier)

If the user asks for multiple ideas, return that many ideas in a numbered list. Do NOT include any other details unless the user specifically asks for more.

Format:
1. Project Title: ...\n   USP: ...\n   Competition: ...\n   Cheats: ...

Give exactly ${ideaCount} idea${ideaCount > 1 ? 's' : ''}.
Keep each idea concise and under 300 characters. Format for chat.`.trim();

    console.log('Calling OpenAI for idea(s)...');
    const ideaResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: ideaPrompt + '\n\nUser message: ' + message },
      ],
      max_tokens: 900,
    });
    console.log('Received idea(s) from OpenAI');
    const reply = ideaResponse.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('OpenAI (ideas) returned no content.');
    console.log('Sending idea(s) response to client');
    res.status(200).json({ reply });
  } catch (err) {
    console.error('❌ Chatbot error:', err);
    res.status(500).json({ error: err.message || 'Internal error.' });
  }
});

export default router; 