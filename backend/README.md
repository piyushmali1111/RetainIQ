# ChurnGuardAI Backend

FastAPI + LangGraph + XGBoost + VADER churn prevention backend.

## Quick Start

```powershell
cd backend

# 1. Create & activate virtual environment (first time only)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install dependencies (first time only)
pip install -r requirements.txt

# 3. Configure environment (first time only)
copy .env.example .env
# Edit .env and add your GEMINI_API_KEY if needed

# 4. Start the API server
.\start.ps1          # recommended: handles venv automatically

# OR manually with venv activated:
# .\.venv\Scripts\Activate.ps1
# uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> **Common mistake:** Running `uvicorn` without activating `.venv` uses the
> system Python which doesn't have the project packages. Always use `.\start.ps1`
> or activate the venv first.

## API Docs

Visit http://localhost:8000/docs for Swagger UI.

## Architecture
- **Layer 1 (ML):** XGBoost churn predictor + VADER sentiment + SHAP explainer
- **Layer 2 (Agents):** LangGraph multi-agent: Support → Risk Fusion → Retention → Verifier
- **Layer 3 (Feedback):** Outcome logging + `retrain_from_outcomes.py`
