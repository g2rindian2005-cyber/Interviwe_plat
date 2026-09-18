# 🤖 DevOpsAI — Multilingual AI Voice Interview & Learning Platform

A full-stack platform for practicing DevOps interviews by voice, in English, Hindi, or Marathi — with an AI assistant, quizzes, and progress tracking.

## Features

- 🔐 **JWT Authentication** — Register, Login, Logout, protected Dashboard, Profile (Node/Express + PostgreSQL + bcrypt)
- 🌐 **3 Languages** — English 🇬🇧, Hindi 🇮🇳, Marathi 🚩 (UI + interview + AI assistant)
- 🎤 **Multilingual Voice Interview** — pick a technology, language, and difficulty; the AI asks questions by voice, you answer by voice, AI evaluates and scores you
- 🤖 **DevOps AI Assistant** — chatbot that answers in whichever language is selected
- 📊 **Interview Reports** — technical / communication / confidence / overall scores per interview
- 🧠 **Learning Mode** — Quiz, Practice Interview, AI Assistant, and Progress tracking across 8 technologies: AWS, Docker, Kubernetes, Terraform, Jenkins, Linux, GitHub Actions, Monitoring

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite, React Router, Axios |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Auth | bcrypt + JSON Web Tokens |
| Voice | Browser Web Speech API (free, no API key needed) — Speech-to-Text and Text-to-Speech |
| AI | Any OpenAI-compatible Chat Completions API (question generation, answer scoring, assistant chat) — **optional**, the app has an offline fallback |

## Project Structure

```
devopsai-platform/
├── backend/               # Express API
│   ├── config/db.js       # PostgreSQL connection pool
│   ├── controllers/       # Route logic (auth, interview, quiz, assistant, progress)
│   ├── middleware/auth.js # JWT verification middleware
│   ├── models/schema.sql  # Database schema
│   ├── models/migrate.js  # Runs schema.sql against your DB
│   ├── routes/            # Express routers
│   ├── utils/              # AI client wrapper, language config
│   ├── server.js          # App entrypoint
│   └── .env.example       # Copy to .env and fill in
├── frontend/               # React app
│   ├── src/
│   │   ├── api/axios.js         # API client (reads VITE_API_URL)
│   │   ├── context/             # Auth + Language React contexts
│   │   ├── components/          # LanguageSelector, VoiceRecorder, ProtectedRoute
│   │   ├── pages/                # Login, Register, Dashboard, Interview, Quiz, Assistant, Progress
│   │   └── i18n/translations.js # UI text in en/hi/mr
│   └── .env.example
├── DEPLOYMENT.md           # Step-by-step AWS EC2 deployment guide
└── README.md               # This file
```

## ⚠️ Important — Read Before Running

This is a real, working codebase (backend boots cleanly, frontend builds with zero errors — both were verified). But two things depend on **your** setup:

1. **A PostgreSQL database must exist and be reachable** (a local Postgres, an EC2-hosted Postgres, or an **AWS RDS** instance), with its connection details in `backend/.env`. Nothing will work without this — see **Database Setup** below.
2. **The AI features work in two modes:**
   - **With `AI_API_KEY` set** (recommended): real AI-generated interview questions, AI scoring/feedback, and a real AI assistant, in the selected language.
   - **Without it**: the app still runs fully end-to-end using a built-in offline question bank and a simple length-based scoring heuristic, so you can demo/test everything with zero cost. Swap in a key any time — no code changes needed.
3. **Voice input/output** uses the browser's own Web Speech API (Chrome/Edge). It's free and needs no key, but only works over **HTTPS or localhost** (browsers block microphone access on plain HTTP for non-localhost origins) — this matters for your EC2 deployment, see `DEPLOYMENT.md`.

## 🗄️ Database Setup — Auto-Migration (No Manual SQL Needed)

**The backend creates its own tables automatically on startup.** `server.js` connects to whatever database is configured in `backend/.env` and runs `models/schema.sql` (`CREATE TABLE IF NOT EXISTS …`) before it starts accepting requests. This means:

