const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const { optionalAuth, authMiddleware } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const caseLogRoutes = require('./routes/caselogs');
const atlasRoutes = require('./routes/atlas');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============== AUTH ROUTES ==============
app.use('/api/auth', authRoutes);

// ============== PROCEDURES API ==============

// Get all procedures (public, optional auth)
app.get('/api/procedures', optionalAuth, (req, res) => {
  try {
    const { search, category } = req.query;
    const procedures = db.getAllProcedures(search || '', category || '');
    res.json(procedures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single procedure with steps (public)
app.get('/api/procedures/:id', (req, res) => {
  try {
    const procedure = db.getProcedure(req.params.id);
    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }
    res.json(procedure);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new procedure (requires auth)
app.post('/api/procedures', authMiddleware, (req, res) => {
  try {
    const { name, category, description, indications, contraindications, thumbnail_url, steps } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Procedure name is required' });
    }
    const procedureId = db.createProcedure({ name, category, description, indications, contraindications, thumbnail_url, steps });
    res.status(201).json({ id: procedureId, message: 'Procedure created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update procedure (requires auth)
app.put('/api/procedures/:id', authMiddleware, (req, res) => {
  try {
    const { name, category, description, indications, contraindications, thumbnail_url, steps } = req.body;
    const success = db.updateProcedure(req.params.id, { name, category, description, indications, contraindications, thumbnail_url, steps });
    if (!success) {
      return res.status(404).json({ error: 'Procedure not found' });
    }
    res.json({ message: 'Procedure updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete procedure (requires auth)
app.delete('/api/procedures/:id', authMiddleware, (req, res) => {
  try {
    const success = db.deleteProcedure(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Procedure not found' });
    }
    res.json({ message: 'Procedure deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all categories (public)
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.getCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== CASE LOGS ==============
app.use('/api/caselogs', caseLogRoutes);

// ============== ANATOMY ATLAS ==============
app.use('/api/atlas', atlasRoutes);

// Serve the main page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Neurosurgery Learning App running at http://localhost:${PORT}`);
});
