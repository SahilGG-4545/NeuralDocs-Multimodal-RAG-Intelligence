<div align="center">

# 🧠 NeuralDocs — Multimodal RAG Intelligence

**Enterprise-grade document intelligence powered by CLIP vision embeddings and Llama 4**

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/Flask-3.0-green.svg)](https://flask.palletsprojects.com/)
[![OpenAI CLIP](https://img.shields.io/badge/OpenAI-CLIP-orange.svg)](https://github.com/openai/CLIP)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Features](#-features) • [Architecture](#-architecture) • [Installation](#-installation) • [Usage](#-usage) • [API](#-api-reference)

</div>

---

## 📖 Overview

**NeuralDocs** is a production-ready **multimodal Retrieval-Augmented Generation (RAG)** system that understands both text and images within PDF documents. Built with state-of-the-art AI models, it enables natural language querying across complex documents containing charts, diagrams, and mixed content.

<table>
<tr>
<td><img src="https://github.com/user-attachments/assets/58e690c7-c59f-4425-b5c7-54ef35bd733d" width="400"/></td>
<td><img src="https://github.com/user-attachments/assets/da195258-320b-444e-a6e3-f7a878d2fc85" width="400"/></td>
</tr>

<tr>
<td><img src="https://github.com/user-attachments/assets/8bd1e062-3f7d-4340-84c6-01bcc08bca6a" width="400"/></td>
<td><img src="https://github.com/user-attachments/assets/a3efb31d-dd84-4682-9cbc-cb6a1e61afcc" width="400"/></td>
</tr>
</table>



### 🎯 Key Highlights

- **🔍 Multimodal Understanding** — Unified semantic search across text and images using OpenAI CLIP embeddings
- **⚡ Two-Stage Retrieval** — FAISS vector similarity + cosine reranking for precision
- **🦙 Llama 4 Scout** — Meta's 17B-16E Mixture-of-Experts model via Groq for blazing-fast inference
- **🎨 Professional UI** — Modern web interface with animations, real-time progress, and dark/light themes
- **📊 Full Observability** — Per-request latency telemetry (embedding, retrieval, LLM times)
- **🚀 Production-Ready** — Type-safe, modular architecture with graceful error handling

---

## ✨ Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **PDF Processing** | Extracts text chunks and embedded images with metadata preservation |
| **CLIP Embeddings** | 512-dimensional vectors for unified text-image semantic space |
| **Smart Classification** | Auto-detects visual vs. textual queries for optimized retrieval |
| **Vector Store** | FAISS-backed ANN search with incremental indexing |
| **Contextual Answers** | Multi-source evidence synthesis with source citations |
| **Real-Time Upload** | Drag-and-drop PDF ingestion with live progress tracking |

### User Experience

- **Interactive Query Interface** — Pre-built example queries, Enter-to-send, copy response
- **Animated Canvas** — Particle network visualization with floating orbs
- **Glassmorphic Design** — Card-based layout with hover effects and smooth transitions
- **Responsive Layout** — Mobile-optimized breakpoints for all screen sizes
- **Toast Notifications** — Non-intrusive status updates for uploads and errors
- **Health Monitoring** — Live system status pill with auto-refresh

---

## 🏗️ Architecture

```
┌─────────────────┐
│   PDF Upload    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  PyMuPDF Parser │─────▶│  Text Chunking   │
│  (Text+Images)  │      │  (Recursive 500) │
└─────────────────┘      └────────┬─────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  CLIP Embedder  │
                         │  (ViT-B/32)     │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  FAISS Index    │
                         │  (L2 + Cosine)  │
                         └────────┬────────┘
                                  │
         ┌────────────────────────┴─────────────────┐
         │                                          │
         ▼                                          ▼
┌─────────────────┐                      ┌─────────────────┐
│  Query Encoder  │                      │  Reranker       │
│  (CLIP Text)    │                      │  (Cosine Sim)   │
└────────┬────────┘                      └────────┬────────┘
         │                                        │
         └───────────────┬────────────────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Context Builder│
                │  (Text+Images)  │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   Llama 4 MoE   │
                │   (via Groq)    │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   AI Response   │
                │  + Sources      │
                └─────────────────┘
```

### Tech Stack

**Backend**
- **Flask** — Lightweight WSGI web framework
- **PyMuPDF (fitz)** — PDF parsing and image extraction
- **Transformers** — HuggingFace model loading
- **LangChain** — LLM orchestration and document processing
- **FAISS** — Facebook AI Similarity Search
- **scikit-learn** — Cosine similarity reranking

**AI Models**
- **OpenAI CLIP** — `ViT-B/32` for multimodal embeddings
- **Llama 4 Scout** — `17B-16E` Mixture-of-Experts via Groq

**Frontend**
- **Vanilla JS** — Canvas animations, fetch API, DOM manipulation
- **CSS3** — Keyframe animations, glassmorphism, responsive grid
- **Google Fonts** — Inter (UI), JetBrains Mono (code)

---

## 🚀 Installation

### Prerequisites

- Python 3.11+
- Groq API Key ([get one free](https://console.groq.com))
- 4GB+ RAM (for CLIP model)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/SahilGG-4545/NeuralDocs-Multimodal-RAG-Intelligence.git
cd NeuralDocs-Multimodal-RAG-Intelligence

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
echo "GROQ_API_KEY=your_key_here" > .env

# Run the server
python main.py
```

**Server starts at:** `http://localhost:5000`

---

## 📖 Usage

### 1️⃣ Upload Documents

Navigate to the **Upload** section and drag-and-drop PDF files. The system will:
- Extract text chunks with 500-character windows (100 overlap)
- Extract all embedded images
- Generate CLIP embeddings for both modalities
- Index into FAISS vector store

### 2️⃣ Query Documents

Type natural language questions in the **Query** section:

**Example Queries:**
- *"What does the revenue chart show?"* (visual query)
- *"Summarize the key findings"* (text query)
- *"Describe the trends in Q3 data"* (mixed query)

Press **Enter** or click **Send** to execute.

### 3️⃣ Review Results

The response includes:
- **AI-generated answer** with markdown formatting
- **Query type** classification (visual/text)
- **Source citations** (document + page number)
- **Latency breakdown** (embedding, retrieval, LLM times)

---

## 📁 Project Structure

```
NeuralDocs/
├── main.py                 # Flask application + RAG pipeline
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (create this)
├── data/                   # PDF storage directory
│   └── *.pdf
├── static/
│   ├── css/
│   │   └── style.css      # Complete styling + animations
│   └── js/
│       └── main.js        # Canvas, upload, query logic
├── templates/
│   └── index.html         # Clean HTML structure
└── notebooks/
    └── multimodalopenai.ipynb  # Exploration notebook
```


## 🛠️ Configuration

Edit these variables in `main.py`:

```python
# Text chunking
chunk_size = 500
chunk_overlap = 100

# Retrieval counts
k_visual = 4  # Visual queries
k_text = 4    # Text queries

# CLIP model
clip_model = "openai/clip-vit-base-patch32"

# LLM
llm_model = "groq:meta-llama/llama-4-scout-17b-16e-instruct"
```


## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [OpenAI CLIP](https://github.com/openai/CLIP) — Multimodal embeddings
- [Meta Llama](https://ai.meta.com/llama/) — Language model
- [Groq](https://groq.com/) — Ultra-fast LLM inference
- [LangChain](https://langchain.com/) — LLM orchestration framework
- [FAISS](https://github.com/facebookresearch/faiss) — Facebook Research vector search

---

<div align="center">

**Built with ❤️ for intelligent document understanding**

[⭐ Star this repo](https://github.com/SahilGG-4545/NeuralDocs-Multimodal-RAG-Intelligence) 

