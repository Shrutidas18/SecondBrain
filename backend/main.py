"""
main.py — FastAPI backend
Routes: /upload, /chat, /documents, /documents/{name}, /stats
Supports: Ollama (local) and Groq (cloud) via USE_GROQ env var
"""

import os
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from ingest import process_file
from rag import add_chunks_to_db, retrieve_relevant_chunks, delete_document, list_documents, get_stats

load_dotenv()

app = FastAPI(title="Second Brain API", version="1.0.0")

# CORS — allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USE_GROQ = os.getenv("USE_GROQ", "false").lower() == "true"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")


# ── LLM Helpers ──────────────────────────────────────────────────────────────

def chat_with_ollama(messages: list[dict]) -> str:
    import ollama
    response = ollama.chat(model=OLLAMA_MODEL, messages=messages)
    return response["message"]["content"]


def chat_with_groq(messages: list[dict]) -> str:
    from groq import Groq
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        max_tokens=1024
    )
    return response.choices[0].message.content


def chat(messages: list[dict]) -> str:
    if USE_GROQ:
        return chat_with_groq(messages)
    return chat_with_ollama(messages)


def build_prompt(query: str, context_chunks: list[dict]) -> list[dict]:
    """Build the RAG prompt with retrieved context."""
    if not context_chunks:
        context = "No relevant documents found in your knowledge base."
    else:
        context = "\n\n---\n\n".join([
            f"[From: {c['metadata']['source']}]\n{c['text']}"
            for c in context_chunks
        ])

    system_prompt = """You are a personal AI assistant with access to the user's documents and notes.
Answer questions using ONLY the provided context below. If the answer isn't in the context, say so clearly.
Always mention which document your answer comes from.

CONTEXT:
""" + context

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": query}
    ]


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "mode": "groq" if USE_GROQ else "ollama"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and process a document into the knowledge base."""
    allowed = {"pdf", "txt", "md", "docx"}
    ext = file.filename.lower().split(".")[-1]

    if ext not in allowed:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(allowed)}")

    file_bytes = await file.read()

    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "File too large. Max size: 10MB")

    try:
        # Both steps do blocking I/O (parsing + calls to Ollama), so they're
        # offloaded to a worker thread instead of running on the event loop.
        chunks = await asyncio.to_thread(process_file, file.filename, file_bytes)
        count = await asyncio.to_thread(add_chunks_to_db, chunks)
        return {
            "message": f"✅ Successfully processed '{file.filename}'",
            "chunks_added": count,
            "filename": file.filename
        }
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Processing failed: {str(e)}")


class ChatRequest(BaseModel):
    query: str
    history: list[dict] = []   # [{ "role": "user"|"assistant", "content": str }]
    n_results: int = 5


@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    """Chat with your documents using RAG."""
    if not req.query.strip():
        raise HTTPException(400, "Query cannot be empty")

    # Retrieve relevant chunks (embedding + vector search — blocking I/O)
    chunks = await asyncio.to_thread(retrieve_relevant_chunks, req.query, req.n_results)

    # Build prompt with context
    messages = build_prompt(req.query, chunks)

    # Add conversation history (insert before the last user message)
    if req.history:
        # system + history + current user message
        messages = [messages[0]] + req.history + [messages[-1]]

    # Get LLM response (blocking network call to Ollama/Groq)
    try:
        answer = await asyncio.to_thread(chat, messages)
    except Exception as e:
        raise HTTPException(500, f"LLM error: {str(e)}")

    return {
        "answer": answer,
        "sources": [
            {"source": c["metadata"]["source"], "score": round(c["score"], 3)}
            for c in chunks
        ],
        "mode": "groq" if USE_GROQ else "ollama"
    }


@app.get("/documents")
def get_documents():
    """List all documents in the knowledge base."""
    return {"documents": list_documents()}


@app.delete("/documents/{filename}")
def delete_doc(filename: str):
    """Remove a document from the knowledge base."""
    count = delete_document(filename)
    if count == 0:
        raise HTTPException(404, f"Document '{filename}' not found")
    return {"message": f"Deleted '{filename}' ({count} chunks removed)"}


@app.get("/stats")
def stats():
    """Get knowledge base statistics."""
    return get_stats()