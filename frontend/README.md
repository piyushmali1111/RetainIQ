# ChurnGuardAI frontend

Next.js dashboard for the ChurnGuardAI local workspace. Start both the frontend and backend with [`run_churnguardai.bat`](../run_churnguardai.bat), then open http://127.0.0.1:3000. The app uses same-origin `/api` requests routed to the local FastAPI server on port 8000.

See [`LOCAL_SETUP.md`](../LOCAL_SETUP.md) for installation, local demo credentials, workflows, verification, and service limits.

To run only the frontend after installing dependencies:

```powershell
npm ci
npm run dev
```
