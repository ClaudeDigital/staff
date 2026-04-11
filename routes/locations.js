const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all locations
router.get('/', (req, res) => {
  const locations = db.prepare('SELECT * FROM locations ORDER BY name').all();
  res.json(locations);
});

// GET single location + visit history
router.get('/:id', (req, res) => {
  const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!location) return res.status(404).json({ error: 'Lokacioni nuk u gjet' });

  const visits = db.prepare(`
    SELECT s.*, w.name as worker_name, w.phone as worker_phone
    FROM shifts s
    JOIN workers w ON s.worker_id = w.id
    WHERE s.location_id = ?
    ORDER BY s.date DESC, s.start_time DESC
    LIMIT 100
  `).all(req.params.id);

  res.json({ ...location, visits });
});

// POST create location
router.post('/', (req, res) => {
  const { name, address, note } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Emri është i detyrueshëm' });
  if (!address || !address.trim()) return res.status(400).json({ error: 'Adresa është e detyrueshme' });

  const result = db.prepare(
    'INSERT INTO locations (name, address, note) VALUES (?, ?, ?)'
  ).run(name.trim(), address.trim(), note || null);

  res.json({ id: result.lastInsertRowid, name: name.trim(), address: address.trim(), note });
});

// PUT update location
router.put('/:id', (req, res) => {
  const { name, address, note } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Emri është i detyrueshëm' });
  if (!address || !address.trim()) return res.status(400).json({ error: 'Adresa është e detyrueshme' });

  db.prepare(
    'UPDATE locations SET name = ?, address = ?, note = ? WHERE id = ?'
  ).run(name.trim(), address.trim(), note || null, req.params.id);

  res.json({ ok: true });
});

// DELETE location
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
