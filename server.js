// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Enable JSON parsing
app.use(bodyParser.json());

// ✅ Enable CORS for frontend (both local + Render)
app.use(cors({
    origin: ['http://localhost:5173', 'https://matrixwebservice.onrender.com', '*'], // Replace 'matrixweb.onrender.com' with your actual frontend Render URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// ✅ Helper: Convert empty strings to null
const cleanInput = (value) => (value === '' ? null : value);

// ✅ Root route (for Render health checks)
app.get('/', (req, res) => {
    res.json({ message: '✅ Matrix Web Service API running successfully!' });
});

// ✅ Registration API
app.post('/api/register', async (req, res) => {
    console.log('--- RECEIVED /api/register REQUEST ---');
    const data = req.body;

    // Validation
    if (!data.studentName || !data.email || !data.mobile) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }
    if (!data.dob) {
        return res.status(400).json({ message: 'Date of Birth is required.' });
    }

    const insertQuery = `
    INSERT INTO students (
      student_name, address, email, mobile, dob, school,
      standard, standard_other_details, board, board_other_details, program_details
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id;
  `;

    const values = [
        data.studentName,
        cleanInput(data.address),
        data.email,
        data.mobile,
        cleanInput(data.dob),
        cleanInput(data.school),
        data.standard,
        data.standard === 'Other' ? cleanInput(data.standardOtherDetails) : null,
        data.board,
        data.board === 'Other' ? cleanInput(data.boardOtherDetails) : null,
        JSON.stringify(data.programDetails || []),
    ];

    try {
        const result = await db.query(insertQuery, values);
        res.status(201).json({
            message: 'Registration successful!',
            id: result.rows[0].id,
        });
    } catch (error) {
        console.error('PostgreSQL Registration error:', error.message);

        if (error.code === '23505') {
            return res.status(409).json({ message: 'Error: Email address already registered.' });
        }
        if (error.code === '23502') {
            return res.status(400).json({
                message: `Missing data for a required database field (NOT NULL violation: ${error.message}).`,
            });
        }

        res.status(500).json({ message: 'Server error during registration. Check logs for details.' });
    }
});

// ✅ Fetch all students
app.get('/api/students', async (req, res) => {
    const selectQuery = 'SELECT * FROM students ORDER BY id DESC;';
    try {
        const result = await db.query(selectQuery);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('PostgreSQL Fetch Error:', error.message);
        res.status(500).json({ message: 'Internal server error while fetching student data.' });
    }
});

// ✅ Catch-all for invalid /api routes
app.use('/api', (req, res) => {
    res.status(404).json({ message: 'API route not found.' });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.get('/api/test-cors', (req, res) => {
    res.json({ message: 'CORS is working!' });
});

// ✅ Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('🌐 API Endpoint: POST /api/register');
});
