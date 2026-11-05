"""Concurrent development runner for JanSuno (FastAPI backend + Vite frontend)."""
import subprocess
import sys
import os
import time

# Ensure UTF-8 output on Windows terminals
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

def run_servers():
    print("=" * 60)
    print("  Starting JanSuno Civic Platform (FastAPI + Vite)")
    print("=" * 60)

    # 1. Start Backend
    print("Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    py_exec = sys.executable
    venv_py_unix = os.path.join(ROOT_DIR, ".venv", "bin", "python")
    venv_py_win = os.path.join(ROOT_DIR, ".venv", "Scripts", "python.exe")
    if os.path.exists(venv_py_unix):
        py_exec = venv_py_unix
    elif os.path.exists(venv_py_win):
        py_exec = venv_py_win

    backend_proc = subprocess.Popen(
        [py_exec, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=BACKEND_DIR,
        shell=(os.name == "nt")
    )

    # 2. Start Frontend
    print("Starting Vite Frontend on http://localhost:5173 ...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "--host"],
        cwd=FRONTEND_DIR,
        shell=(os.name == "nt")
    )

    print("\nJanSuno is running!")
    print("-> Citizen Portal:   http://localhost:5173")
    print("-> Officer Portal:   http://localhost:5173 (Click 'Officer Dashboard' or shared password: pune_admin_2026)")
    print("-> Backend API Docs: http://localhost:8000/docs\n")
    print("Press Ctrl+C to stop both servers.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping JanSuno servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        backend_proc.wait()
        frontend_proc.wait()
        print("Servers stopped cleanly.")

if __name__ == "__main__":
    run_servers()
