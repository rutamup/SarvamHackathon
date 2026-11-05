#!/bin/bash
echo "========================================================"
echo "  Starting JanSuno Civic Platform (FastAPI + Vite)"
echo "========================================================"
if [ -f ".venv/bin/python" ]; then
    .venv/bin/python run.py
else
    python3 run.py || python run.py
fi

