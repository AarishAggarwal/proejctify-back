// query_parser.js - Converted from query_parser.py

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function extractTopicFromInput(userQuery) {
    const prompt = `
Input: "${userQuery}"

Extract only the 2-3 most relevant keywords that represent the main topic or domain of the user's request.
Do NOT explain or generate. Just return keywords. All lowercase.

Examples:
- Input: "Give me some cool ideas about eco-friendly tech"
  Output: eco-friendly technology

- Input: "I want a project to save water and recycle stuff"
  Output: water recycling

- Input: "${userQuery}"
  Output:
`.trim();

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            temperature: 0,
            max_tokens: 10,
            messages: [
                {"role": "system", "content": "You extract only the topic of a query, like a search engine."},
                {"role": "user", "content": prompt}
            ]
        });
        return response.choices[0].message.content.trim().toLowerCase();
    } catch (error) {
        console.error(`❌ Smart parser error: ${error}`);
        return userQuery; // fallback
    }
} 