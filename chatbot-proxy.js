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

// Helper: Detect if user is asking for an idea or detailed description
function isIdeaOrDescriptionRequest(message) {
  const keywords = [
    'idea', 'project', 'suggest', 'suggestion', 'detailed description', 'execution plan', 'topic', 'innovative', 'creative', 'plan', 'summary', 'competition', 'step-by-step', 'steps', 'how to', 'how can I', 'can you give', 'can you provide', 'can you suggest', 'can you recommend'
  ];
  const lower = message.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

router.post('/api/chatbot', async (req, res) => {
  console.log('Received POST /api/chatbot');
  const { message } = req.body;
  if (!message) {
    console.log('No message provided');
    return res.status(400).json({ error: 'No message provided.' });
  }

  try {
    if (!isIdeaOrDescriptionRequest(message)) {
      // Counselor mode: supportive, motivational, or advice
      const counselorPrompt = `You are a supportive high school counselor. Respond to the student's message with empathy, encouragement, and practical advice. Do not generate project ideas or detailed plans unless specifically asked. Keep your response concise and friendly.`;
      const counselorResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: counselorPrompt + '\n\nStudent: ' + message }
        ],
        max_tokens: 400,
      });
      const reply = counselorResponse.choices?.[0]?.message?.content?.trim();
      return res.status(200).json({ draft: reply, reply });
    }

    // --- Project idea logic (existing) ---
    console.log('Building idea prompt...');
    // 1. Generate a project idea (with cheats/tips for high schoolers)
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

IMPORTANT: The entire response must be under 1024 characters. The answer should be clearly structured, concise, and formatted to fit well in a chat window (use short paragraphs, lists, and clear section breaks).`.trim();

    const ideaPrompt = `
${message}

Include practical cheats, tips, or shortcuts that high school students can use to make the project easier or more impressive.

${detailedStructure}
`.trim();

    console.log('Calling OpenAI for idea...');
    const ideaResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: ideaPrompt },
      ],
      max_tokens: 900,
    });
    console.log('Received idea from OpenAI');

    const draft = ideaResponse.choices?.[0]?.message?.content?.trim();
    if (!draft) {
      console.log('No draft returned from OpenAI (step 1)');
      throw new Error('OpenAI (step 1) returned no content.');
    }

    // 2. Refine and explain for a high schooler
    const refinePrompt = `
Here’s a project idea draft for high schoolers. Please:
1. Polish it for a high‑school audience.
2. Clearly explain any cheats, tips, or shortcuts included.
3. Make the explanation as practical and actionable as possible for a high school student.
4. IMPORTANT: The entire response must be under 1024 characters. The answer should be clearly structured, concise, and formatted to fit well in a chat window (use short paragraphs, lists, and clear section breaks).

"""
${draft}
"""

${detailedStructure}
`.trim();

    console.log('Calling OpenAI for refinement...');
    const refineResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: refinePrompt },
      ],
      max_tokens: 900,
    });
    console.log('Received refinement from OpenAI');

    const finalReply = refineResponse.choices?.[0]?.message?.content?.trim();
    if (!finalReply) {
      console.log('No final reply returned from OpenAI (step 2)');
      throw new Error('OpenAI (step 2) returned no content.');
    }

    console.log('Sending response to client');
    res.status(200).json({
      draft,
      reply: finalReply,
    });
  } catch (err) {
    console.error('❌ Chatbot error:', err);
    res.status(500).json({ error: err.message || 'Internal error.' });
  }
});

export default router; 