const { Pool } = require('pg');

// Use environment variable for connection string - no hardcoded fallback
if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    console.error('Please set it in your .env file or environment.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Test connection and export pool
pool.query('SELECT 1')
    .then(() => console.log('PostgreSQL connection successful.'))
    .catch(err => {
        console.error('PostgreSQL connection failed:', err.message);
        process.exit(1);
    });

module.exports = { pool };
