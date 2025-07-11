// generator.js - Converted from generator.py

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Configuration ─────────────────────────────────────────────────────────
const CSV_PATH = path.join(__dirname, 'projects_db.csv');
const IDEA_COUNT = 3;    // how many new ideas to generate
const RETRIEVE_N = 5;    // how many past projects to show as context

// ─── Instantiate the new OpenAI client ─────────────────────────────────────
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ─── Load your CSV dataset ───────────────────────────────────────────────────
function loadAllProjects() {
    // Read projects_db.csv into a list of {'title','description','category'} dicts.
    try {
        const csvData = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = csvData.split('\n');
        const headers = lines[0].split(',');
        
        const titleCol = headers.find(h => h.toLowerCase().includes('title'));
        const descCol = headers.find(h => h.toLowerCase().includes('desc') || h.toLowerCase().includes('summary'));
        const categoryCol = headers.find(h => h.toLowerCase().includes('category'));
        
        if (!titleCol || !descCol) {
            throw new Error(`CSV missing title/description columns: ${headers}`);
        }
        
        const projects = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',');
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                
                projects.push({
                    title: row[titleCol].trim(),
                    description: row[descCol].trim(),
                    category: categoryCol ? row[categoryCol].trim() : 'General'
                });
            }
        }
        return projects;
    } catch (error) {
        console.error('Error loading projects:', error);
        return [];
    }
}

const ALL_PROJECTS = loadAllProjects();

// ─── Simple keyword-based retrieval ──────────────────────────────────────────
function getRelevantProjects(topic) {
    const tokens = topic.toLowerCase().match(/\w+/g) || [];
    const matches = [];
    
    for (const p of ALL_PROJECTS) {
        const text = (p.title + ' ' + p.description).toLowerCase();
        if (tokens.some(tok => text.includes(tok))) {
            matches.push(p);
            if (matches.length >= RETRIEVE_N) {
                break;
            }
        }
    }
    return matches;
}

// ─── Prompt builders ─────────────────────────────────────────────────────────
function makeDetailedPrompt(context, topic) {
    // Build a fully-structured multi-field prompt:
    // - Lists example projects
    // - Asks for structured ideas including realistic cost breakdown in ₹
    // - Requests a competition recommendation from dataset categories
    return `
You're a project mentor for high school students.

Here are some existing student projects for inspiration:
${context}

Using only those as inspiration, generate ${IDEA_COUNT} brand-new, creative project ideas in the domain of "${topic}". 

For each idea, return **exactly** in this format:

---
Project Title: <Concise, engaging title>
Summary: <One-sentence overview>
Problem Being Solved: <What real issue it addresses>
Proposed Solution: <How the idea solves it>
Resources Required: <Key materials or expertise>
Basic Items Needed & Approximate Cost (₹):
- Item 1 (e.g., cardboard sheet): ₹X (use inexpensive, commonly available items, under ₹300 each)
- Item 2 (e.g., glue stick): ₹Y
- Item 3 (e.g., LEDs, wires): ₹Z
(Try to keep total cost around ₹1,500 or less for the entire project.)
Timeline: <High-level phases and durations>
Cost Involved: ₹<total cost> (sum of items above)
Recommended Competition: <Suggest one contest/category from your dataset where this could be entered>
Step-by-Step Execution:
1. ...
2. ...
…
How to Measure Success: <Metrics or outcomes>
Final Tips for Completion: <Any final advice>
---
`.trim();
}

function makeFallbackPrompt(topic) {
    // If no similar projects exist, skip the example list but use the same
    // detailed structure with cost breakdown and competition recommendation.
    return `
You're a project mentor for high school students.

Generate ${IDEA_COUNT} innovative, practical project ideas in the domain of "${topic}". 

For each idea, return **exactly** in this format:

---
Project Title: <Concise, engaging title>
Summary: <One-sentence overview>
Problem Being Solved: <What real issue it addresses>
Proposed Solution: <How the idea solves it>
Resources Required: <Key materials or expertise>
Basic Items Needed & Approximate Cost (₹):
- Item 1 (e.g., popsicle sticks): ₹X (use inexpensive, commonly available items, under ₹300 each)
- Item 2 (e.g., sensors or simple microcontroller): ₹Y
- Item 3 (e.g., paint, markers): ₹Z
(Try to keep total cost around ₹1,500 or less for the entire project.)
Timeline: <High-level phases and durations>
Cost Involved: ₹<total cost> (sum of items above)
Recommended Competition: <Suggest one contest/category from your dataset where this could be entered>
Step-by-Step Execution:
1. ...
2. ...
…
How to Measure Success: <Metrics or outcomes>
Final Tips for Completion: <Any final advice>
---
`.trim();
}

// ─── Core generator ─────────────────────────────────────────────────────────
export async function generateProjectIdeas(_, topic, __) {
    // 1) retrieve relevant projects
    const relevant = getRelevantProjects(topic);

    // 2) choose which prompt to use
    let prompt;
    if (relevant.length > 0) {
        const ctxLines = relevant.map((p, i) => 
            `${i+1}. ${p.title} — ${p.description} (Category: ${p.category})`
        );
        const context = ctxLines.join('\n');
        prompt = makeDetailedPrompt(context, topic);
    } else {
        prompt = makeFallbackPrompt(topic);
    }

    // 3) call the OpenAI API
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {"role": "system", "content": "You are a creative project coach."},
                {"role": "user", "content": prompt}
            ],
            temperature: 0.7,
            max_tokens: 900
        });
        
        const raw = response.choices[0].message.content.trim();
        // Format as HTML for frontend display
        const html = '<pre style="white-space: pre-wrap; font-size: 1rem;">' + 
                    raw.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
        return [html];
    } catch (error) {
        console.error('OpenAI API error:', error);
        return ['Sorry, I encountered an error generating project ideas. Please try again.'];
    }
}

// ─── Execution plan ─────────────────────────────────────────────────────────
export async function generateExecutionPlan(topic) {
    const prompt = `
You're a project mentor for high school students.
Provide a detailed, step-by-step execution plan for the project:
"${topic}"

Return the plan as a numbered list of steps, followed by:
- Estimated timeline
- Key materials needed
- Final tips for success
`.trim();

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {"role": "system", "content": "You are a detailed project planner."},
                {"role": "user", "content": prompt}
            ],
            temperature: 0.7,
            max_tokens: 500
        });
        
        const rawPlan = response.choices[0].message.content.trim();
        return '<pre style="white-space: pre-wrap; font-size: 1rem;">' + 
               rawPlan.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
    } catch (error) {
        console.error('OpenAI API error:', error);
        return 'Sorry, I encountered an error generating the execution plan. Please try again.';
    }
} 