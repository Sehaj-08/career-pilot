import json
import os

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'questions.json')

def get_all_questions():
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return [
        {"id": 1, "title": "What are RESTful APIs and what are common HTTP methods?", "category": "Backend", "difficulty": "Easy"},
        {"id": 2, "title": "Explain React state vs props with examples.", "category": "Frontend", "difficulty": "Easy"},
        {"id": 3, "title": "How do database indexes improve query performance?", "category": "Database", "difficulty": "Medium"}
    ]
