const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const db = require('../database');
const router = express.Router();

// All case log routes require authentication
router.use(authMiddleware);

// GET /api/caselogs - list current user's case logs
router.get('/', (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;
    let logs = db.getCaseLogs(req.user.userId);

    if (search) {
      const s = search.toLowerCase();
      logs = logs.filter(l =>
        l.procedureName.toLowerCase().includes(s) ||
        (l.diagnosis && l.diagnosis.toLowerCase().includes(s)) ||
        (l.hospital && l.hospital.toLowerCase().includes(s))
      );
    }

    if (startDate) logs = logs.filter(l => l.date >= startDate);
    if (endDate) logs = logs.filter(l => l.date <= endDate);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/caselogs/stats - aggregated statistics
router.get('/stats', (req, res) => {
  try {
    const logs = db.getCaseLogs(req.user.userId);

    const stats = {
      total: logs.length,
      totalHours: 0,
      byRole: {},
      byCategory: {},
      byMonth: {}
    };

    logs.forEach(log => {
      // By role
      stats.byRole[log.role] = (stats.byRole[log.role] || 0) + 1;

      // By category - lookup procedure
      const proc = db.getProcedure(log.procedureId);
      if (proc && proc.category) {
        stats.byCategory[proc.category] = (stats.byCategory[proc.category] || 0) + 1;
      }

      // By month
      if (log.date) {
        const month = log.date.substring(0, 7);
        stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
      }

      // Total hours
      if (log.duration_minutes) {
        stats.totalHours += log.duration_minutes / 60;
      }
    });

    stats.totalHours = Math.round(stats.totalHours * 10) / 10;

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/caselogs/:id
router.get('/:id', (req, res) => {
  try {
    const log = db.getCaseLog(req.params.id, req.user.userId);
    if (!log) return res.status(404).json({ error: 'Case log not found' });
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/caselogs
router.post('/', (req, res) => {
  try {
    const { procedureId, procedureName, date, role, supervisor, hospital, patientAge, patientSex, diagnosis, complications, outcome, notes, duration_minutes } = req.body;

    if (!procedureName || !date) {
      return res.status(400).json({ error: 'Procedure name and date are required' });
    }

    const id = db.createCaseLog({
      userId: req.user.userId,
      procedureId: procedureId || null,
      procedureName,
      date,
      role: role || 'observer',
      supervisor: supervisor || null,
      hospital: hospital || null,
      patientAge: patientAge || null,
      patientSex: patientSex || null,
      diagnosis: diagnosis || null,
      complications: complications || null,
      outcome: outcome || null,
      notes: notes || null,
      duration_minutes: duration_minutes || null
    });

    res.status(201).json({ id, message: 'Case log created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/caselogs/:id
router.put('/:id', (req, res) => {
  try {
    const success = db.updateCaseLog(req.params.id, req.user.userId, req.body);
    if (!success) return res.status(404).json({ error: 'Case log not found' });
    res.json({ message: 'Case log updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/caselogs/:id
router.delete('/:id', (req, res) => {
  try {
    const success = db.deleteCaseLog(req.params.id, req.user.userId);
    if (!success) return res.status(404).json({ error: 'Case log not found' });
    res.json({ message: 'Case log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
