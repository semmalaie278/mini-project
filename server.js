const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',        // Change to your MySQL username
    password: '',        // Change to your MySQL password
    database: 'blood_bank'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.log('⚠️  Make sure MySQL is running and you have run database.sql');
        return;
    }
    console.log('✅ Connected to MySQL blood_bank database');
});

// ============================================================
// DASHBOARD STATS
// ============================================================
app.get('/api/stats', (req, res) => {
    const queries = {
        totalDonors: 'SELECT COUNT(*) AS count FROM donors',
        totalUnits: 'SELECT SUM(units_available) AS total FROM blood_stock',
        recentDonations: `
            SELECT d.donation_id, dn.donor_name, d.blood_group, d.donation_date, d.units_donated
            FROM donations d
            JOIN donors dn ON d.donor_id = dn.donor_id
            ORDER BY d.donation_date DESC
            LIMIT 5
        `
    };

    db.query(queries.totalDonors, (err, donorResult) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query(queries.totalUnits, (err, unitResult) => {
            if (err) return res.status(500).json({ error: err.message });
            db.query(queries.recentDonations, (err, recentResult) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    totalDonors: donorResult[0].count,
                    totalUnits: unitResult[0].total || 0,
                    recentDonations: recentResult
                });
            });
        });
    });
});

// ============================================================
// DONORS API
// ============================================================

// GET all donors
app.get('/api/donors', (req, res) => {
    const sql = 'SELECT * FROM donors ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// GET single donor
app.get('/api/donors/:id', (req, res) => {
    const sql = 'SELECT * FROM donors WHERE donor_id = ?';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Donor not found' });
        res.json(results[0]);
    });
});

// POST - Add new donor
app.post('/api/donors', (req, res) => {
    const { donor_name, age, gender, blood_group, phone_number, address, last_donation_date } = req.body;
    if (!donor_name || !age || !gender || !blood_group || !phone_number) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const sql = `INSERT INTO donors (donor_name, age, gender, blood_group, phone_number, address, last_donation_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [donor_name, age, gender, blood_group, phone_number, address || null, last_donation_date || null], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: '✅ Donor added successfully!', donor_id: result.insertId });
    });
});

// PUT - Update donor
app.put('/api/donors/:id', (req, res) => {
    const { donor_name, age, gender, blood_group, phone_number, address, last_donation_date } = req.body;
    const sql = `UPDATE donors SET donor_name=?, age=?, gender=?, blood_group=?, phone_number=?, address=?, last_donation_date=?
                 WHERE donor_id=?`;
    db.query(sql, [donor_name, age, gender, blood_group, phone_number, address, last_donation_date, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '✅ Donor updated successfully!' });
    });
});

// DELETE - Delete donor
app.delete('/api/donors/:id', (req, res) => {
    const sql = 'DELETE FROM donors WHERE donor_id = ?';
    db.query(sql, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '✅ Donor deleted successfully!' });
    });
});

// Search donors by blood group
app.get('/api/donors/search/:bloodGroup', (req, res) => {
    const sql = 'SELECT * FROM donors WHERE blood_group = ? ORDER BY last_donation_date DESC';
    db.query(sql, [req.params.bloodGroup], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ============================================================
// BLOOD STOCK API
// ============================================================

// GET all blood stock
app.get('/api/stock', (req, res) => {
    const sql = 'SELECT * FROM blood_stock ORDER BY blood_group';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// PUT - Update blood stock
app.put('/api/stock/:bloodGroup', (req, res) => {
    const { units_available } = req.body;
    const sql = 'UPDATE blood_stock SET units_available = ? WHERE blood_group = ?';
    db.query(sql, [units_available, req.params.bloodGroup], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '✅ Blood stock updated!' });
    });
});

// ============================================================
// DONATIONS API
// ============================================================

// GET all donations
app.get('/api/donations', (req, res) => {
    const sql = `
        SELECT d.donation_id, dn.donor_name, d.donor_id, d.blood_group, d.donation_date, d.units_donated
        FROM donations d
        JOIN donors dn ON d.donor_id = dn.donor_id
        ORDER BY d.donation_date DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// POST - Add new donation (also updates stock)
app.post('/api/donations', (req, res) => {
    const { donor_id, blood_group, donation_date, units_donated } = req.body;
    if (!donor_id || !blood_group || !donation_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const units = units_donated || 1;

    // Insert donation
    const insertSql = 'INSERT INTO donations (donor_id, blood_group, donation_date, units_donated) VALUES (?, ?, ?, ?)';
    db.query(insertSql, [donor_id, blood_group, donation_date, units], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        // Update stock
        const updateStockSql = 'UPDATE blood_stock SET units_available = units_available + ? WHERE blood_group = ?';
        db.query(updateStockSql, [units, blood_group], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });

            // Update last_donation_date in donors table
            const updateDonorSql = 'UPDATE donors SET last_donation_date = ? WHERE donor_id = ?';
            db.query(updateDonorSql, [donation_date, donor_id], () => {
                res.status(201).json({ message: '✅ Donation recorded and stock updated!', donation_id: result.insertId });
            });
        });
    });
});

// DELETE donation and revert stock
app.delete('/api/donations/:id', (req, res) => {
    const getSql = 'SELECT * FROM donations WHERE donation_id = ?';
    db.query(getSql, [req.params.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Donation not found' });
        const { blood_group, units_donated } = results[0];

        const deleteSql = 'DELETE FROM donations WHERE donation_id = ?';
        db.query(deleteSql, [req.params.id], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });

            const revertSql = 'UPDATE blood_stock SET units_available = GREATEST(0, units_available - ?) WHERE blood_group = ?';
            db.query(revertSql, [units_donated, blood_group], () => {
                res.json({ message: '✅ Donation deleted and stock adjusted!' });
            });
        });
    });
});

// Serve frontend for all other routes
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🩸 Blood Bank Server running at http://localhost:${PORT}`);
    console.log(`📋 Open your browser and go to: http://localhost:${PORT}\n`);
});
