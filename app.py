import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pinecone import Pinecone, ServerlessSpec
import cohere
import pypdf
import docx
from werkzeug.utils import secure_filename

load_dotenv()

app = Flask(__name__)
CORS(app)

# --- Config & Clients ---
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
PINECONE_KEY = os.getenv("PINECONE_API_KEY")
COHERE_KEY = os.getenv("COHERE_API_KEY")

client = genai.Client(api_key=GEMINI_KEY)
pc = Pinecone(api_key=PINECONE_KEY)
co = cohere.Client(COHERE_KEY)

# --- Pinecone Setup ---
INDEX_NAME = "mini-rag-index"
if INDEX_NAME not in [idx.name for idx in pc.list_indexes()]:
    pc.create_index(
        name=INDEX_NAME, 
        dimension=768, 
        metric='cosine', 
        spec=ServerlessSpec(cloud='aws', region='us-east-1')
    )
index = pc.Index(INDEX_NAME)

# --- Helpers ---
def get_embedding(text, is_query=False):
    task = "RETRIEVAL_QUERY" if is_query else "RETRIEVAL_DOCUMENT"
    res = client.models.embed_content(
        model="text-embedding-004",
        contents=text,
        config=types.EmbedContentConfig(task_type=task)
    )
    return res.embeddings[0].values

def extract_text_from_file(file):
    filename = secure_filename(file.filename)
    if filename.endswith('.pdf'):
        reader = pypdf.PdfReader(file)
        return "\n".join([page.extract_text() for page in reader.pages])
    elif filename.endswith('.docx'):
        doc = docx.Document(file)
        return "\n".join([para.text for para in doc.paragraphs])
    elif filename.endswith('.txt'):
        return file.read().decode('utf-8')
    return ""

# --- Routes ---
@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/upload', methods=['POST'])
def upload_data():
    content = ""
    source_name = "Manual Input"

    # Handle File Upload
    if 'file' in request.files:
        file = request.files['file']
        if file.filename != '':
            content = extract_text_from_file(file)
            source_name = secure_filename(file.filename)
    
    # Handle Text Input (Fallback)
    if not content:
        data = request.form.get('text')
        if data:
            content = data
    
    if not content:
        return jsonify({"error": "No content provided"}), 400

    # Chunking Strategy (Requirement: 800-1000 tokens roughly, here using words)
    # Using 200 words ~ 250-300 tokens for better granularity with Gemini
    words = content.split()
    chunk_size = 200
    overlap = 20
    chunks = [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size - overlap)]
    
    vectors = []
    for i, chunk in enumerate(chunks):
        vectors.append({
            "id": f"{source_name}_{i}",
            "values": get_embedding(chunk),
            "metadata": {"text": chunk, "source": source_name}
        })
    
    index.upsert(vectors=vectors)
    return jsonify({"status": "success", "chunks": len(chunks), "source": source_name})

@app.route('/query', methods=['POST'])
def query():
    user_query = request.json.get('query')
    if not user_query: return jsonify({"error": "No query"}), 400

    # 1. Retrieve
    query_vec = get_embedding(user_query, is_query=True)
    results = index.query(vector=query_vec, top_k=10, include_metadata=True)
    retrieved_texts = [m['metadata']['text'] for m in results['matches']]
    
    if not retrieved_texts:
        return jsonify({"answer": "I don't have enough context.", "sources": []})

    # 2. Rerank
    reranked = co.rerank(query=user_query, documents=retrieved_texts, top_n=3, model="rerank-english-v3.0")
    top_chunks = [retrieved_texts[res.index] for res in reranked.results]
    
    # 3. Answer
    context = "\n".join([f"[{i+1}] {t}" for i, t in enumerate(top_chunks)])
    prompt = f"Answer based ONLY on context. Cite [1], [2].\nContext:\n{context}\n\nQuestion: {user_query}"
    
    # Use standard production model for 2026
    response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    
    return jsonify({"answer": response.text, "sources": top_chunks})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)