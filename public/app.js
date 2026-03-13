/* ============================================================
   Blood Bank App JS — Hybrid Mode (MySQL API + localStorage fallback)
   New donors are always saved & displayed, even without MySQL.
   ============================================================ */

const API = 'http://localhost:3000/api';

// ── Sample seed data ────────────────────────────────────────
const SEED_DONORS = [
    { donor_id: 1, donor_name: 'Arjun Kumar', age: 28, gender: 'Male', blood_group: 'O+', phone_number: '9876543210', address: '12, MG Road, Bangalore', last_donation_date: '2026-01-15', created_at: '2026-01-15T00:00:00Z' },
    { donor_id: 2, donor_name: 'Priya Sharma', age: 24, gender: 'Female', blood_group: 'A+', phone_number: '9876543211', address: '45, Park Street, Hyderabad', last_donation_date: '2026-02-10', created_at: '2026-02-10T00:00:00Z' },
    { donor_id: 3, donor_name: 'Rahul Mehta', age: 35, gender: 'Male', blood_group: 'B+', phone_number: '9876543212', address: '78, Civil Lines, Delhi', last_donation_date: '2026-01-28', created_at: '2026-01-28T00:00:00Z' },
    { donor_id: 4, donor_name: 'Anita Reddy', age: 30, gender: 'Female', blood_group: 'AB+', phone_number: '9876543213', address: '22, Jubilee Hills, Hyderabad', last_donation_date: '2026-03-01', created_at: '2026-03-01T00:00:00Z' },
    { donor_id: 5, donor_name: 'Vikram Singh', age: 27, gender: 'Male', blood_group: 'O-', phone_number: '9876543214', address: '5, Sector 18, Noida', last_donation_date: '2026-02-20', created_at: '2026-02-20T00:00:00Z' },
    { donor_id: 6, donor_name: 'Meera Nair', age: 22, gender: 'Female', blood_group: 'B-', phone_number: '9123456789', address: '10, Koramangala, Bangalore', last_donation_date: '2026-03-05', created_at: '2026-03-05T00:00:00Z' },
    { donor_id: 7, donor_name: 'Suresh Babu', age: 40, gender: 'Male', blood_group: 'A-', phone_number: '9234567891', address: '3, Adyar, Chennai', last_donation_date: '2026-02-14', created_at: '2026-02-14T00:00:00Z' },
    { donor_id: 8, donor_name: 'Kavitha Iyer', age: 31, gender: 'Female', blood_group: 'AB-', phone_number: '9345678912', address: '99, Anna Nagar, Chennai', last_donation_date: '2026-01-20', created_at: '2026-01-20T00:00:00Z' },
];

const SEED_STOCK = [
    { stock_id: 1, blood_group: 'A+', units_available: 4 },
    { stock_id: 2, blood_group: 'A-', units_available: 1 },
    { stock_id: 3, blood_group: 'B+', units_available: 6 },
    { stock_id: 4, blood_group: 'B-', units_available: 2 },
    { stock_id: 5, blood_group: 'AB+', units_available: 2 },
    { stock_id: 6, blood_group: 'AB-', units_available: 1 },
    { stock_id: 7, blood_group: 'O+', units_available: 5 },
    { stock_id: 8, blood_group: 'O-', units_available: 3 },
];

const SEED_DONATIONS = [
    { donation_id: 1, donor_id: 1, donor_name: 'Arjun Kumar', blood_group: 'O+', donation_date: '2026-01-15', units_donated: 1 },
    { donation_id: 2, donor_id: 2, donor_name: 'Priya Sharma', blood_group: 'A+', donation_date: '2026-02-10', units_donated: 1 },
    { donation_id: 3, donor_id: 3, donor_name: 'Rahul Mehta', blood_group: 'B+', donation_date: '2026-01-28', units_donated: 1 },
    { donation_id: 4, donor_id: 4, donor_name: 'Anita Reddy', blood_group: 'AB+', donation_date: '2026-03-01', units_donated: 1 },
    { donation_id: 5, donor_id: 5, donor_name: 'Vikram Singh', blood_group: 'O-', donation_date: '2026-02-20', units_donated: 1 },
];

