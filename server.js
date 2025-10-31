// server.js
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db'); // Import the database pool setup

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());

// API Route for Registration
app.post('/api/register', async (req, res) => {
    console.log('--- RECEIVED /api/register REQUEST ---');
    const data = req.body;

    // 1. Server-Side Validation (Minimal Example)
    if (!data.studentName || !data.email || !data.mobile) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Check conditional fields
    if (data.standard === 'Other' && !data.standardOtherDetails) {
        return res.status(400).json({ message: 'Standard details are required when selecting "Other".' });
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
        data.address,
        data.email,
        data.mobile,
        data.dob,
        data.school,
        data.standard,
        // Conditional fields are safely passed as their current value (null/string)
        data.standard === 'Other' ? data.standardOtherDetails : null,
        data.board,
        data.board === 'Other' ? data.boardOtherDetails : null,
        // JSON.stringify() is necessary to convert the JS array/object to a valid JSON string for PostgreSQL
        JSON.stringify(data.programDetails || []),
    ];

    try {
        console.log("values::", values)
        console.log("insertQuery::", insertQuery)

        const result = await db.query(insertQuery, values);

        // Respond with the ID of the newly inserted student
        res.status(201).json({
            message: 'Registration successful!',
            id: result.rows[0].id
        });

    } catch (error) {
        console.error('PostgreSQL Registration error:', error.message);

        // Handle specific errors like duplicate email
        if (error.code === '23505') { // PostgreSQL unique violation error code
            return res.status(409).json({ message: 'Error: Email address already registered.' });
        }

        res.status(500).json({ message: 'Server error during registration.' });
    }
});

app.get('/api/students', async (req, res) => {
    // Select all columns from the students table
    const selectQuery = 'SELECT * FROM students ORDER BY id DESC;';

    try {
        const result = await db.query(selectQuery);

        // Success: Send the rows array
        res.status(200).json(result.rows);

    } catch (error) {
        console.error('PostgreSQL Fetch Error:', error.message);
        res.status(500).json({ message: 'Internal server error while fetching student data.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('API Endpoint: POST /api/register');
});