- Point `.env` at a **brand-new, empty AWS RDS PostgreSQL instance** and just start the server (`npm start` / `npm run dev`, or `pm2 start`) — the `users`, `interviews`, `quiz_attempts`, etc. tables are created for you. No `psql`, no `npm run migrate`, no manual query, on first boot or ever after.
- It's safe to restart the server any number of times — the migration only ever creates tables that don't already exist yet; it never touches or drops existing data.
- On startup the server also retries the DB connection a few times (useful right after an RDS instance first becomes available), and if it truly can't connect, it fails loudly with the exact reason in the logs instead of starting in a broken state — this is what causes the **"Server error during registration"** message on the Register page if it's skipped: the API was up, but the `users` table didn't exist yet (or the DB was unreachable), so every insert failed. That whole class of problem is what this auto-migration removes.
- `npm run migrate` still exists if you ever want to (re-)apply the schema by hand.

### Option A — AWS RDS (recommended for EC2 deployments)

1. **RDS Console → Create database** → Engine **PostgreSQL** → pick a template (Free tier is fine for testing).
2. Set a **DB instance identifier**, **master username**, and **master password** — you'll put these in `.env`.
3. Under **Connectivity**, set **Public access** appropriately:
   - If your backend runs on an EC2 instance in the same VPC, you can leave RDS **not** publicly accessible and instead allow the **EC2 instance's security group** as a source on the RDS security group (Inbound rule: PostgreSQL / port 5432 / source = EC2's security group). This is the more secure option.
   - If you need to reach RDS from outside the VPC (e.g. running the backend locally against RDS), set **Public access = Yes** and add an inbound rule on the RDS security group for PostgreSQL / port 5432 from your IP.
4. Once the instance status is **Available**, copy its **Endpoint** (RDS console → your instance → "Endpoint & port").
5. Fill in `backend/.env`:
   ```ini
   DB_HOST=your-instance.xxxxxxxxxx.ap-south-1.rds.amazonaws.com
   DB_PORT=5432
   DB_NAME=devopsai
   DB_USER=your_master_username
   DB_PASSWORD=your_master_password
   DB_SSL=true
   ```
   (RDS requires SSL, hence `DB_SSL=true` — this is the default.) There's no separate step to create the `devopsai` database by hand if you use the default RDS database name from step 2; if you gave it a different initial database name, set `DB_NAME` to match.
6. Start the backend (`npm run dev` locally, or `pm2 start server.js --name devopsai-backend` on EC2 — see Step 5 of `DEPLOYMENT.md`). Watch the logs: you should see
   ```
   🔌 Connecting to database...
   ✅ Database connection established.
   🛠️  Applying database schema (safe to re-run)...
   ✅ Schema is up to date.
   🚀 DevOpsAI backend running on port 5000 [...]
   ```
   That's it — registering a user on the frontend will now work immediately.

### Option B — Local or self-hosted PostgreSQL (e.g. installed directly on EC2)

```bash
# Create the database and a user (adjust names/passwords as you like)
sudo -u postgres psql
CREATE DATABASE devopsai;
CREATE USER devopsai_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE devopsai TO devopsai_user;
GRANT USAGE, CREATE ON SCHEMA public TO devopsai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO devopsai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO devopsai_user;
\q
```

### permision inside psql 
GRANT USAGE, CREATE ON SCHEMA public TO devopsai_user;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO devopsai_user;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO devopsai_user;

#####################################
Then in `backend/.env`, set `DB_HOST=localhost` and `DB_SSL=false` (a self-hosted Postgres usually has no SSL configured — leaving `DB_SSL=true` against a non-SSL server will make every query fail). No manual `CREATE TABLE` needed either way — the backend still auto-migrates on startup.

## Local Setup (Development)

### 1. Prerequisites
- Node.js ≥ 18
- A PostgreSQL database, per **Database Setup** above (RDS or local)

### 2. Backend
```bash
cd backend
sudo dnf install postgresql15 -y
sudo dnf install -y nodejs
cp .env.example .env
# --> Edit .env: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL, JWT_SECRET (see "What You Must Change" below)
npm install
npm run migrate
npm run dev          # starts on http://localhost:5000 and auto-creates tables on first boot
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
# --> Edit .env: VITE_API_URL (defaults to http://localhost:5000/api, fine for local dev)
npm install
npm run dev           # starts on http://localhost:5173
```

