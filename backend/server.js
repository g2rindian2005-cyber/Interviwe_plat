require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const pool = require('./config/db');
const { runMigration } = require('./models/migrate');

const authRoutes = require('./routes/auth');
const interviewRoutes = require('./routes/interview');
const assistantRoutes = require('./routes/assistant');
const quizRoutes = require('./routes/quiz');
const progressRoutes = require('./routes/progress');

const app = express();
const PORT = process.env.PORT || 5000;

// ----- Security & parsing middleware -----
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));

// CORS - CHANGE FRONTEND_URL in .env to your deployed frontend origin
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',');
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Basic rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ----- Routes -----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'DevOpsAI backend', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/progress', progressRoutes);

// 404 handler
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ----- Database bootstrap -----
// Waits for the configured PostgreSQL database (e.g. an AWS RDS instance)
// to accept connections, then automatically creates any missing tables
// from models/schema.sql. This means: point DB_HOST/DB_NAME/DB_USER/
// DB_PASSWORD in .env at a fresh RDS database and start the server — no
// separate `npm run migrate` step, no manual psql queries. Retries a few
// times because RDS can take a moment to become reachable after the
// security group / instance first comes up.
async function waitForDatabase(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      console.error(
        `⏳ Database not reachable yet (attempt ${attempt}/${retries}): ${err.message}`
      );
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function start() {
  try {
    console.log('🔌 Connecting to database...');
    await waitForDatabase();
    console.log('✅ Database connection established.');

    console.log('🛠️  Applying database schema (safe to re-run)...');
    await runMigration();
    console.log('✅ Schema is up to date.');

    app.listen(PORT, () => {
      console.log(`🚀 DevOpsAI backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  } catch (err) {
    console.error('❌ Failed to start server: could not connect to / migrate the database.');
    console.error(
      'Check backend/.env: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD must match your database ' +
      '(e.g. your RDS endpoint), and the database\'s security group must allow inbound connections from this server.'
    );
    console.error(err);
    process.exit(1);
  }
}

start();
