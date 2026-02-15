import hashlib
import io
import warnings
from typing import Dict, Any

warnings.filterwarnings(
    "ignore",
    category=DeprecationWarning,
    module=r"^PyPDF2(\.|$)",
)

import PyPDF2

def extract_text_from_pdf(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Extract text from PDF bytes using PyPDF2.
    Returns text, page count, and sha256 hash.
    """
    sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()
    
    text = ""
    page_count = 0
    
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PyPDF2.PdfReader(pdf_file)
        page_count = len(reader.pages)
        
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
                
    except Exception as e:
        # Graceful failure - returns empty text but preserves hash
        text = f"Error during PDF extraction: {str(e)}"
    
    return {
        "text": text.strip(),
        "page_count": page_count,
        "sha256": sha256_hash
    }
