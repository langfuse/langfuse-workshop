"""Environment loading: reads the repository-root .env, then an optional python/.env override."""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

PYTHON_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = PYTHON_ROOT.parent

# The repository-level .env is the shared workshop config at the repo root.
# An optional python/.env can override it for Python-only settings.
load_dotenv(REPO_ROOT / ".env", override=True)
load_dotenv(PYTHON_ROOT / ".env", override=True)

# Shared assets that both language tracks read.
DATA_DIR = REPO_ROOT / "data"
CLIENT_DIST = REPO_ROOT / "dist"


@dataclass(frozen=True)
class Env:
    port: int
    openai_api_key: str
    openai_model: str
    langfuse_public_key: str
    langfuse_secret_key: str
    langfuse_base_url: str
    langfuse_prompt_name: str
    langfuse_prompt_label: str
    workshop_prompt_variant: str
    dataset_name: str


env = Env(
    port=int(os.getenv("PORT", "8787")),
    openai_api_key=os.getenv("OPENAI_API_KEY", ""),
    # The TS app pins gpt-5.5-2026-04-23; the Python side defaults to a widely available model.
    openai_model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
    langfuse_public_key=os.getenv("LANGFUSE_PUBLIC_KEY", ""),
    langfuse_secret_key=os.getenv("LANGFUSE_SECRET_KEY", ""),
    langfuse_base_url=os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com"),
    langfuse_prompt_name=os.getenv("LANGFUSE_PROMPT_NAME", "dad-it-support-agent"),
    langfuse_prompt_label=os.getenv("LANGFUSE_PROMPT_LABEL", "production"),
    workshop_prompt_variant=os.getenv("WORKSHOP_PROMPT_VARIANT", "default"),
    dataset_name=os.getenv("DATASET_NAME", "dad-it-support-workshop"),
)


def is_langfuse_configured() -> bool:
    return bool(env.langfuse_public_key and env.langfuse_secret_key)
