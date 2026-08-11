# 🧠 Local AI Second Brain

Chat with your own notes and PDFs. Runs 100% free using Ollama + ChromaDB + Groq.

---

## 🗂️ Project Structure

```
second-brain/
├── backend/          # FastAPI Python backend
│   ├── main.py       # API routes
│   ├── rag.py        # RAG pipeline (embeddings + retrieval)
│   ├── ingest.py     # Document processing
│   └── requirements.txt
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
│   └── package.json
└── README.md
```

---

## ⚙️ Requirements

### System Requirements
- Python 3.10+
- Node.js 18+
- 8GB RAM minimum (16GB recommended for larger models)
- ~5GB free disk space (for models)

### Tools to Install
1. **Ollama** — runs AI models locally
2. **Python packages** — FastAPI, ChromaDB, etc.
3. **Node packages** — React, Vite, etc.

---

## 🚀 Setup Guide (Step by Step)

### Step 1 — Install Ollama

**Mac:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from https://ollama.com/download

### Step 2 — Pull AI Models
```bash
# Start Ollama
ollama serve

# In a new terminal, pull the models (one-time download)
ollama pull llama3.2        # Main chat model (~2GB)
ollama pull nomic-embed-text # Embeddings model (~274MB)
```

### Step 3 — Backend Setup
```bash
cd backend
python -m venv venv

# Mac/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate

pip install -r requirements.txt
```

### Step 4 — Frontend Setup
```bash
cd frontend
npm install
```

---

## ▶️ Running the App

You need 3 terminals:

**Terminal 1 — Ollama:**
```bash
ollama serve
```

**Terminal 2 — Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 3 — Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

---

## 🌐 Sharing with Others (Cloudflare Tunnel)

To let friends use your app without deploying:

```bash
# Install cloudflared
brew install cloudflared   # Mac
# or download from https://github.com/cloudflare/cloudflared/releases

# Expose your backend
cloudflared tunnel --url http://localhost:8000
```

This gives you a public URL like `https://abc123.trycloudflare.com`.
Update `VITE_API_URL` in `frontend/.env` with that URL, then share your frontend URL.

---

## 🔄 Switching to Groq (for cloud hosting)

When you want to host properly with zero cost:
1. Sign up at https://console.groq.com (free)
2. Get your API key
3. Set `GROQ_API_KEY=your_key` in `backend/.env`
4. Set `USE_GROQ=true` in `backend/.env`
5. Deploy backend to Render.com (free tier)
6. Deploy frontend to Vercel (free tier)
