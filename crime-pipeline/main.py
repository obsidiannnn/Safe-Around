"""
SafeAround Crime Pipeline - Main Entry Point
============================================
This is the FastAPI server entry point used by Dockerfile and systemd.
The actual pipeline logic is in crime_pipeline.py.

Run options:
  python main.py                   (standalone, no API)
  uvicorn main:app --port 8001     (FastAPI mode)
"""
from crime_pipeline import app  # noqa: F401 — re-export for uvicorn

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
