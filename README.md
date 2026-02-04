# 🧠 Mini RAG: AI Engineer Assessment

**Candidate:** Sahil  
**Resume:** [INSERT LINK TO YOUR RESUME PDF HERE]

## 🚀 Live Demo
* **Live App:** [INSERT YOUR RENDER URL HERE] (e.g., https://mini-rag-app.onrender.com)
* **Repository:** [INSERT YOUR GITHUB REPO LINK HERE]

---

## 📖 Project Overview
This is a production-minded RAG (Retrieval-Augmented Generation) system built to answer questions based on uploaded documents (PDF, DOCX, TXT) or raw text. It features a full **Ingestion Pipeline** and a **Retrieval Pipeline** with semantic reranking to ensure high precision.

### Key Features
* **Hybrid Ingestion:** Supports both file uploads (parsed via `pypdf`/`python-docx`) and raw text paste.
* **Advanced Retrieval:** Uses **Cohere Rerank** to filter vector search results, solving the "lost in the middle" problem.
* **Citations:** Generates grounded answers with inline citations (e.g., `[1]`) linking back to the source text.
* **Modern UI:** Chat-interface with split-pane design for knowledge management.

---

## 🏗️ Architecture

### System Flow
```mermaid
graph TD
    A[User Input] -->|PDF/Text| B(Preprocessing)
    B -->|Chunking| C{Text Splitter}
    C -->|200 words / 20 overlap| D[Chunks]
    D -->|Gemini Embedding| E[(Pinecone Vector DB)]
    
    F[User Query] -->|Gemini Embedding| G[Vector Search]
    G -->|Top 10 Matches| E
    E -->|Raw Results| H[Cohere Reranker]
    H -->|Top 3 Relevant| I[LLM Context Window]
    I -->|Gemini 2.5 Flash| J[Final Answer w/ Citations]s