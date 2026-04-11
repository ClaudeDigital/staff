const express = require('express');
const router = express.Router();
const db = require('../db');

// GET shifts with filters
router.get('/', (req, res) => {
  const { date, week, worker_id, location_id } = req.query;
  let where = [];
  let params = [];

  if (date) {
    where.push('s.date = ?');
    params.push(date);
  }
  if (week) {
    // week = YYYY-WW, get Mon-Sun
    const [year, weekNum] = week.split('-W');
    const jan4 = new Date(parseInt(year), 0, 4);
    const startOfWeek = new Date(jan4);
    startOfWeek.setDate(jan4.getDate() - jan4.getDay() + 1 + (parseInt(weekNum) - 1) * 7);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const fmt = (d) => d.toISOString().slice(0, 10);
    where.push('s.date >= ? AND s.date <= ?');
    params.push(fmt(startOfWeek), fmt(endOfWeek));
  }
  if (worker_id) {
    where.push('s.worker_id = ?');
    params.push(worker_id);
  }
  if (location_id) {
    where.push('s.location_id = ?');
    params.push(location_id);
  }

  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const shifts = db.prepare(`
    SELECT s.*, w.name as worker_name, w.phone as worker_phone,
           l.name as location_name, l.address as location_address
    FROM shifts s
    JOIN workers w ON s.worker_id = w.id
    JOIN locations l ON s.location_id = l.id
    ${whereStr}
    ORDER BY s.date ASC, s.start_time ASC
  `).all(...params);

  res.json(shifts);
});

// GET today's shifts
router.get('/today', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const shifts = db.prepare(`
    SELECT s.*, w.name as worker_name, w.phone as worker_phone,
           l.name as location_name, l.address as location_address
    FROM shifts s
    JOIN workers w ON s.worker_id = w.id
    JOIN locations l ON s.location_id = l.id
    WHERE s.date = ?
    ORDER BY s.start_time ASC
  `).all(today);
  res.json(shifts);
});

// GET week shifts (current week by default)
router.get('/week', (req, res) => {
  const targetDate = req.query.date ? new Date(req.query.date) : new Date();
  const day = targetDate.getDay();
  const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(targetDate.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d) => d.toISOString().slice(0, 10);
  const shifts = db.prepare(`
    SELECT s.*, w.name as worker_name, l.name as location_name, l.address as location_address
    FROM shifts s
    JOIN workers w ON s.worker_id = w.id
    JOIN locations l ON s.location_id = l.id
    WHERE s.date >= ? AND s.date <= ?
    ORDER BY s.date ASC, s.start_time ASC
  `).all(fmt(monday), fmt(sunday));

  res.json({ monday: fmt(monday), sunday: fmt(sunday), shifts });
});

// GET dashboard stats
router.get('/stats', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(new Date().setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const todayCount = db.prepare(
    "SELECT COUNT(*) as c FROM shifts WHERE date = ? AND status != 'cancelled'"
  ).get(today);

  const weekCount = db.prepare(
    "SELECT COUNT(*) as c FROM shifts WHERE date >= ? AND date <= ? AND status != 'cancelled'"
  ).get(fmt(monday), fmt(sunday));

  const activeWorkers = db.prepare(
    "SELECT COUNT(DISTINCT worker_id) as c FROM shifts WHERE date = ? AND status != 'cancelled'"
  ).get(today);

  const totalWorkers = db.prepare('SELECT COUNT(*) as c FROM workers').get();

  res.json({
    today_shifts: todayCount.c,
    week_shifts: weekCount.c,
    active_workers_today: activeWorkers.c,
    total_workers: totalWorkers.c,
    week_start: fmt(monday),
    week_end: fmt(sunday)
  });
});

// POST create shift
router.post('/', (req, res) => {
  const { worker_id, location_id, date, start_time, duration_hours, status, note } = req.body;
  if (!worker_id) return res.status(400).json({ error: 'Punëtori është i detyrueshëm' });
  if (!location_id) return res.status(400).json({ error: 'Lokacioni është i detyrueshëm' });
  if (!date) return res.status(400).json({ error: 'Data është e detyrueshme' });
  if (!start_time) return res.status(400).json({ error: 'Ora e fillimit është e detyrueshme' });
  if (!duration_hours || duration_hours <= 0) return res.status(400).json({ error: 'Kohëzgjatja duhet të jetë pozitive' });

  const result = db.prepare(`
    INSERT INTO shifts (worker_id, location_id, date, start_time, duration_hours, status, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(worker_id, location_id, date, start_time, parseFloat(duration_hours), status || 'planned', note || null);

  res.json({ id: result.lastInsertRowid });
});

// PUT update shift
router.put('/:id', (req, res) => {
  const { worker_id, location_id, date, start_time, duration_hours, status, note } = req.body;
  db.prepare(`
    UPDATE shifts SET worker_id=?, location_id=?, date=?, start_time=?, duration_hours=?, status=?, note=?
    WHERE id=?
  `).run(worker_id, location_id, date, start_time, parseFloat(duration_hours), status, note || null, req.params.id);

  res.json({ ok: true });
});

// PATCH update status only
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['planned', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Status i pavlefshëm' });
  }
  db.prepare('UPDATE shifts SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// DELETE shift
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM shifts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
