"""All backend tests use a disposable copy, never the user's local workspace DB."""
import os
import shutil
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
TEST_DB = BACKEND / "test-ui-integration.db"
shutil.copy2(BACKEND / "churnguardai.db", TEST_DB)
os.environ["DATABASE_URL"] = "sqlite:///" + TEST_DB.as_posix()
os.environ["ENABLE_LIVE_LLM"] = "false"