// ── localStorage helpers ─────────────────────────────────────
const LS = {
    get: (k) => JSON.parse(localStorage.getItem(k) || 'null'),
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
    init: () => {
        if (!LS.get('bb_donors')) LS.set('bb_donors', SEED_DONORS);
        if (!LS.get('bb_stock')) LS.set('bb_stock', SEED_STOCK);
        if (!LS.get('bb_donations')) LS.set('bb_donations', SEED_DONATIONS);
        if (!LS.get('bb_next_id')) LS.set('bb_next_id', SEED_DONORS.length + 1);
    }
};

// ── State ────────────────────────────────────────────────────
let useLocalMode = false;   // flips to true when MySQL not reachable
let allDonors = [];

// ── API wrapper with localStorage fallback ───────────────────
async function apiGet(endpoint) {
    try {
        const r = await fetch(API + endpoint);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        useLocalMode = false;
        return await r.json();
    } catch {
        useLocalMode = true;
        return localGet(endpoint);
    }
}

async function apiPost(endpoint, body) {
    try {
        const r = await fetch(API + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        useLocalMode = false;
        return { ok: true, data: await r.json() };
    } catch {
        useLocalMode = true;
        return { ok: true, data: localPost(endpoint, body) };
    }
}

async function apiPut(endpoint, body) {
    try {
        const r = await fetch(API + endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        useLocalMode = false;
        return { ok: true, data: await r.json() };
    } catch {
        useLocalMode = true;
        return { ok: true, data: localPut(endpoint, body) };
    }
}

async function apiDelete(endpoint) {
    try {
        const r = await fetch(API + endpoint, { method: 'DELETE' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        useLocalMode = false;
        return { ok: true, data: await r.json() };
    } catch {
        useLocalMode = true;
        return { ok: true, data: localDelete(endpoint) };
    }
}

// ── Local (localStorage) CRUD ────────────────────────────────
function localGet(endpoint) {
    if (endpoint === '/stats') {
        const donors = LS.get('bb_donors') || [];
        const stock = LS.get('bb_stock') || [];
        const donations = LS.get('bb_donations') || [];
        const totalUnits = stock.reduce((s, b) => s + b.units_available, 0);
        const recent = [...donations].sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date)).slice(0, 5);
        return { totalDonors: donors.length, totalUnits, recentDonations: recent };
    }
    if (endpoint === '/donors') return [...(LS.get('bb_donors') || [])].reverse();
    if (endpoint === '/stock') return LS.get('bb_stock') || [];
    if (endpoint === '/donations') return [...(LS.get('bb_donations') || [])].sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date));

    // /donors/:id
    if (endpoint.startsWith('/donors/search/')) {
        const bg = decodeURIComponent(endpoint.split('/donors/search/')[1]);
        return (LS.get('bb_donors') || []).filter(d => d.blood_group === bg);
    }
    if (endpoint.startsWith('/donors/')) {
        const id = parseInt(endpoint.split('/')[2]);
        return (LS.get('bb_donors') || []).find(d => d.donor_id === id) || null;
    }
    return [];
}

function localPost(endpoint, body) {
    if (endpoint === '/donors') {
        const donors = LS.get('bb_donors') || [];
        const id = LS.get('bb_next_id') || (donors.length + 1);
        const donor = { donor_id: id, ...body, created_at: new Date().toISOString() };
        donors.push(donor);
        LS.set('bb_donors', donors);
        LS.set('bb_next_id', id + 1);
        return { message: '✅ Donor added successfully!', donor_id: id };
    }
    if (endpoint === '/donations') {
        const donations = LS.get('bb_donations') || [];
        const donors = LS.get('bb_donors') || [];
        const stock = LS.get('bb_stock') || [];
        const id = donations.length + 1;
        const dn = donors.find(d => d.donor_id === parseInt(body.donor_id));
        const don = { donation_id: id, donor_name: dn ? dn.donor_name : 'Unknown', ...body };
        donations.push(don);
        LS.set('bb_donations', donations);
        // update stock
        const si = stock.findIndex(s => s.blood_group === body.blood_group);
        if (si !== -1) stock[si].units_available += (body.units_donated || 1);
        LS.set('bb_stock', stock);
        // update donor last_donation_date
        const di = donors.findIndex(d => d.donor_id === parseInt(body.donor_id));
        if (di !== -1) donors[di].last_donation_date = body.donation_date;
        LS.set('bb_donors', donors);
        return { message: '✅ Donation recorded!', donation_id: id };
    }
    return {};
}