Open `http://localhost:5173`, register an account, and try it out.

## 🔧 What You MUST Change Before Deploying

| File | Variable | What to set it to |
|---|---|---|
| `backend/.env` | `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Your real PostgreSQL connection details (your RDS endpoint if using RDS) |
| `backend/.env` | `DB_SSL` | `true` for AWS RDS (default) — `false` only for a local/self-hosted Postgres with no SSL configured |
| `backend/.env` | `JWT_SECRET` | A long random string — generate with `openssl rand -base64 48`. **Never use the example value.** |
| `backend/.env` | `FRONTEND_URL` | Your deployed frontend's URL (e.g. `http://YOUR_EC2_IP` or `https://yourdomain.com`) — required for CORS to work |
| `backend/.env` | `AI_API_KEY` (optional) | Your OpenAI (or compatible) API key, for real AI questions/scoring/assistant answers |
| `backend/.env` | `NODE_ENV` | `production` when deployed |
| `frontend/.env` | `VITE_API_URL` | Your deployed backend's API URL (e.g. `http://YOUR_EC2_IP:5000/api` or `https://yourdomain.com/api`) — **must be rebuilt** (`npm run build`) after changing this, since Vite bakes env vars in at build time |

Full step-by-step AWS EC2 deployment (including nginx reverse proxy, HTTPS, pm2, and where each of the above gets set on the server) is in **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## API Overview

All routes below are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login, returns JWT |
| POST | `/auth/logout` | Logout (protected) |
| GET | `/auth/profile` | Get profile (protected) |
| PUT | `/auth/profile` | Update profile (protected) |
| GET | `/interview/technologies` | List technologies + languages (protected) |
| POST | `/interview/start` | Start an interview (protected) |
| POST | `/interview/answer` | Submit an answer, get next question or final report (protected) |
| GET | `/interview/report/:id` | Full report for one interview (protected) |
| GET | `/interview/history` | List past interviews (protected) |
| POST | `/assistant/chat` | Chat with the AI assistant (protected) |
| GET | `/assistant/history` | Chat history (protected) |
| GET | `/quiz/:technology` | Get quiz questions (protected) |
| POST | `/quiz/submit` | Submit quiz answers (protected) |
| GET | `/progress` | Get learning progress (protected) |
| POST | `/progress/complete-topic` | Mark a topic complete (protected) |

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Register page shows **"Server error during registration"** | Backend couldn't reach the database, or the credentials in `backend/.env` don't match your database | Check the backend's startup logs first — with auto-migration it now logs the exact connection error on boot instead of failing silently later. Verify `DB_HOST` (RDS endpoint or `localhost`), `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `DB_SSL` in `backend/.env`. For RDS, confirm the RDS security group allows inbound PostgreSQL (port 5432) from your backend's IP / security group, and that `DB_SSL=true`. Then restart the backend (`pm2 restart devopsai-backend` or re-run `npm run dev`) |
| Backend logs repeat "⏳ Database not reachable yet" then exit | RDS security group is blocking the connection, or `DB_HOST`/`DB_PORT` is wrong | Double-check the RDS endpoint and port, and that the security group attached to the RDS instance has an inbound rule allowing the backend's source (its EC2 security group, or your IP) on port 5432 |
| "the server does not support SSL connections" in backend logs | `DB_SSL=true` against a local/self-hosted Postgres that doesn't have SSL enabled | Set `DB_SSL=false` in `backend/.env` for that case (keep it `true` for RDS) |
| Frontend loads but API calls fail (CORS error in browser console) | `FRONTEND_URL` in `backend/.env` doesn't match the URL you're actually visiting | Update it, then restart the backend |

## Known Limitations (Be Aware)

- Web Speech API browser support is best in Chrome/Edge; Firefox/Safari support for `SpeechRecognition` is limited or absent. The Interview page falls back gracefully to text input if unsupported.
- JWT logout is stateless (the token is simply discarded client-side) — there's no server-side token blacklist. Fine for most use cases; add one if you need instant token revocation.
- The offline (no-`AI_API_KEY`) scoring mode is a simple heuristic, not real evaluation — it's there so the app runs without any paid API, but for genuinely useful interview feedback, set `AI_API_KEY`.
