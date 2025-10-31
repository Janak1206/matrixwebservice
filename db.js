// student-registration-server/db.js
const { Pool } = require('pg');
require('dotenv').config(); // Make sure you have the 'dotenv' package installed

const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'studentRegistrationDB', // Change this
    password: process.env.PGPASSWORD || 'your_pg_password', // Change this
    port: process.env.PGPORT || 5432,
    ssl: {
        rejectUnauthorized: false, // ✅ Important for Neon / Render / SSL connections
    },
});

// Test the connection when the server starts
pool.connect()
    .then(client => {
        console.log('✅ PostgreSQL connected successfully to:', process.env.PGDATABASE);
        client.release();
    })
    .catch(err => {
        console.error('❌ Error connecting to PostgreSQL:', err.stack);
    });

// Export a utility function to execute queries
module.exports = {
    query: (text, params) => pool.query(text, params),
};