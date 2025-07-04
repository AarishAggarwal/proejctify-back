# api/generator.py

import os
import csv
import re
import openai

# ─── Configuration ─────────────────────────────────────────────────────────
CSV_PATH   = os.path.join(os.path.dirname(__file__), 'projects_db.csv')
IDEA_COUNT = 3    # how many new ideas to generate
RETRIEVE_N = 5    # how many past projects to show as context

# ─── Instantiate the new OpenAI client ─────────────────────────────────────
openai.api_key = os.getenv("OPENAI_API_KEY")

# ─── Load your CSV dataset ───────────────────────────────────────────────────
def load_all_projects() -> list[dict]:
    """Read projects_db.csv into a list of {'title','description','category'} dicts."""
    projects = []
    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader  = csv.DictReader(f)
        headers = reader.fieldnames or []
        title_col    = next((h for h in headers if 'title' in h.lower()), None)
        desc_col     = next((h for h in headers if 'desc' in h.lower() or 'summary' in h.lower()), None)
        category_col = next((h for h in headers if 'category' in h.lower()), None)
        if not title_col or not desc_col:
            raise RuntimeError(f"CSV missing title/description columns: {headers}")
        for row in reader:
            projects.append({
                'title':       row[title_col].strip(),
                'description': row[desc_col].strip(),
                'category':    row.get(category_col, 'General').strip() if category_col else 'General'
            })
    return projects

_ALL_PROJECTS = load_all_projects()

# ─── Simple keyword-based retrieval ──────────────────────────────────────────
def get_relevant_projects(topic: str) -> list[dict]:
    tokens = re.findall(r'\w+', topic.lower())
    matches = []
    for p in _ALL_PROJECTS:
        text = (p['title'] + ' ' + p['description']).lower()
        if any(tok in text for tok in tokens):
            matches.append(p)
            if len(matches) >= RETRIEVE_N:
                break
    return matches

# ─── Prompt builders ─────────────────────────────────────────────────────────
def make_detailed_prompt(context: str, topic: str) -> str:
    """
    Build a fully-structured multi-field prompt:
    - Lists example projects
    - Asks for structured ideas including realistic cost breakdown in ₹
    - Requests a competition recommendation from dataset categories
    """
    return f"""
You're a project mentor for high school students.

Here are some existing student projects for inspiration:
{context}

Using only those as inspiration, generate {IDEA_COUNT} brand-new, creative project ideas in the domain of "{topic}". 

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
""".strip()

def make_fallback_prompt(topic: str) -> str:
    """
    If no similar projects exist, skip the example list but use the same
    detailed structure with cost breakdown and competition recommendation.
    """
    return f"""
You're a project mentor for high school students.

Generate {IDEA_COUNT} innovative, practical project ideas in the domain of "{topic}". 

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
""".strip()

# ─── Core generator ─────────────────────────────────────────────────────────
def generate_project_ideas(_, topic: str, __) -> list[str]:
    # 1) retrieve relevant projects
    relevant = get_relevant_projects(topic)

    # 2) choose which prompt to use
    if relevant:
        ctx_lines = [
            f"{i+1}. {p['title']} — {p['description']} (Category: {p['category']})"
            for i, p in enumerate(relevant)
        ]
        context = "\n".join(ctx_lines)
        prompt  = make_detailed_prompt(context, topic)
    else:
        prompt  = make_fallback_prompt(topic)

    # 3) call the new v1 client interface
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a creative project coach."},
            {"role": "user",   "content": prompt}
        ],
        temperature=0.7,
        max_tokens=900
    )
    raw = response.choices[0].message.content.strip()
    # Format as HTML for frontend display
    html = '<pre style="white-space: pre-wrap; font-size: 1rem;">' + raw.replace('<', '&lt;').replace('>', '&gt;') + '</pre>'
    return [html]

# ─── Execution plan ─────────────────────────────────────────────────────────
def generate_execution_plan(topic: str) -> str:
    prompt = f"""
You're a project mentor for high school students.
Provide a detailed, step-by-step execution plan for the project:
\"{topic}\"

Return the plan as a numbered list of steps, followed by:
- Estimated timeline
- Key materials needed
- Final tips for success
""".strip()

    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a detailed project planner."},
            {"role": "user",   "content": prompt}
        ],
        temperature=0.7,
        max_tokens=500
    )
    raw_plan = response.choices[0].message.content.strip()
    return '<pre style="white-space: pre-wrap; font-size: 1rem;">' + raw_plan.replace('<', '&lt;').replace('>', '&gt;') + '</pre>'
