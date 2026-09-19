"""
ingest.py — Document processing pipeline
Handles: PDF, TXT, DOCX parsing → text cleaning → smart chunking
"""

import uuid
import re
from pypdf import PdfReader
from docx import Document as DocxDocument
from langchain_text_splitters import RecursiveCharacterTextSplitter


CHUNK_SIZE = 500        # characters per chunk
CHUNK_OVERLAP = 50      # overlap between chunks to preserve context


def extract_text_from_pdf(file_bytes: bytes) -> str:
    import io
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        # extract_text() returns None for image-only/malformed pages instead
        # of "" — fall back to an empty string so this doesn't crash the upload.
        text += (page.extract_text() or "") + "\n"
    return text


def extract_text_from_docx(file_bytes: bytes) -> str:
    import io
    doc = DocxDocument(io.BytesIO(file_bytes))
    return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])


def extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore")


def extract_text(filename: str, file_bytes: bytes) -> str:
    """Route to correct extractor based on file extension."""
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext == "docx":
        return extract_text_from_docx(file_bytes)
    elif ext in ("txt", "md"):
        return extract_text_from_txt(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: .{ext}")


def clean_text(text: str) -> str:
    """Remove excessive whitespace and fix common PDF artifacts."""
    text = re.sub(r'\n{3,}', '\n\n', text)       # collapse 3+ newlines
    text = re.sub(r'[ \t]{2,}', ' ', text)         # collapse multiple spaces
    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)  # fix hyphenated line breaks
    return text.strip()


def chunk_text(text: str) -> list[str]:
    """Split text into overlapping chunks for better retrieval."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    return splitter.split_text(text)


def process_file(filename: str, file_bytes: bytes) -> list[dict]:
    """
    Full pipeline: file → extracted text → chunks → metadata-tagged records
    Returns list of chunk dicts ready for ChromaDB.
    """
    raw_text = extract_text(filename, file_bytes)
    cleaned = clean_text(raw_text)
    chunks = chunk_text(cleaned)

    ext = filename.lower().split(".")[-1]
    file_type = "pdf" if ext == "pdf" else "document" if ext == "docx" else "text"

    records = []
    for i, chunk in enumerate(chunks):
        records.append({
            "id": f"{filename}__chunk_{i}__{uuid.uuid4().hex[:8]}",
            "text": chunk,
            "metadata": {
                "source": filename,
                "type": file_type,
                "chunk_index": i,
                "total_chunks": len(chunks)
            }
        })

    return records