const { Pool } = require('pg');
require('dotenv').config();

// DB_SSL controls whether the connection uses SSL:
//   - true  (default) — required by AWS RDS out of the box. Also fine for
//            most managed Postgres providers.
//   - false            — for a local/self-hosted Postgres (e.g. installed
//            directly on the EC2 box) that doesn't have SSL configured;
//            leaving SSL on in that case causes every query to fail with
//            "the server does not support SSL connections".
const useSSL = process.env.DB_SSL !== 'false';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  ssl: useSSL ? { rejectUnauthorized: false } : false,

  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
});

module.exports = pool;
