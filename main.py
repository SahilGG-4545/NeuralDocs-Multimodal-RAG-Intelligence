import fitz  # PyMuPDF
from flask import Flask, request, jsonify, render_template
from langchain_core.documents import Document
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import torch
import numpy as np
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage
from sklearn.metrics.pairwise import cosine_similarity
import os
import base64
import io
import time
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from dotenv import load_dotenv

load_dotenv()

os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")

app = Flask(__name__)

# ── CLIP model init ──────────────────────────────────────────────────────────
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
clip_model.eval()

# ── Global stores ────────────────────────────────────────────────────────────
all_docs = []
all_embeddings = []
image_data_store = {}
vector_store = None

splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)

data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(data_dir, exist_ok=True)

# ── Embedding helpers ────────────────────────────────────────────────────────

def embed_image(image_data):
    """Embed an image using CLIP."""
    if isinstance(image_data, str):
        image = Image.open(image_data).convert("RGB")
    else:
        image = image_data
    inputs = clip_processor(images=image, return_tensors="pt")
    with torch.no_grad():
        features = clip_model.get_image_features(**inputs)
        if hasattr(features, 'pooler_output'):
            features = features.pooler_output
        features = torch.nn.functional.normalize(features, p=2, dim=-1)
        return features.squeeze().cpu().numpy()


def embed_text(text):
    """Embed text using CLIP."""
    inputs = clip_processor(
        text=text,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=77)
    with torch.no_grad():
        features = clip_model.get_text_features(**inputs)
        if hasattr(features, 'pooler_output'):
            features = features.pooler_output
        features = torch.nn.functional.normalize(features, p=2, dim=-1)
    return features.squeeze().cpu().numpy()


# ── PDF processing ───────────────────────────────────────────────────────────

def process_pdf(pdf_path):
    """Process a single PDF and append its docs/embeddings to global stores."""
    pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
    print(f"Processing: {pdf_name}")
    doc = fitz.open(pdf_path)

    for i, page in enumerate(doc):
        text = page.get_text()
        if text.strip():
            temp_doc = Document(
                page_content=text,
                metadata={"page": i, "type": "text", "source": pdf_name}
            )
            for chunk in splitter.split_documents([temp_doc]):
                all_embeddings.append(embed_text(chunk.page_content))
                all_docs.append(chunk)

        for img_index, img in enumerate(page.get_images(full=True)):
            try:
                xref = img[0]
                base_image = doc.extract_image(xref)
                pil_image = Image.open(io.BytesIO(base_image["image"])).convert("RGB")
                image_id = f"{pdf_name}_page_{i}_img_{img_index}"

                buffered = io.BytesIO()
                pil_image.save(buffered, format="PNG")
                image_data_store[image_id] = base64.b64encode(buffered.getvalue()).decode()

                all_embeddings.append(embed_image(pil_image))
                all_docs.append(Document(
                    page_content=f"[Image: {image_id}]",
                    metadata={"page": i, "type": "image", "image_id": image_id, "source": pdf_name}
                ))
            except Exception as e:
                print(f"Error processing image {img_index} on page {i} in {pdf_name}: {e}")

    doc.close()
    print(f"  → {pdf_name}: done")


def build_vector_store():
    """Rebuild FAISS vector store from all current docs and embeddings."""
    global vector_store
    if not all_embeddings:
        return
    embeddings_array = np.array(all_embeddings)
    vector_store = FAISS.from_embeddings(
        text_embeddings=[(doc.page_content, emb) for doc, emb in zip(all_docs, embeddings_array)],
        embedding=None,
        metadatas=[doc.metadata for doc in all_docs]
    )


# ── Load PDFs at startup ─────────────────────────────────────────────────────
pdf_files = [f for f in os.listdir(data_dir) if f.lower().endswith(".pdf")]
if pdf_files:
    for pdf_file in pdf_files:
        process_pdf(os.path.join(data_dir, pdf_file))
    build_vector_store()
else:
    print(f"No PDFs found in {data_dir}. Use POST /upload to add documents.")

# ── LLM init ─────────────────────────────────────────────────────────────────
llm = init_chat_model("groq:meta-llama/llama-4-scout-17b-16e-instruct")

