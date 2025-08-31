# api/vectorizer.py

import csv, os, re

# ── CONFIG ───────────────────────────────────────────────────────────────────
CSV_PATH = os.path.join(os.path.dirname(__file__), 'projects_db.csv')
TOP_K    = 5
# ──────────────────────────────────────────────────────────────────────────────

def auto_detect_columns(headers):
    title_col    = next((h for h in headers if 'title' in h.lower()), None)
    desc_col     = next((h for h in headers if 'desc' in h.lower() or 'summary' in h.lower()), None)
    category_col = next((h for h in headers if 'category' in h.lower()), None)
    if not title_col or not desc_col:
        raise Exception(f"Could not find title/description columns in CSV headers: {headers}")
    return title_col, desc_col, category_col

def load_projects():
    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader  = csv.DictReader(f)
        headers = reader.fieldnames or []
        title_col, desc_col, cat_col = auto_detect_columns(headers)

        projects = []
        for row in reader:
            projects.append({
                'title':       row.get(title_col, '').strip(),
                'description': row.get(desc_col,   '').strip(),
                'category':    row.get(cat_col,    'General').strip() if cat_col else 'General'
            })
    return projects

def tokenize(text):
    # lowercase alphanumeric words
    return re.findall(r'\w+', text.lower())

# ── Cold‐start: load & preprocess once ─────────────────────────────────────────
_projects       = load_projects()
_project_tokens = [
    ( tokenize(p['title'] + ' ' + p['description']), p )
    for p in _projects
]
# ──────────────────────────────────────────────────────────────────────────────

def get_similar_projects(query: str, top_k: int = TOP_K):
    """
    Score each project by how many words from the query appear in its
    title+description, then return the top_k best matches.
    """
    q_tokens = tokenize(query)
    scored   = []
    for tokens, project in _project_tokens:
        score = sum(1 for qt in q_tokens if qt in tokens)
        scored.append((score, project))

    # sort high→low
    scored.sort(key=lambda x: x[0], reverse=True)

    # take those with nonzero overlap first...
    results = [proj for score, proj in scored if score > 0][:top_k]
    # ...then pad with next-best if we don’t have enough
    if len(results) < top_k:
        results += [proj for _, proj in scored if proj not in results][: top_k - len(results)]
    return results
