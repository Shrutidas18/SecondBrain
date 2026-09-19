"""
rag.py — Retrieval Augmented Generation pipeline
Handles: embedding documents, storing in ChromaDB, retrieving relevant chunks
"""

import os
from concurrent.futures import ThreadPoolExecutor
import chromadb
from chromadb.config import Settings
import ollama
from dotenv import load_dotenv

load_dotenv()

CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
COLLECTION_NAME = "second_brain"
EMBED_MAX_WORKERS = int(os.getenv("EMBED_MAX_WORKERS", "4"))

# ── Singleton Chroma client/collection ───────────────────────────────────────
# Opening a PersistentClient re-reads the on-disk store, so we do it once and
# reuse it across requests instead of reconnecting on every call.
_client = None
_collection = None

# Ollama's Python client embeds one prompt per call. A small thread pool lets
# us fire several embedding calls concurrently instead of one-by-one.
_embed_pool = ThreadPoolExecutor(max_workers=EMBED_MAX_WORKERS)


def get_chroma_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=CHROMA_DB_PATH,
            settings=Settings(anonymized_telemetry=False)
        )
    return _client


def get_collection():
    global _collection
    if _collection is None:
        client = get_chroma_client()
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )
    return _collection


def embed_text(text: str) -> list[float]:
    """Generate an embedding for a single piece of text using Ollama."""
    response = ollama.embeddings(model=EMBED_MODEL, prompt=text)
    return response["embedding"]


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for many texts, in parallel, preserving input order.
    Used instead of a plain list comprehension so a document with many
    chunks doesn't wait on N sequential round-trips to Ollama.
    """
    return list(_embed_pool.map(embed_text, texts))


def add_chunks_to_db(chunks: list[dict]):
    """
    Add document chunks to ChromaDB.
    Each chunk: { "id": str, "text": str, "metadata": dict }
    """
    collection = get_collection()

    ids = [c["id"] for c in chunks]
    texts = [c["text"] for c in chunks]
    metadatas = [c["metadata"] for c in chunks]
    embeddings = embed_texts(texts)

    collection.upsert(
        ids=ids,
        documents=texts,
        metadatas=metadatas,
        embeddings=embeddings
    )
    return len(chunks)


def retrieve_relevant_chunks(query: str, n_results: int = 5) -> list[dict]:
    """Find the most relevant chunks for a given query."""
    collection = get_collection()
    query_embedding = embed_text(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"]
    )

    chunks = []
    for i, doc in enumerate(results["documents"][0]):
        chunks.append({
            "text": doc,
            "metadata": results["metadatas"][0][i],
            "score": 1 - results["distances"][0][i]  # convert distance to similarity
        })

    return chunks


def delete_document(filename: str):
    """Remove all chunks for a specific document."""
    collection = get_collection()
    results = collection.get(where={"source": filename})
    if results["ids"]:
        collection.delete(ids=results["ids"])
    return len(results["ids"])


def list_documents() -> list[dict]:
    """List all unique documents in the database."""
    collection = get_collection()
    results = collection.get(include=["metadatas"])

    seen = {}
    for meta in results["metadatas"]:
        src = meta.get("source", "unknown")
        if src not in seen:
            seen[src] = {"source": src, "type": meta.get("type", "unknown")}

    return list(seen.values())


def get_stats() -> dict:
    """Get database statistics."""
    collection = get_collection()
    count = collection.count()
    docs = list_documents()
    return {
        "total_chunks": count,
        "total_documents": len(docs),
        "documents": docs
    }