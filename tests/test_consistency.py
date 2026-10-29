"""Compatibility entry point for the isolated backend regression suite."""
from pathlib import Path
import subprocess
import sys

if __name__ == "__main__":
    backend = Path(__file__).resolve().parents[1] / "backend"
    local_python = backend / ".venv" / "Scripts" / "python.exe"
    executable = str(local_python) if local_python.exists() else sys.executable
    raise SystemExit(subprocess.call([executable, "-m", "pytest", "tests", *sys.argv[1:]], cwd=backend))
