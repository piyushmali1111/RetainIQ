# ChurnGuardAI local workspace

The full GitHub repository is in this folder. All UI and backend changes remain local; no push or deployment was made.

## Start and stop

Double-click **run_churnguardai.bat**. It starts the Python API on http://127.0.0.1:8000 and Next.js on http://127.0.0.1:3000, waits for readiness, and opens the site. Background windows stay hidden.

Double-click **stop_churnguardai.bat** to stop only the processes recorded by this launcher. It does not kill unrelated programs using the same ports. Logs are in the ignored artifacts/ folder.

Local demo login:

- Email: manager@churnguard.ai
- Password: ChurnGuard@2026

These are development credentials. Set MANAGER_EMAIL and MANAGER_PASSWORD in backend/.env before using a shared environment. The sign-in uses server-side sessions and HttpOnly cookies; protected APIs require a valid session.

## First-time dependency setup

Already completed in this workspace. On another machine, use Node.js 20.9+ and Python 3.11–3.13:

~~~powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-runtime.txt
cd ../frontend
npm ci
~~~

The existing model files and dataset are included. The launcher creates backend/local.db as a copy of the repository's sample database. The tracked churnguardai.db stays unchanged. Do not use --reseed against a database containing work you want to preserve.

## Routes and workflows

- / — Landing page and product walkthrough
- /login — Manager sign-in, password visibility and remember-session control
- /dashboard — Live totals, 4/8-week chart, real AI scan, pending offers and agent events
- /customers — Backend search, risk filters, sorting, pagination and current-page CSV export
- /customers/[id] — Risk analysis, SHAP factors, purchase totals, conversations and offer generation
- /tickets — Sentiment filters, ticket search, pagination, simulation and conversation detail
- /approvals — Pending/approved/rejected tabs, editable offer messages, policy checks and saved decisions
- /settings — Persisted thresholds, discount ceiling, scheduler frequency and agent switches

## Data and service limits

The bundled 4,850 customer records are synthetic sample data. The UI displays backend values rather than the illustrative numbers or names in the supplied mockup.

The original backend has no email delivery integration. Approval saves a decision; it does not send an email. The email toggle is visibly unavailable. No external messages are sent.

Without a Gemini key, support and retention agents use the repository's deterministic local responses. XGBoost scoring, VADER sentiment, SHAP explanations, and the LangGraph workflow run locally. Enable live model-generated text by configuring GEMINI_API_KEY and ENABLE_LIVE_LLM=true in backend/.env; live calls were not tested.

The dataset exposes purchase aggregates, not individual order transactions. The Purchase Summary tab explicitly states this. There is no email-based password recovery; the login help explains local administrator recovery.

The retained metric counts unique customers with purchase activity or a confirmed positive outcome, never merely an offer approval. Historical seed tickets incorrectly dated in the future are corrected only for synthetic TCK-CUST-* IDs in the local database.

## Verification

~~~powershell
cd frontend
npm run build
npx tsc --noEmit
cd ../backend
.\.venv\Scripts\python.exe -m pytest tests -v --disable-warnings
~~~

The integration suite copies the bundled database into ignored test-ui-integration.db. It covers sessions, data totals, search/sorting/pagination, customer detail, real model scan, ticket sentiment, agent controls, settings persistence, offer policy enforcement, edit/approve/reject, deduplication and retention accounting.

## Artwork

frontend/public/images/customer-hero.png was created with the built-in ImageGen tool. Prompt: a cheerful young adult Indian woman with long dark brown hair in a mustard knit sweater, looking at a black smartphone; warm studio light, waist-up square composition, pale cream/light-blue abstract backdrop; no text, logos or UI. The remaining decorative artwork uses local CSS and Lucide icons.


## Product-aware discount policy

Startup runs an additive, repeatable SQLite migration. It creates the catalog and adds nullable product links and pricing audit fields without deleting customer, ticket, offer, or decision records. The six sample products and default associations are demo data, not inferred purchase history. Existing catalog values are never overwritten. Historical offers retain their original amounts and decisions; pending offers above the current product cap must be edited before approval. Unlinked historical offers must be replaced by a new offer with product context.

Each product ceiling is the whole-number floor of min(25, half its unrounded gross margin percentage), with a lower bound of zero. A stricter manager discount setting also applies. There is no 5% minimum that can override a margin ceiling. Missing product context never produces a positive discount. Catalog prices and costs must use the same currency; LTV thresholds (400 and 1000) assume customer spending uses that currency too.

Python calculates discounts from fused risk and lifetime spend. Below the configured risk threshold the discount is zero. At or above the threshold, risk scales the allocation from min(5, ceiling) to the effective ceiling, weighted by the LTV tier (0.70, 0.85, or 1.00). Gemini writes only the apology; the application appends the exact product-scoped discount and RETAIN coupon reference. The verifier recomputes pricing and repairs inconsistent text. Coupons are draft references: this repository has no checkout redemption integration.

Ticket simulation accepts an explicit catalog product. Otherwise it uses the demo customer's associated product. Manual generation and scheduled scans use the same pricing engine. Editing and approval recheck live catalog margins and current business limits. The Approval Inbox shows product economics, the original deterministic rationale, and any manager adjustment.

Pricing tests include electronics/apparel contrasts, threshold and LTV boundaries, very low/negative margins, malicious model text, live margin changes before approval, API persistence, and migration idempotence. Live Gemini calls remain untested; model text is mocked in verification.
