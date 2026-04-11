const express = require('express');
const router = express.Router();
const db = require('../db');

// GET report with filters
router.get('/', (req, res) => {
  const { worker_id, location_id, date_from, date_to } = req.query;
  let where = ["s.status != 'cancelled'"];
  let params = [];

  if (worker_id) { where.push('s.worker_id = ?'); params.push(worker_id); }
  if (location_id) { where.push('s.location_id = ?'); params.push(location_id); }
  if (date_from) { where.push('s.date >= ?'); params.push(date_from); }
  if (date_to) { where.push('s.date <= ?'); params.push(date_to); }

  const whereStr = 'WHERE ' + where.join(' AND ');

  const rows = db.prepare(`
    SELECT s.id, s.date, s.start_time, s.duration_hours, s.status, s.note,
           w.id as worker_id, w.name as worker_name,
           l.id as location_id, l.name as location_name, l.address as location_address
    FROM shifts s
    JOIN workers w ON s.worker_id = w.id
    JOIN locations l ON s.location_id = l.id
    ${whereStr}
    ORDER BY s.date ASC, s.start_time ASC
  `).all(...params);

  const total_hours = rows.reduce((sum, r) => sum + (r.duration_hours || 0), 0);

  res.json({ rows, total_hours, count: rows.length });
});

module.exports = router;