# ── Retrieval & pipeline ──────────────────────────────────────────────────────

VISUAL_KEYWORDS = {"chart", "graph", "image", "figure", "plot", "diagram", "picture", "photo", "visual", "illustration"}


def classify_query(query):
    if any(kw in query.lower() for kw in VISUAL_KEYWORDS):
        return "visual"
    return "text"


def retrieve_multimodal(query, k=5):
    """Two-stage retrieval with reranking."""
    query_embedding = embed_text(query)
    results = vector_store.similarity_search_by_vector(embedding=query_embedding, k=k * 2)
    scored = []
    for doc in results:
        emb = embed_text(doc.page_content)
        score = cosine_similarity([query_embedding], [emb])[0][0]
        scored.append((doc, score))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [doc for doc, _ in scored[:k]]


def create_multimodal_message(query, retrieved_docs):
    content = [{
        "type": "text",
        "text": f"Question: {query}\n\nContext:\n"
    }]
    text_docs = [d for d in retrieved_docs if d.metadata.get("type") == "text"]
    image_docs = [d for d in retrieved_docs if d.metadata.get("type") == "image"]

    if text_docs:
        text_context = "\n\n".join([
            f"[{d.metadata.get('source', 'Unknown')} - Page {d.metadata['page']}]: {d.page_content}"
            for d in text_docs
        ])
        content.append({"type": "text", "text": f"Text excerpts:\n{text_context}\n"})

    for doc in image_docs:
        image_id = doc.metadata.get("image_id")
        if image_id and image_id in image_data_store:
            source = doc.metadata.get('source', 'Unknown')
            content.append({"type": "text", "text": f"\n[Image from {source} - Page {doc.metadata['page']}]:\n"})
            content.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_data_store[image_id]}"}})

    content.append({"type": "text", "text": "\n\nPlease answer the question based on the provided text and images."})
    return HumanMessage(content=content)


def run_pipeline(query):
    """Run the full RAG pipeline and return a structured result dict."""
    query_type = classify_query(query)
    k = 7 if query_type == "visual" else 4

    t0 = time.time()
    embed_text(query)  # warm embedding
    embedding_time = time.time() - t0

    t1 = time.time()
    context_docs = retrieve_multimodal(query, k=k)
    retrieval_time = time.time() - t1

    message = create_multimodal_message(query, context_docs)

    t2 = time.time()
    response = llm.invoke([message])
    llm_time = time.time() - t2

    sources = [
        {
            "source": doc.metadata.get("source", "Unknown"),
            "page": doc.metadata.get("page"),
            "type": doc.metadata.get("type")
        }
        for doc in context_docs
    ]

    return {
        "answer": response.content,
        "query_type": query_type,
        "sources": sources,
        "latency": {
            "embedding_s": round(embedding_time, 3),
            "retrieval_s": round(retrieval_time, 3),
            "llm_s": round(llm_time, 3),
            "total_s": round(embedding_time + retrieval_time + llm_time, 3)
        }
    }


# ── Flask routes ──────────────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/favicon.ico")
def favicon():
    return "", 204


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "documents_loaded": len(all_docs),
        "vector_store_ready": vector_store is not None
    })


@app.route("/query", methods=["POST"])
def query_endpoint():
    data = request.get_json()
    if not data or "query" not in data:
        return jsonify({"error": "Missing 'query' field in JSON body"}), 400
    if vector_store is None:
        return jsonify({"error": "No documents loaded. Use POST /upload to add PDFs."}), 503
    result = run_pipeline(data["query"])
    return jsonify(result)


@app.route("/upload", methods=["POST"])
def upload_pdf():
    if "file" not in request.files:
        return jsonify({"error": "No file provided. Send a PDF as multipart/form-data with key 'file'."}), 400
    file = request.files["file"]
    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are accepted."}), 400
    save_path = os.path.join(data_dir, file.filename)
    file.save(save_path)
    process_pdf(save_path)
    build_vector_store()
    return jsonify({
        "message": f"{file.filename} uploaded and processed successfully.",
        "total_documents": len(all_docs)
    }), 201


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)

