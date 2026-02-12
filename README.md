🚀 Live Demo
 https://mini-rag-assesment.onrender.com

📖 Project Overview
This is a production-minded RAG (Retrieval-Augmented Generation) system built to answer questions based on uploaded documents (PDF, DOCX, TXT) or raw text. It features a full Ingestion Pipeline and a Retrieval Pipeline with semantic reranking to ensure high precision.

### Key Features
1. Hybrid Ingestion: Supports both file uploads (parsed via `pypdf`/`python-docx`) and raw text paste.
2. Advanced Retrieval: Uses **Cohere Rerank** to filter vector search results, solving the "lost in the middle" problem.
3. Citations: Generates grounded answers with inline citations (e.g., `[1]`) linking back to the source text.
4. Modern UI: Chat-interface with split-pane design for knowledge management.
