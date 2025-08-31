// vectorizer.js - Converted from vectorizer.py

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── CONFIG ───────────────────────────────────────────────────────────────────
const CSV_PATH = path.join(__dirname, 'projects_db.csv');
const TOP_K = 5;
// ──────────────────────────────────────────────────────────────────────────────

function autoDetectColumns(headers) {
    const titleCol = headers.find(h => h.toLowerCase().includes('title')) || null;
    const descCol = headers.find(h => h.toLowerCase().includes('desc') || h.toLowerCase().includes('summary')) || null;
    const categoryCol = headers.find(h => h.toLowerCase().includes('category')) || null;
    
    if (!titleCol || !descCol) {
        throw new Error(`Could not find title/description columns in CSV headers: ${headers}`);
    }
    return [titleCol, descCol, categoryCol];
}

function loadProjects() {
    try {
        const csvData = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = csvData.split('\n');
        const headers = lines[0].split(',');
        const [titleCol, descCol, catCol] = autoDetectColumns(headers);

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
                    category: catCol ? row[catCol].trim() : 'General'
                });
            }
        }
        return projects;
    } catch (error) {
        console.error('Error loading projects:', error);
        return [];
    }
}

function tokenize(text) {
    // lowercase alphanumeric words
    return text.toLowerCase().match(/\w+/g) || [];
}

// ── Cold‐start: load & preprocess once ─────────────────────────────────────────
const PROJECTS = loadProjects();
const PROJECT_TOKENS = PROJECTS.map(p => [
    tokenize(p.title + ' ' + p.description), 
    p
]);
// ──────────────────────────────────────────────────────────────────────────────

export function getSimilarProjects(query, topK = TOP_K) {
    /**
     * Score each project by how many words from the query appear in its
     * title+description, then return the top_k best matches.
     */
    const qTokens = tokenize(query);
    const scored = [];
    
    for (const [tokens, project] of PROJECT_TOKENS) {
        const score = qTokens.filter(qt => tokens.includes(qt)).length;
        scored.push([score, project]);
    }

    // sort high→low
    scored.sort((a, b) => b[0] - a[0]);

    // take those with nonzero overlap first...
    let results = scored.filter(([score, _]) => score > 0).map(([_, proj]) => proj).slice(0, topK);
    
    // ...then pad with next-best if we don't have enough
    if (results.length < topK) {
        const remaining = scored.filter(([_, proj]) => !results.includes(proj)).map(([_, proj]) => proj);
        results = results.concat(remaining.slice(0, topK - results.length));
    }
    
    return results;
} 