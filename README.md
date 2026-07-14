# SyncNode — Sandbox API Gateway Client

SyncNode is a premium, high-fidelity API testing client designed to replicate Postman. It features a cyberpunk-themed responsive layout with split panes, real-time environment variable interpolation, and an asynchronous backend proxy runner that bypasses browser CORS limitations.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Interactions**: Framer Motion (for fluid liquid underline highlights)
- **Editor**: `@monaco-editor/react` (JSON syntax highlight editor)

### Backend
- **Framework**: FastAPI (Python 3)
- **Database**: SQLite with SQLAlchemy ORM
- **HTTP Client**: `httpx` (Asynchronous HTTP requests)

---

## Architecture Overview

SyncNode bypasses browser CORS restrictions by routing all outbound requests through a FastAPI proxy runner endpoint (`POST /api/runner/execute`). 

```
[ Next.js UI ] ──(JSON Payload)──> [ FastAPI Gateway ] ──(httpx Async)──> [ Outbound APIs ]
                                           │
                                    (SQLite Log)
                                           ▼
                                    [ History Table ]
```

### Proxy Runner Process:
1. **Dynamic Resolution**: The backend resolves `{{variable_name}}` patterns in the URL, headers, and body using key-value mappings from the active environment.
2. **Auth Injection**: Appends Bearer or Basic Credentials to the header map.
3. **Execution**: Performs the outbound call asynchronously with a 30-second timeout, tracking time (ms) and content size (bytes).
4. **Error Handling**: Gracefully catches DNS failures, timeouts, and network drops, returning a clean JSON error response to avoid stack trace leaks.
5. **Persistence**: Saves the execution metadata to the local history database.

---

## Database Schema

SyncNode uses a local SQLite database managed via SQLAlchemy.

| Table Name | Description | Key Relationships | Cascading Deletes |
| :--- | :--- | :--- | :--- |
| `collections` | Group of saved endpoints. | One-to-Many with `saved_requests` | Yes (`cascade="all, delete-orphan"`) |
| `saved_requests` | Stored request configurations. | Many-to-One with `collections` | N/A |
| `environments` | Custom variables scope. | One-to-Many with `environment_variables` | Yes (`cascade="all, delete-orphan"`) |
| `environment_variables` | Key-value records. | Many-to-One with `environments` | N/A |
| `history_entries` | Log logs of executed proxy runs. | None | N/A |

---

## API Documentation

The backend exposes the following REST endpoints:

| Endpoint | Method | Tag | Description |
| :--- | :--- | :--- | :--- |
| `/api/runner/execute` | `POST` | Runner | Executes an outbound sandboxed request. |
| `/api/collections` | `GET` / `POST` | Collections | Lists or creates Collections. |
| `/api/collections/{id}` | `PATCH` / `DELETE` | Collections | Renames or removes Collections. |
| `/api/requests` | `POST` | Requests | Creates a new request template. |
| `/api/requests/{id}` | `PATCH` / `DELETE` | Requests | Updates or deletes request templates. |
| `/api/environments` | `GET` / `POST` | Environments | Lists or creates Environments. |
| `/api/environments/{id}/variables` | `POST` | Environments | Adds variables to an environment scope. |
| `/api/environments/variables/{id}` | `PUT` / `DELETE` | Environments | Updates or deletes environment variables. |
| `/api/history` | `GET` / `DELETE` | History | Fetches or clears history logs. |
| `/api/history/{id}` | `DELETE` | History | Deletes a single history entry. |
| `/api/health` | `GET` | Core | Verifies server and database connection health status. |

---

## Local Setup Instructions

### Backend (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   # macOS / Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Seed the database with realistic sample datasets:
   ```bash
   python ../seed.py
   ```
5. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```
   *The interactive Swagger UI documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).*

### Frontend (Next.js)
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the web interface at [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

### Frontend (`frontend/.env.local`)
Create a `.env.local` file inside the `frontend` folder:
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### Backend (`backend/app/main.py` CORS Settings)
Allowed client origins are hardcoded inside backend CORS configurations:
```python
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
```

---

## Assumptions & Scope

The following features are placeholder configurations:
1. **User Authentication**: Standard user accounts and team scopes are mocked. All requests are stored locally.
2. **Settings Panels**: System settings options (Themes, Workspace configurations) display placeholder messages.
