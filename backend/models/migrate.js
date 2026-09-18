// Runs schema.sql against the configured PostgreSQL database.
// Usage (manual): npm run migrate
// Also imported and called automatically by server.js on every boot, so a
// fresh database (e.g. a brand-new RDS instance) gets its tables created
// with zero manual steps. schema.sql uses CREATE TABLE IF NOT EXISTS, so
// running it repeatedly against an already-migrated database is a safe no-op.
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigration() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

// Only auto-execute (and close the pool afterwards) when this file is run
// directly via `npm run migrate`. When required from server.js, the caller
// owns the pool's lifecycle instead.
if (require.main === module) {
  (async () => {
    try {
      console.log('Running database migration...');
      await runMigration();
      console.log('✅ Migration completed successfully.');
    } catch (err) {
      console.error('❌ Migration failed:', err.message);
      process.exitCode = 1;
    } finally {
      await pool.end();
    }
  })();
}

module.exports = { runMigration };
