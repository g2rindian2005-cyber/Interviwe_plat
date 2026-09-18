# 🚀 Deploying DevOpsAI to AWS EC2 — Step by Step

This guide deploys the app on a **single Ubuntu EC2 instance**: PostgreSQL, the Node backend (via pm2), and the React frontend (built as static files, served by nginx, which also reverse-proxies `/api` to the backend). This is the simplest reliable setup for one server. Voice features require HTTPS (or localhost) — Step 8 covers adding a free SSL certificate if you have a domain; Step 9 explains your options if you only have an IP.

---

## Step 1 — Launch the EC2 Instance

1. AWS Console → EC2 → **Launch Instance**
2. **AMI:** Ubuntu Server 22.04 LTS (64-bit x86)
3. **Instance type:** `t3.small` or larger (t2.micro will be slow but works for testing)
4. **Key pair:** create or select one, download the `.pem` file
5. **Network settings → Edit security group**, add inbound rules:
   | Type | Port | Source |
   |---|---|---|
   | SSH | 22 | Your IP (or 0.0.0.0/0 if needed) |
   | HTTP | 80 | 0.0.0.0/0 |
   | HTTPS | 443 | 0.0.0.0/0 |
6. **Storage:** 20 GB gp3 is plenty
7. Launch, then note the instance's **Public IPv4 address**

Connect:
```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## Step 2 — Install System Dependencies

```bash
# 1. Update system
sudo dnf update -y

# 2. Node.js 18
sudo dnf install -y nodejs npm

# Check versions
node -v
npm -v

# 3. PostgreSQL
sudo dnf install -y postgresql15 postgresql15-server

# Initialize PostgreSQL
sudo postgresql-setup --initdb

# Start PostgreSQL
sudo systemctl enable --now postgresql

# Check status
sudo systemctl status postgresql

# 4. Nginx
sudo dnf install -y nginx

# Start Nginx
sudo systemctl enable --now nginx

# Check status
sudo systemctl status nginx

# 5. PM2
sudo npm install -g pm2

# Check PM2
pm2 -v


# Check Git
git --version
---

## Step 3 — Set Up PostgreSQL

Pick **one** of these. Either way, the app never needs a manual `CREATE TABLE` step — the backend auto-creates its tables the first time it starts (see Step 5).

**Option A — AWS RDS (recommended):** create a PostgreSQL instance in the RDS console, allow inbound PostgreSQL (port 5432) on its security group from this EC2 instance's security group, and note its **Endpoint** (RDS console → your instance → "Endpoint & port"). You'll use that as `DB_HOST` in Step 5, with `DB_SSL=true`. Full walkthrough in `README.md` → "Database Setup".

**Option B — Postgres installed on this EC2 instance:**
```bash
sudo -u postgres psql
```
Inside the `psql` prompt:
```sql
CREATE DATABASE devopsai;
CREATE USER devopsai_user WITH ENCRYPTED PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE devopsai TO devopsai_user;
\q
```
> **Change `CHANGE_THIS_PASSWORD`** to something strong — you'll put the same value in `backend/.env` in Step 5. Use `DB_HOST=localhost` and `DB_SSL=false` for this option.

---

## Step 4 — Upload the Project to EC2

From your local machine (unzip the project first), upload it:
```bash
scp -i your-key.pem -r devopsai-platform ubuntu@YOUR_EC2_PUBLIC_IP:~/
```
Or, if you push the code to GitHub first:
```bash
# on the EC2 instance
git clone https://github.com/your-username/devopsai-platform.git
```

---

## Step 5 — Configure and Start the Backend

```bash
cd ~/devopsai-platform/backend
cp .env.example .env
nano .env
```

Edit these values in `.env` (this is the **"where do I change things"** step):

```ini
PORT=5000
NODE_ENV=production

# Your frontend origin — since nginx will serve the frontend on port 80,
# use your EC2 public IP or domain here (no trailing slash):
FRONTEND_URL=http://YOUR_EC2_PUBLIC_IP

DB_HOST=localhost                          # or your RDS endpoint, if using Option A above
DB_PORT=5432
DB_NAME=devopsai
DB_USER=devopsai_user
DB_PASSWORD=CHANGE_THIS_PASSWORD          # same password as Step 3
DB_SSL=true                                # true for RDS, false for local Postgres in Option B

JWT_SECRET=PASTE_A_LONG_RANDOM_STRING_HERE  # generate below

AI_API_KEY=                                # optional, see note below
AI_API_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

Generate a strong JWT secret:
```bash
openssl rand -base64 48
```
Paste the output as `JWT_SECRET`.

**About `AI_API_KEY`:** leave it blank to run the app fully working in offline mode (built-in question bank + heuristic scoring, zero cost). Add a real OpenAI-compatible key here later, any time, to enable true AI-generated multilingual questions, real evaluation, and a real AI assistant — no code changes needed, just update this value and restart pm2 (Step 5 continued below).

Now install and start — the backend creates all database tables automatically on boot (see `README.md` → "Database Setup"), so there's no separate migrate step:
```bash
npm install --production
pm2 start server.js --name devopsai-backend
pm2 save
pm2 startup            # follow the printed instructions to enable pm2 on reboot
```
Check the logs to confirm the schema applied cleanly:
```bash
pm2 logs devopsai-backend
# expect: 🔌 Connecting to database... / ✅ Database connection established. /
#         🛠️  Applying database schema... / ✅ Schema is up to date. / 🚀 ... running on port 5000
```

Verify it's running:
```bash
curl http://localhost:5000/api/health
# should return: {"status":"ok", ...}
```

---

## Step 6 — Build and Deploy the Frontend

```bash
cd ~/devopsai-platform/frontend
cp .env.example .env
nano .env
```
Set:
```ini
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP/api
```
> Note this is `/api` with **no port** — nginx will proxy it to the backend on port 5000 (configured in Step 7). If you skip nginx and want the frontend to call the backend directly, use `http://YOUR_EC2_PUBLIC_IP:5000/api` instead and open port 5000 in the security group.

