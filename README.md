# Sentinel

Governance control plane for autonomous financial AI agents.

## Problem Statement

Sentinel is built for the American Express CodeStreet 2026 Hackathon under the problem statement:

"Governance Layer for Financial Agents"

## Overview

Sentinel is a governance control plane that sits between autonomous financial AI agents and enterprise systems. Every action proposed by an agent must pass through Sentinel before execution, undergoing identity verification, permission checks, budget validation, risk scoring, and policy evaluation. The platform provides full explainability and operator control over all agent decisions.

## Features

- **Agent Registry** — Register, monitor, and manage financial AI agents across departments.
- **Policy Engine** — Define and enforce governance policies with configurable limits and thresholds.
- **Dynamic Spend Controls** — Per-agent and per-policy daily budgets and transaction limits.
- **Risk Scoring** — Multi-factor risk model evaluating amount, trust, budget pressure, frequency, and customer risk.
- **Human Approval Workflow** — Escalate high-risk requests for operator review and decision.
- **Explainability** — Every decision includes a detailed breakdown of all pipeline steps and risk factors.
- **Audit Logs** — Immutable record of every evaluation and operator action.
- **Behaviour Monitoring** — Track agent usage patterns, request frequency, and budget consumption.
- **Emergency Kill Switch** — Instantly halt all agent execution with a single toggle.
- **Operator Dashboard** — Real-time metrics, live request feed, and system controls.

## Architecture

Sentinel follows a layered architecture:

- **Frontend** — Next.js operator dashboard providing real-time monitoring and control.
- **Backend** — FastAPI REST API handling authentication, data management, and operator actions.
- **Decision Engine** — Core governance pipeline: Identity -> Permission -> Budget -> Risk -> Decision.
- **Policy Engine** — Policy validation including allowed actions, departments, operational hours, and limits.
- **Audit Layer** — Persistent audit trail capturing every decision and operator intervention.

## Tech Stack

- **Frontend** — Next.js, React, TypeScript, TailwindCSS, Lucide Icons
- **Backend** — FastAPI, Pydantic, SQLAlchemy, SQLite, JWT
- **Database** — SQLite
- **Authentication** — JWT with bcrypt password hashing
- **Deployment** — Local development with Python 3.11+ and Node.js 20+

## Running the Project

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Using start-dev.bat

Double-click `start-dev.bat` from the repository root to launch both backend and frontend in separate terminal windows.

## Demo Credentials

- Email: operator@amex.com
- Password: sentinel2026

## Folder Structure

```text
sentinel/
├── backend/
│   └── app/
│       ├── core/          Configuration, database, JWT, dependencies
│       ├── models/        SQLAlchemy ORM entities
│       ├── schemas/       Pydantic request/response contracts
│       ├── services/      Business logic (decision, risk, policy, dashboard)
│       ├── routers/       HTTP API route handlers
│       ├── seed.py        Database seeding with mock data
│       └── main.py        FastAPI application entry point
├── frontend/
│   └── src/
│       ├── app/           Next.js App Router pages
│       ├── components/    Reusable React components
│       ├── hooks/         Custom React hooks
│       └── lib/           API client, auth, simulator, types, utilities
├── start-dev.bat          One-click Windows launcher
└── README.md
```

## Future Improvements

- Open Policy Agent (OPA) integration for external policy management
- Kafka for asynchronous request processing and event streaming
- Redis for caching and rate limiting
- Kubernetes deployment for horizontal scaling
- Multi-region deployment for high availability
- Cryptographic audit ledger for tamper-proof compliance records

## Conclusion

Sentinel demonstrates a production-grade approach to AI governance for financial services. By enforcing policy checks, risk scoring, human escalation workflows, and full auditability, it provides the foundational layer required to deploy autonomous AI agents safely within enterprise financial systems.

## Commands To Run

```text
============================================
Sentinel - Commands to Run the Project
============================================

Follow these steps in order on a Windows machine.

Prerequisites: Python 3.11+, Node.js 20+, Git

-------------------------------------------------------
1. Clone the Repository
-------------------------------------------------------
git clone https://github.com/SparshSunilNaik/Sentinel.git
cd Sentinel

-------------------------------------------------------
2. Backend Setup
-------------------------------------------------------
cd backend

2a. Create virtual environment
python -m venv .venv

2b. Activate virtual environment
.venv\Scripts\activate

2c. Install dependencies
pip install -r requirements.txt

2d. Run the backend server
uvicorn app.main:app --reload --port 8000

Backend runs at: http://localhost:8000
API docs (Swagger): http://localhost:8000/docs
Health check: http://localhost:8000/health

-------------------------------------------------------
3. Frontend Setup (open a new terminal)
-------------------------------------------------------
cd frontend

3a. Install dependencies
npm install

3b. Run the frontend server
npm run dev

Frontend runs at: http://localhost:3000

-------------------------------------------------------
4. Using start-dev.bat (Alternative to steps 2-3)
-------------------------------------------------------
From the repository root, double-click:
start-dev.bat

This launches both backend and frontend automatically.

-------------------------------------------------------
5. Environment Variables
-------------------------------------------------------
No environment variables are required.
Default settings are defined in backend/app/core/config.py.
The frontend reads API URL from frontend/.env.local:
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

-------------------------------------------------------
6. URLs
-------------------------------------------------------
Frontend Dashboard:  http://localhost:3000
Backend API:         http://localhost:8000
Swagger Docs:        http://localhost:8000/docs
Health Check:        http://localhost:8000/health

-------------------------------------------------------
7. Login Credentials
-------------------------------------------------------
Email:    operator@amex.com
Password: sentinel2026

-------------------------------------------------------
8. Notes
-------------------------------------------------------
- The database (sentinel.db) is auto-created on first run.
- Mock data (agents, policies, sample audit logs) is auto-seeded when the backend starts for the first time.
- The kill switch is disabled by default.
- The simulator runs on the frontend dashboard and does not require any external services.
```



