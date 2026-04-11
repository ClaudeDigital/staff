const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all workers
router.get('/', (req, res) => {
  const workers = db.prepare('SELECT * FROM workers ORDER BY name').all();
  res.json(workers);
});

// GET single worker + their shifts
router.get('/:id', (req, res) => {
  const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Punëtori nuk u gjet' });

  const shifts = db.prepare(`
    SELECT s.*, l.name as location_name, l.address as location_address
    FROM shifts s
    JOIN locations l ON s.location_id = l.id
    WHERE s.worker_id = ?
    ORDER BY s.date DESC, s.start_time DESC
    LIMIT 100
  `).all(req.params.id);

  // Hours this month
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
  const monthHours = db.prepare(`
    SELECT COALESCE(SUM(duration_hours), 0) as total
    FROM shifts
    WHERE worker_id = ? AND date >= ? AND date <= ? AND status != 'cancelled'
  `).get(req.params.id, monthStart, monthEnd);

  res.json({ ...worker, shifts, month_hours: monthHours.total });
});

// POST create worker
router.post('/', (req, res) => {
  const { name, phone, note } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Emri është i detyrueshëm' });

  const result = db.prepare(
    'INSERT INTO workers (name, phone, note) VALUES (?, ?, ?)'
  ).run(name.trim(), phone || null, note || null);

  res.json({ id: result.lastInsertRowid, name: name.trim(), phone, note });
});

// PUT update worker
router.put('/:id', (req, res) => {
  const { name, phone, note } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Emri është i detyrueshëm' });

  db.prepare(
    'UPDATE workers SET name = ?, phone = ?, note = ? WHERE id = ?'
  ).run(name.trim(), phone || null, note || null, req.params.id);

  res.json({ ok: true });
});

// DELETE worker
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM workers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// GET worker hours summary (all workers, this month)
router.get('/summary/month', (req, res) => {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;

  const summary = db.prepare(`
    SELECT w.id, w.name, w.phone,
           COALESCE(SUM(CASE WHEN s.status != 'cancelled' THEN s.duration_hours ELSE 0 END), 0) as month_hours,
           COUNT(CASE WHEN s.status != 'cancelled' THEN 1 END) as shift_count
    FROM workers w
    LEFT JOIN shifts s ON s.worker_id = w.id AND s.date >= ? AND s.date <= ?
    GROUP BY w.id
    ORDER BY w.name
  `).all(monthStart, monthEnd);

  res.json(summary);
});

module.exports = router;