function localPut(endpoint, body) {
    if (endpoint.startsWith('/donors/')) {
        const id = parseInt(endpoint.split('/')[2]);
        const donors = LS.get('bb_donors') || [];
        const idx = donors.findIndex(d => d.donor_id === id);
        if (idx !== -1) { donors[idx] = { ...donors[idx], ...body }; LS.set('bb_donors', donors); }
        return { message: '✅ Donor updated!' };
    }
    if (endpoint.startsWith('/stock/')) {
        const bg = decodeURIComponent(endpoint.split('/stock/')[1]);
        const stock = LS.get('bb_stock') || [];
        const idx = stock.findIndex(s => s.blood_group === bg);
        if (idx !== -1) { stock[idx].units_available = body.units_available; LS.set('bb_stock', stock); }
        return { message: '✅ Stock updated!' };
    }
    return {};
}

function localDelete(endpoint) {
    if (endpoint.startsWith('/donors/')) {
        const id = parseInt(endpoint.split('/donors/')[1]);
        let donors = LS.get('bb_donors') || [];
        donors = donors.filter(d => d.donor_id !== id);
        LS.set('bb_donors', donors);
        // also remove their donations
        let donations = LS.get('bb_donations') || [];
        donations = donations.filter(d => d.donor_id !== id);
        LS.set('bb_donations', donations);
        return { message: '✅ Donor deleted!' };
    }
    if (endpoint.startsWith('/donations/')) {
        const id = parseInt(endpoint.split('/donations/')[1]);
        let donations = LS.get('bb_donations') || [];
        const target = donations.find(d => d.donation_id === id);
        donations = donations.filter(d => d.donation_id !== id);
        LS.set('bb_donations', donations);
        // revert stock
        if (target) {
            const stock = LS.get('bb_stock') || [];
            const si = stock.findIndex(s => s.blood_group === target.blood_group);
            if (si !== -1) stock[si].units_available = Math.max(0, stock[si].units_available - (target.units_donated || 1));
            LS.set('bb_stock', stock);
        }
        return { message: '✅ Donation deleted!' };
    }
    return {};
}

// ── Mode badge ───────────────────────────────────────────────
function updateModeBadge() {
    const dot = document.getElementById('db-status-dot');
    const label = document.getElementById('db-status-text');
    if (useLocalMode) {
        dot.className = 'status-dot';
        dot.style.background = '#F59E0B';
        dot.style.boxShadow = '0 0 8px #F59E0B';
        label.textContent = 'Local Mode (No MySQL)';
    } else {
        dot.className = 'status-dot online';
        dot.style.background = '';
        dot.style.boxShadow = '';
        label.textContent = 'MySQL Connected';
    }
}

// ============================================================
// NAVIGATION
// ============================================================
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    const nav = document.getElementById(`nav-${page}`);
    if (target) target.classList.add('active');
    if (nav) nav.classList.add('active');

    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'donors': loadDonorTable(); break;
        case 'stock': loadBloodStock(); break;
        case 'history': loadDonationHistory(); break;
        case 'add-donation': loadDonorDropdown(); break;
    }
    document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// ============================================================
// DB STATUS CHECK
// ============================================================
async function checkDbStatus() {
    try {
        const r = await fetch(`${API}/stats`);
        useLocalMode = !r.ok;
    } catch {
        useLocalMode = true;
    }
    updateModeBadge();
}

// ============================================================
// DASHBOARD
// ============================================================
let donorChartInstance = null;

