const express = require('express');
const bcrypt = require('bcryptjs');
const { authMiddleware, generateToken } = require('../middleware/auth');
const db = require('../database');
const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName, role, specialization } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check existing
    if (db.getUserByUsername(username)) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    if (db.getUserByEmail(email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = db.createUser({
      username,
      email,
      passwordHash,
      displayName: displayName || username,
      role: role || 'resident',
      specialization: specialization || 'neurosurgery'
    });

    const user = db.getUserById(userId);
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = db.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role, email: user.email, specialization: user.specialization });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
