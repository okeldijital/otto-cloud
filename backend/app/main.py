import sys
from pathlib import Path

# Ensure the backend root is in the python path for absolute imports
backend_root = Path(__file__).parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from main import app

# This allows Vercel to find the app object at backend/app/main.py
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
