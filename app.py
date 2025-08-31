import os
from dotenv import load_dotenv
load_dotenv()
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import NotFound
from generator import generate_project_ideas, generate_execution_plan
from vectorizer import get_similar_projects
from query_parser import extract_topic_from_input

app = Flask(__name__, static_folder=None)
CORS(app)

# Point this at your project root/static directory
BASE_DIR   = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STATIC_DIR = os.path.join(BASE_DIR, 'static')

# ── Core API ────────────────────────────────────────────────────────────────
@app.route('/generate', methods=['POST'])
def generate():
    data      = request.get_json(force=True)
    raw_query = data.get('category', '').strip()
    try:
        count = int(data.get('count', 5))
    except (TypeError, ValueError):
        count = 5
    mode = data.get('mode', 'ideation').lower()

    # Clean the query if possible
    try:
        query = extract_topic_from_input(raw_query)
    except Exception:
        query = raw_query

    if mode == 'execution':
        plan = generate_execution_plan(query)
        return jsonify({'mode': 'execution', 'plan': plan})

    sims  = get_similar_projects(query, top_k=count)
    ideas = generate_project_ideas(sims)
    return jsonify({'mode': 'ideation', 'ideas': ideas})

@app.route('/chatbot', methods=['POST'])
def chatbot():
    print('--- /chatbot endpoint called ---')
    print('Request JSON:', request.json)
    user_message = request.json.get('message', '').strip()
    print('User message:', user_message)
    if not user_message:
        print('No message provided!')
        return jsonify({'error': 'No message provided'}), 400
    # Extract topic from user message
    try:
        query = extract_topic_from_input(user_message)
        print('Extracted query:', query)
    except Exception as e:
        print('Error extracting topic:', e)
        query = user_message
    # Find similar projects
    try:
        sims = get_similar_projects(query, top_k=5)
        print('Similar projects:', sims)
    except Exception as e:
        print('Error getting similar projects:', e)
        sims = []
    # Generate project ideas
    try:
        ideas = generate_project_ideas(None, query, None)
        print('Generated ideas:', ideas)
    except Exception as e:
        print('Error generating ideas:', e)
        ideas = ['Error generating ideas.']
    return jsonify({'response': ideas})

# ── Frontend & Static ───────────────────────────────────────────────────────
@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def serve_static(path):
    full_path = os.path.join(STATIC_DIR, path)
    if os.path.isfile(full_path):
        return send_from_directory(STATIC_DIR, path)
    # Fallback for missing files
    return "Not Found", 404


# ── Run Locally ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3001, debug=True)
