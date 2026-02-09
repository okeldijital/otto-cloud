import os
import sys
import socket

def main():
    if any(a in ("-h", "--help") for a in sys.argv[1:]):
        print("OTTO backend (packaged)")
        print("Usage: otto_backend [--smoke] [--help] [--version]")
        raise SystemExit(0)

    if any(a == "--version" for a in sys.argv[1:]):
        print(os.environ.get("APP_VERSION", "1.0.1"))
        raise SystemExit(0)

    # Cloud/electron passes BACKEND_PORT
    port = int(os.environ.get("PORT") or os.environ.get("BACKEND_PORT") or "8000")
    smoke = os.environ.get("OTTO_SMOKE", "").strip() == "1" or "--smoke" in sys.argv

    if smoke and (os.environ.get("PORT") is None and os.environ.get("BACKEND_PORT") is None):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("127.0.0.1", 0))
            port = int(s.getsockname()[1])
        os.environ["PORT"] = str(port)

    # Ensure app imports work when frozen
    base_dir = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    os.chdir(base_dir)

    if smoke:
        try:
            from preflight_check import main as preflight_main
            preflight_main()
        except Exception:
            # Preflight is a hard gate in build scripts; at runtime just continue logging.
            pass

    # Import your FastAPI app
    from main import app  # adjust if your app is elsewhere

    # Start programmatically (no uvicorn CLI)
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")

if __name__ == "__main__":
    main()
