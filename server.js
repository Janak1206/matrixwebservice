// server.js
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db'); // Import the database pool setup

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());

// Helper function to convert empty strings to null
const cleanInput = (value) => (value === '' ? null : value);

// API Route for Registration
app.post('/api/register', async (req, res) => {
    console.log('--- RECEIVED /api/register REQUEST ---');
    const data = req.body;

    // 1. Server-Side Validation
    if (!data.studentName || !data.email || !data.mobile) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }
    if (!data.dob) {
        return res.status(400).json({ message: 'Date of Birth is required.' });
    }

    // 2. SQL Query and Parameters
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
        // 💡 FIX 1: Ensure DOB is passed as a DATE (or string convertible to DATE)
        cleanInput(data.dob),
        cleanInput(data.school),
        data.standard,
        // 💡 FIX 2: Use cleanInput for optional details
        data.standard === 'Other' ? cleanInput(data.standardOtherDetails) : null,
        data.board,
        data.board === 'Other' ? cleanInput(data.boardOtherDetails) : null,
        // JSON.stringify() is necessary for JSONB/JSON column type
        JSON.stringify(data.programDetails || []),
    ];

    try {
        // console.log("values::", values) // Remove in production code
        // console.log("insertQuery::", insertQuery) // Remove in production code

        const result = await db.query(insertQuery, values);

        // Respond with the ID of the newly inserted student
        res.status(201).json({
            message: 'Registration successful!',
            id: result.rows[0].id
        });

    } catch (error) {
        // Log the full error to the Render logs
        console.error('PostgreSQL Registration error:', error.message, error.stack);

        // Handle specific errors like duplicate email
        if (error.code === '23505') { // PostgreSQL unique violation error code
            return res.status(409).json({ message: 'Error: Email address already registered.' });
        }
        if (error.code === '23502') { // PostgreSQL NOT NULL violation
            return res.status(400).json({ message: `Missing data for a required database field (NOT NULL violation: ${error.message}).` });
        }

        res.status(500).json({ message: 'Server error during registration. Check Render logs for details.' });
    }
});

// app.get('/api/students', ...) remains unchanged as it works

app.get('/api/students', async (req, res) => {
    // Select all columns from the students table
    const selectQuery = 'SELECT * FROM students ORDER BY id DESC;';

    try {
        const result = await db.query(selectQuery);

        // Success: Send the rows array
        res.status(200).json(result.rows);

    } catch (error) {
        console.error('PostgreSQL Fetch Error:', error.message, error.stack);
        res.status(500).json({ message: 'Internal server error while fetching student data.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('API Endpoint: POST /api/register');
});