async function loadDashboard() {
    const stats = await apiGet('/stats');
    const stock = await apiGet('/stock');
    const donations = await apiGet('/donations');
    const donors = await apiGet('/donors');
    updateModeBadge();

    document.getElementById('stat-donors').textContent = stats.totalDonors;
    document.getElementById('stat-units').textContent = stats.totalUnits;
    document.getElementById('stat-donations').textContent = donations.length;
    const critical = stock.filter(s => s.units_available < 3).length;
    document.getElementById('stat-critical').textContent = critical;

    // Recent donations table
    const tbody = document.getElementById('recent-donations-table');
    const recent = stats.recentDonations || [];
    tbody.innerHTML = recent.length === 0
        ? '<tr><td colspan="4" class="loading-row">No donations recorded yet</td></tr>'
        : recent.map(d => `
            <tr>
                <td>${d.donor_name}</td>
                <td><span class="bg-badge">${d.blood_group}</span></td>
                <td>${formatDate(d.donation_date)}</td>
                <td>${d.units_donated} unit${d.units_donated > 1 ? 's' : ''}</td>
            </tr>`).join('');

    // Blood availability chips
    document.getElementById('blood-groups-dashboard').innerHTML = stock.map(s => `
        <div class="blood-group-chip ${s.units_available < 3 ? 'low' : ''}">
            <div class="bg-label">${s.blood_group}</div>
            <div class="bg-units">${s.units_available} units</div>
        </div>`).join('');

    // Render Chart
    const bgCounts = { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 };
    donors.forEach(d => {
        if (bgCounts[d.blood_group] !== undefined) {
            bgCounts[d.blood_group]++;
        }
    });

    const canvas = document.getElementById('donorChart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (donorChartInstance) {
            donorChartInstance.destroy();
        }

        donorChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(bgCounts),
                datasets: [{
                    label: 'Donors',
                    data: Object.values(bgCounts),
                    backgroundColor: [
                        '#D72638', '#F46036', '#2E294E', '#1B998B',
                        '#C5D86D', '#FF9F1C', '#2EC4B6', '#E71D36'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

// ============================================================
// DONORS TABLE
// ============================================================
async function loadDonorTable() {
    const tbody = document.getElementById('donors-table-body');
    tbody.innerHTML = '<tr><td colspan="8" class="loading-row">Loading donors...</td></tr>';
    allDonors = await apiGet('/donors');
    updateModeBadge();
    renderDonorTable(allDonors);
}

function renderDonorTable(donors) {
    const tbody = document.getElementById('donors-table-body');
    const badge = document.getElementById('donor-count-badge');
    if (badge) badge.textContent = donors ? `${donors.length} total` : '';
    if (!donors || donors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-row">No donors found</td></tr>';
        return;
    }
    tbody.innerHTML = donors.map((d, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${d.donor_name}</strong></td>
            <td>${d.age}</td>
            <td>${d.gender}</td>
            <td><span class="bg-badge">${d.blood_group}</span></td>
            <td>${d.phone_number}</td>
            <td>${d.last_donation_date ? formatDate(d.last_donation_date) : '\u2014'}</td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-edit" onclick="openEditModal(${d.donor_id})">\u270f\ufe0f Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteDonor(${d.donor_id}, '${escapeHtml(d.donor_name)}')">\uD83D\uDDD1</button>
                </div>
            </td>
        </tr>`).join('');
}

function filterDonorTable(query) {
    const q = query.toLowerCase();
    renderDonorTable(allDonors.filter(d =>
        d.donor_name.toLowerCase().includes(q) || d.blood_group.toLowerCase().includes(q)
    ));
}

// ============================================================
// DOWNLOAD FUNCTIONS
// ============================================================
function downloadDonorsCSV() {
    if (!allDonors || allDonors.length === 0) {
        showToast('No donor data to download', 'error');
        return;
    }
    const headers = ['#', 'Name', 'Age', 'Gender', 'Blood Group', 'Phone', 'Address', 'Last Donation Date'];
    const rows = allDonors.map((d, i) => [
        i + 1,
        csvCell(d.donor_name),
        d.age,
        d.gender,
        d.blood_group,
        csvCell(d.phone_number),
        csvCell(d.address || ''),
        d.last_donation_date ? d.last_donation_date.split('T')[0] : ''
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });  // BOM for Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `blood_bank_donors_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`\u2705 Downloaded ${allDonors.length} donors as CSV`, 'success');
}

function downloadDonorsJSON() {
    if (!allDonors || allDonors.length === 0) {
        showToast('No donor data to download', 'error');
        return;
    }
    const clean = allDonors.map(d => ({
        id: d.donor_id,
        name: d.donor_name,
        age: d.age,
        gender: d.gender,
        blood_group: d.blood_group,
        phone: d.phone_number,
        address: d.address || '',
        last_donation: d.last_donation_date ? d.last_donation_date.split('T')[0] : null
    }));
    const json = JSON.stringify({ exported_at: new Date().toISOString(), total: clean.length, donors: clean }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `blood_bank_donors_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`\u2705 Downloaded ${allDonors.length} donors as JSON`, 'success');
}

function csvCell(val) {
    // Wrap value in quotes and escape internal quotes
    const str = String(val || '').replace(/"/g, '""');
    return `"${str}"`;
}

function downloadDonorsPDF() {
    if (!allDonors || allDonors.length === 0) {
        showToast('No donor data to generate PDF', 'error');
        return;
    }

    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const bgCount = {};
    allDonors.forEach(d => { bgCount[d.blood_group] = (bgCount[d.blood_group] || 0) + 1; });

    const summaryRows = Object.entries(bgCount)
        .sort((a, b) => b[1] - a[1])
        .map(([bg, count]) => `<tr><td>${bg}</td><td>${count}</td></tr>`).join('');

    const donorRows = allDonors.map((d, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${d.donor_name}</td>
            <td>${d.age}</td>
            <td>${d.gender}</td>
            <td class="bg-cell">${d.blood_group}</td>
            <td>${d.phone_number}</td>
            <td>${d.address || '—'}</td>
            <td>${d.last_donation_date ? d.last_donation_date.split('T')[0] : '—'}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Blood Bank Donor Report — ${today}</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 32px; font-size: 13px; }

        /* HEADER */
        .header { display:flex; align-items:center; gap:16px; border-bottom: 3px solid #D72638; padding-bottom: 16px; margin-bottom: 24px; }
        .header-icon { font-size: 40px; }
        .header-title { font-size: 22px; font-weight: 800; color: #D72638; letter-spacing: -0.4px; }
        .header-sub { font-size: 12px; color: #666; margin-top: 3px; }
        .header-meta { margin-left:auto; text-align:right; font-size: 12px; color: #555; }
        .header-meta strong { display:block; font-size:14px; color:#D72638; }

        /* SUMMARY */
        .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #D72638; margin: 20px 0 10px; border-left: 4px solid #D72638; padding-left: 10px; }
        .summary-grid { display: grid; grid-template-columns: repeat(4,1fr); gap:10px; margin-bottom: 24px; }
        .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; text-align:center; }
        .summary-card .bg { font-size:18px; font-weight:800; color:#D72638; }
        .summary-card .cnt { font-size:12px; color:#555; margin-top:2px; }

        /* STATS ROW */
        .stats-row { display:flex; gap:20px; margin-bottom:24px; }
        .stat-box { flex:1; background:#fff5f5; border: 1px solid #fca5a5; border-radius:8px; padding:14px; text-align:center; }
        .stat-box .val { font-size:28px; font-weight:800; color:#D72638; }
        .stat-box .lbl { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.6px; margin-top:2px; }

        /* TABLE */
        table { width:100%; border-collapse:collapse; margin-top:4px; }
        thead th { background: #D72638; color:#fff; padding:10px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
        tbody tr:nth-child(even) { background: #fef2f2; }
        tbody tr:hover { background: #fee2e2; }
        tbody td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; vertical-align:middle; }
        .bg-cell { font-weight:800; color:#D72638; background:rgba(215,38,56,0.08); border-radius:4px; text-align:center; }

        /* FOOTER */
        .footer { margin-top:28px; padding-top:14px; border-top:1px solid #e5e7eb; font-size:11px; color:#aaa; display:flex; justify-content:space-between; }

        @media print {
            body { padding: 16px; }
            .no-print { display:none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-icon">🩸</div>
        <div>
            <div class="header-title">Blood Bank Management System</div>
            <div class="header-sub">Official Donor Registry Report</div>
        </div>
        <div class="header-meta">
            <strong>Generated: ${today}</strong>
            Total Records: ${allDonors.length}
        </div>
    </div>

    <div class="stats-row">
        <div class="stat-box"><div class="val">${allDonors.length}</div><div class="lbl">Total Donors</div></div>
        <div class="stat-box"><div class="val">${allDonors.filter(d => d.gender === 'Male').length}</div><div class="lbl">Male</div></div>
        <div class="stat-box"><div class="val">${allDonors.filter(d => d.gender === 'Female').length}</div><div class="lbl">Female</div></div>
        <div class="stat-box"><div class="val">${Object.keys(bgCount).length}</div><div class="lbl">Blood Groups</div></div>
    </div>

    <div class="section-title">Blood Group Summary</div>
    <div class="summary-grid">
        ${Object.entries(bgCount).sort((a, b) => b[1] - a[1]).map(([bg, cnt]) => `
        <div class="summary-card"><div class="bg">${bg}</div><div class="cnt">${cnt} donor${cnt > 1 ? 's' : ''}</div></div>`).join('')}
    </div>

    <div class="section-title">Complete Donor List</div>
    <table>
        <thead>
            <tr>
                <th>#</th><th>Full Name</th><th>Age</th><th>Gender</th>
                <th>Blood Group</th><th>Phone</th><th>Address</th><th>Last Donation</th>
            </tr>
        </thead>
        <tbody>${donorRows}</tbody>
    </table>

    <div class="footer">
        <span>🩸 Blood Bank Management System — Confidential</span>
        <span>Report Date: ${today}</span>
    </div>

    <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1000,height=700');
    win.document.write(html);
    win.document.close();
    showToast(`✅ PDF report ready — Save as PDF in the print dialog!`, 'success');
}


// ============================================================
// REGISTER DONOR
// ============================================================
document.getElementById('add-donor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateRegForm()) return;

    const data = {
        donor_name: document.getElementById('reg-name').value.trim(),
        age: parseInt(document.getElementById('reg-age').value),
        gender: document.getElementById('reg-gender').value,
        blood_group: document.getElementById('reg-blood').value,
        phone_number: document.getElementById('reg-phone').value.trim(),
        address: document.getElementById('reg-address').value.trim(),
        last_donation_date: document.getElementById('reg-date').value || null
    };

    const { ok, data: result } = await apiPost('/donors', data);
    if (ok) {
        showToast('🎉 Donor registered successfully!', 'success');
        clearRegForm();
        // immediately show in donor table
        setTimeout(() => navigateTo('donors'), 800);
    } else {
        showToast('Registration failed — please try again', 'error');
    }
    updateModeBadge();
});

function validateRegForm() {
    let valid = true;
    ['err-name', 'err-age', 'err-gender', 'err-blood', 'err-phone'].forEach(id => document.getElementById(id).textContent = '');
    const name = document.getElementById('reg-name').value.trim();
    const age = parseInt(document.getElementById('reg-age').value);
    const gender = document.getElementById('reg-gender').value;
    const blood = document.getElementById('reg-blood').value;
    const phone = document.getElementById('reg-phone').value.trim();
    if (!name || name.length < 2) { document.getElementById('err-name').textContent = 'Please enter a valid name'; valid = false; }
    if (!age || age < 18 || age > 65) { document.getElementById('err-age').textContent = 'Age must be 18–65'; valid = false; }
    if (!gender) { document.getElementById('err-gender').textContent = 'Please select a gender'; valid = false; }
    if (!blood) { document.getElementById('err-blood').textContent = 'Please select a blood group'; valid = false; }
    if (!/^\d{10}$/.test(phone)) { document.getElementById('err-phone').textContent = 'Enter a valid 10-digit number'; valid = false; }
    return valid;
}

function clearRegForm() {
    ['reg-name', 'reg-age', 'reg-address', 'reg-phone', 'reg-date'].forEach(id => document.getElementById(id).value = '');
    ['reg-gender', 'reg-blood'].forEach(id => document.getElementById(id).selectedIndex = 0);
    ['err-name', 'err-age', 'err-gender', 'err-blood', 'err-phone'].forEach(id => document.getElementById(id).textContent = '');
}

// ============================================================
// EDIT DONOR MODAL
// ============================================================
async function openEditModal(id) {
    let d;
    if (useLocalMode) {
        d = localGet(`/donors/${id}`);
    } else {
        try { d = await (await fetch(`${API}/donors/${id}`)).json(); } catch { d = localGet(`/donors/${id}`); }
    }
    if (!d) { showToast('Donor not found', 'error'); return; }
    document.getElementById('edit-donor-id').value = d.donor_id;
    document.getElementById('edit-name').value = d.donor_name;
    document.getElementById('edit-age').value = d.age;
    document.getElementById('edit-gender').value = d.gender;
    document.getElementById('edit-blood-group').value = d.blood_group;
    document.getElementById('edit-phone').value = d.phone_number;
    document.getElementById('edit-address').value = d.address || '';
    document.getElementById('edit-donation-date').value = d.last_donation_date ? d.last_donation_date.split('T')[0] : '';
    document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
}

document.getElementById('edit-donor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-donor-id').value;
    const data = {
        donor_name: document.getElementById('edit-name').value.trim(),
        age: parseInt(document.getElementById('edit-age').value),
        gender: document.getElementById('edit-gender').value,
        blood_group: document.getElementById('edit-blood-group').value,
        phone_number: document.getElementById('edit-phone').value.trim(),
        address: document.getElementById('edit-address').value.trim(),
        last_donation_date: document.getElementById('edit-donation-date').value || null
    };
    const { ok } = await apiPut(`/donors/${id}`, data);
    if (ok) {
        showToast('✅ Donor updated!', 'success');
        closeModal();
        loadDonorTable();
    } else {
        showToast('Update failed', 'error');
    }
    updateModeBadge();
});

// ============================================================
// DELETE DONOR
// ============================================================
async function deleteDonor(id, name) {
    if (!confirm(`Delete donor "${name}"?\nThis will also remove their donation history.`)) return;
    const { ok, data: result } = await apiDelete(`/donors/${id}`);
    if (ok) {
        showToast(`🗑️ ${result.message}`, 'success');
        loadDonorTable();
    } else {
        showToast('Delete failed', 'error');
    }
    updateModeBadge();
}

// ============================================================
// BLOOD STOCK
// ============================================================
async function loadBloodStock() {
    const stock = await apiGet('/stock');
    updateModeBadge();
    document.getElementById('blood-stock-cards').innerHTML = stock.map(s => {
        let cls = 'ok', label = '✅ Normal';
        if (s.units_available < 3) { cls = 'low'; label = '⚠️ Critical'; }
        if (s.units_available >= 10) { cls = 'high'; label = '✅ Adequate'; }
        return `
            <div class="stock-card ${cls}">
                <div class="stock-blood-group">${s.blood_group}</div>
                <div class="stock-units">${s.units_available}</div>
                <div class="stock-label">Units Available</div>
                <span class="stock-status ${s.units_available < 3 ? 'critical' : s.units_available >= 10 ? 'adequate' : 'normal'}">${label}</span>
            </div>`;
    }).join('');
}

document.getElementById('update-stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bg = document.getElementById('stock-blood-group').value;
    const units = document.getElementById('stock-units').value;
    if (!bg || units === '') { showToast('Please fill all fields', 'error'); return; }
    const { ok } = await apiPut(`/stock/${encodeURIComponent(bg)}`, { units_available: parseInt(units) });
    if (ok) {
        showToast(`✅ Stock for ${bg} updated!`, 'success');
        loadBloodStock();
        document.getElementById('update-stock-form').reset();
    }
    updateModeBadge();
});

// ============================================================
// SEARCH
// ============================================================
async function searchByBloodGroup(bg) {
    document.querySelectorAll('.bg-btn').forEach(b => b.classList.toggle('active', b.textContent.trim() === bg));
    const tbody = document.getElementById('search-results-body');
    const info = document.getElementById('search-result-info');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Searching...</td></tr>';
    const donors = await apiGet(`/donors/search/${encodeURIComponent(bg)}`);
    updateModeBadge();
    info.textContent = `Found ${donors.length} donor${donors.length !== 1 ? 's' : ''} with blood group ${bg}`;
    tbody.innerHTML = donors.length === 0
        ? `<tr><td colspan="7" class="loading-row">No donors found for blood group ${bg}</td></tr>`
        : donors.map((d, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${d.donor_name}</strong></td>
                <td>${d.age}</td>
                <td>${d.gender}</td>
                <td><span class="bg-badge">${d.blood_group}</span></td>
                <td>${d.phone_number}</td>
                <td>${d.last_donation_date ? formatDate(d.last_donation_date) : '—'}</td>
            </tr>`).join('');
}

async function clearSearchActive() {
    document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
    const tbody = document.getElementById('search-results-body');
    const info = document.getElementById('search-result-info');
    const donors = await apiGet('/donors');
    updateModeBadge();
    info.textContent = `Showing all ${donors.length} donors`;
    tbody.innerHTML = donors.map((d, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${d.donor_name}</strong></td>
            <td>${d.age}</td>
            <td>${d.gender}</td>
            <td><span class="bg-badge">${d.blood_group}</span></td>
            <td>${d.phone_number}</td>
            <td>${d.last_donation_date ? formatDate(d.last_donation_date) : '—'}</td>
        </tr>`).join('');
}

// ============================================================
// DONATION HISTORY
// ============================================================
async function loadDonationHistory() {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Loading...</td></tr>';
    const donations = await apiGet('/donations');
    updateModeBadge();
    tbody.innerHTML = donations.length === 0
        ? '<tr><td colspan="6" class="loading-row">No donations recorded</td></tr>'
        : donations.map((d, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${d.donor_name}</strong></td>
                <td><span class="bg-badge">${d.blood_group}</span></td>
                <td>${formatDate(d.donation_date)}</td>
                <td>${d.units_donated} unit${d.units_donated > 1 ? 's' : ''}</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteDonation(${d.donation_id})">🗑 Delete</button></td>
            </tr>`).join('');
}

async function deleteDonation(id) {
    if (!confirm('Delete this donation? Blood stock will be adjusted.')) return;
    const { ok, data: result } = await apiDelete(`/donations/${id}`);
    if (ok) { showToast(result.message, 'success'); loadDonationHistory(); }
    else showToast('Delete failed', 'error');
    updateModeBadge();
}

// ============================================================
// ADD DONATION
// ============================================================
async function loadDonorDropdown() {
    const select = document.getElementById('donation-donor-id');
    select.innerHTML = '<option value="">— Select Donor —</option>';
    const donors = await apiGet('/donors');
    updateModeBadge();
    [...donors].reverse().forEach(d => {   // show newest first
        const opt = document.createElement('option');
        opt.value = d.donor_id;
        opt.textContent = `${d.donor_name} (${d.blood_group})`;
        opt.dataset.bg = d.blood_group;
        select.appendChild(opt);
    });
}

document.getElementById('donation-donor-id').addEventListener('change', function () {
    const sel = this.options[this.selectedIndex];
    if (sel.dataset.bg) document.getElementById('donation-blood-group').value = sel.dataset.bg;
});

document.getElementById('add-donation-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('err-donor').textContent = '';
    const donor_id = document.getElementById('donation-donor-id').value;
    const blood_group = document.getElementById('donation-blood-group').value;
    const donation_date = document.getElementById('donation-date').value;
    const units_donated = parseInt(document.getElementById('donation-units').value) || 1;
    if (!donor_id) { document.getElementById('err-donor').textContent = 'Please select a donor'; return; }
    if (!blood_group || !donation_date) { showToast('Fill all required fields', 'error'); return; }

    const { ok, data: result } = await apiPost('/donations', { donor_id: parseInt(donor_id), blood_group, donation_date, units_donated });
    if (ok) {
        showToast('💉 ' + result.message, 'success');
        document.getElementById('add-donation-form').reset();
        document.getElementById('donation-date').valueAsDate = new Date();
        setTimeout(() => navigateTo('history'), 900);
    } else {
        showToast('Failed to add donation', 'error');
    }
    updateModeBadge();
});

// ============================================================
// UTILS
// ============================================================
function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
});

// Nav click listeners
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(item.dataset.page);
    });
});

// Set today as default donation date
document.getElementById('donation-date').valueAsDate = new Date();

// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    LS.init();            // seed localStorage with sample data if empty
    checkDbStatus();      // detect MySQL vs local mode
    navigateTo('dashboard');
});