Build the static files:
```bash
npm install
npm run build
```
This creates `frontend/dist/`. Copy it to nginx's web root:
```bash
sudo mkdir -p /var/www/devopsai
sudo cp -r dist/* /var/www/devopsai/
```

> **Remember:** any time you change `VITE_API_URL` (e.g. after adding a domain/SSL in Step 8), you must re-run `npm run build` and re-copy `dist/*` — Vite bakes env vars into the build at build time, not at runtime.

---

## Step 7 — Configure nginx

```bash
sudo nano /etc/nginx/sites-available/devopsai
```
Paste:
```nginx
server {
    listen 80;
    server_name YOUR_EC2_PUBLIC_IP;   # replace with your domain if you have one

    # Serve the React frontend
    root /var/www/devopsai;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # needed for React Router
    }

    # Reverse-proxy API calls to the Node backend
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable it:
```bash
sudo ln -s /etc/nginx/sites-available/devopsai /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t          # test config for errors
sudo systemctl restart nginx
```

Visit `http://YOUR_EC2_PUBLIC_IP` in your browser — the app should load.

---

## Step 8 — (Recommended) Add a Domain + Free HTTPS

Voice input (microphone access) is blocked by browsers on plain HTTP for non-localhost sites, so HTTPS is strongly recommended for the interview feature to work for your users. If you have a domain:

1. Point an A record for your domain to `YOUR_EC2_PUBLIC_IP`.
2. Install Certbot and get a free certificate:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```
   Certbot will edit your nginx config automatically to add HTTPS and redirect HTTP → HTTPS.
3. Update `backend/.env`: `FRONTEND_URL=https://yourdomain.com`, then `pm2 restart devopsai-backend`.
4. Update `frontend/.env`: `VITE_API_URL=https://yourdomain.com/api`, then rebuild and redeploy (Step 6's build + copy commands).

---

## Step 9 — No Domain? (Testing with IP only)

Voice features (microphone) will likely be blocked by the browser over `http://IP-address`. Everything else (auth, dashboard, quiz, AI assistant text chat, reports) will work fine over plain HTTP. Options if you need voice working without a domain:
- Get a free subdomain (e.g. via nip.io, DuckDNS) and point it at your IP, then follow Step 8.
- Access the app via `http://localhost` by SSH tunneling: `ssh -i your-key.pem -L 8080:localhost:80 ubuntu@YOUR_EC2_PUBLIC_IP`, then browse `http://localhost:8080` (localhost is exempt from the HTTPS requirement).

---

## Step 10 — Useful Operations

```bash
# View backend logs
pm2 logs devopsai-backend

# Restart backend after changing .env or code
pm2 restart devopsai-backend

# Redeploy frontend after code changes
cd ~/devopsai-platform/frontend
npm run build
sudo cp -r dist/* /var/www/devopsai/

# Check nginx status / logs
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Check Postgres is up
sudo systemctl status postgresql
```

## Updating Code Later

```bash
cd ~/devopsai-platform
git pull                      # or re-upload via scp
cd backend && npm install && pm2 restart devopsai-backend
cd ../frontend && npm install && npm run build && sudo cp -r dist/* /var/www/devopsai/
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Frontend loads but API calls fail (CORS error in browser console) | `FRONTEND_URL` in `backend/.env` doesn't match the URL you're actually visiting | Update it, `pm2 restart devopsai-backend` |
| "Server error during registration" | Backend can't reach Postgres (wrong `DB_*` values, or RDS security group blocking the connection) | Check `pm2 logs devopsai-backend` for the exact connection error. Verify `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_SSL` in `backend/.env`. For RDS, confirm its security group allows inbound port 5432 from this EC2 instance; for local Postgres, confirm `sudo systemctl status postgresql` is active. Restart with `pm2 restart devopsai-backend` after fixing |
| Blank page / 404 on refresh at `/dashboard` | nginx `try_files` rule missing | Confirm the `location /` block in Step 7 has `try_files $uri $uri/ /index.html;` |
| Mic button does nothing | Not on HTTPS or localhost, or using Firefox/Safari | Use Chrome/Edge; set up HTTPS per Step 8 |
| Changes to `VITE_API_URL` don't take effect | Forgot to rebuild | Vite bakes env vars at build time — always `npm run build` again after editing `frontend/.env` |
