from html import escape
import os
import shutil
import time
from datetime import datetime, timedelta
import bleach
import requests
from flask import Flask, request, jsonify, render_template
from whoosh.index import create_in, open_dir
from whoosh.fields import Schema, TEXT, ID, BOOLEAN
from whoosh.qparser import QueryParser

app = Flask(__name__)

# Configure index directory and schema
BASE_INDEX_DIR = "discussion_indices"
CACHE_DURATION = timedelta(hours=24)

schema = Schema(
    discussion_id=ID(stored=True),
    title=TEXT(stored=True),
    content=TEXT(stored=True),
    author=TEXT(stored=True),
    is_pr=BOOLEAN(stored=True),
    is_open=BOOLEAN(stored=True)
)

def get_repo_index_dir(repo_name):
    # Convert repo name to safe directory name
    safe_name = repo_name.replace('/', '_')
    return os.path.join(BASE_INDEX_DIR, safe_name)

def get_repo_last_indexed_file(repo_name):
    return os.path.join(get_repo_index_dir(repo_name), 'last_indexed.txt')

def needs_reindex(repo_name):
    last_indexed_file = get_repo_last_indexed_file(repo_name)
    if not os.path.exists(last_indexed_file):
        return True
    
    with open(last_indexed_file, 'r') as f:
        last_indexed = datetime.fromtimestamp(float(f.read().strip()))
    
    return datetime.now() - last_indexed > CACHE_DURATION

def index_discussions(repo_name):
    index_dir = get_repo_index_dir(repo_name)
    
    # Clear and recreate index directory
    if os.path.exists(index_dir):
        shutil.rmtree(index_dir)
    os.makedirs(index_dir, exist_ok=True)
    
    # Create index
    ix = create_in(index_dir, schema)
    writer = ix.writer()
    
    # Fetch and index discussions
    discussions = requests.get(f'https://huggingface.co/api/{repo_name}/discussions').json()
    
    for discussion in discussions['discussions']:
        comments = requests.get(
            f'https://huggingface.co/api/{repo_name}/discussions/{discussion["num"]}'
        ).json()
        
        # Combine all comments into one content string
        content = []
        for comment in comments['events']:
            if comment['type'] == 'comment':
                content.append(f'{comment["author"]["name"]}: {comment["data"]["latest"]["raw"]}')
        writer.add_document(
            discussion_id=str(discussion["num"]),
            title=discussion["title"],
            content=f"Title: {discussion['title']}\n\n" + '\n'.join(content),
            author=discussion["author"]["name"],
            is_pr=discussion["isPullRequest"],
            is_open=discussion["status"] == "open"
        )
    
    writer.commit()
    
    # Update last indexed timestamp
    with open(get_repo_last_indexed_file(repo_name), 'w') as f:
        f.write(str(time.time()))

@app.route('/')
def index():
    repo_name = request.args.get('repo')
    query = request.args.get('query')
    if not repo_name:
        return render_template('no_repo.html')
    return render_template('index.html', repo_name=repo_name, query=query)

@app.route('/search', methods=['POST'])
def search():
    data = request.json
    query = data.get('query')
    repo_name = data.get('repo')
    if not repo_name:
        return jsonify({'error': 'No repository provided'}), 400
    
    if not query:
        return jsonify({'error': 'No query provided'}), 400
        
    # Check if we need to reindex
    if needs_reindex(repo_name):
        index_discussions(repo_name)
    
    # Search the index
    ix = open_dir(get_repo_index_dir(repo_name))
    with ix.searcher() as searcher:
        query_parser = QueryParser("content", ix.schema)
        q = query_parser.parse(query)
        results = searcher.search(q)
        
        # Format results
        formatted_results = [{
            'discussion_id': escape(result['discussion_id']),
            'title': escape(result['title']), 
            'author': escape(result['author']),
            'excerpt': bleach.clean(result.highlights("content"), tags=['b'], strip=True),
            'is_pr': result['is_pr'],
            'is_open': result['is_open']
        } for result in results]
        
        return jsonify({'results': formatted_results})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=7860)