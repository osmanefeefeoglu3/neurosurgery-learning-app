const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

// Initialize with empty data if file doesn't exist
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      procedures: [],
      users: [],
      caseLogs: [],
      nextProcedureId: 1,
      nextStepId: 1,
      nextUserId: 1,
      nextCaseLogId: 1
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  }
}

function readDB() {
  initDB();
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  // Backward compatibility migrations
  if (!data.users) data.users = [];
  if (!data.nextUserId) data.nextUserId = 1;
  if (!data.caseLogs) data.caseLogs = [];
  if (!data.nextCaseLogId) data.nextCaseLogId = 1;

  return data;
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Database operations
const db = {
  // ==================== PROCEDURES ====================

  getAllProcedures: (search = '', category = '') => {
    const data = readDB();
    let procedures = data.procedures;

    if (search) {
      const searchLower = search.toLowerCase();
      procedures = procedures.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        (p.description && p.description.toLowerCase().includes(searchLower)) ||
        (p.indications && p.indications.toLowerCase().includes(searchLower))
      );
    }

    if (category) {
      procedures = procedures.filter(p => p.category === category);
    }

    return procedures.sort((a, b) => a.name.localeCompare(b.name));
  },

  getProcedure: (id) => {
    const data = readDB();
    return data.procedures.find(p => p.id === parseInt(id));
  },

  createProcedure: (procedureData) => {
    const data = readDB();
    const newProcedure = {
      id: data.nextProcedureId++,
      name: procedureData.name,
      category: procedureData.category || null,
      description: procedureData.description || null,
      indications: procedureData.indications || null,
      contraindications: procedureData.contraindications || null,
      thumbnail_url: procedureData.thumbnail_url || null,
      steps: (procedureData.steps || []).map((step, index) => ({
        id: data.nextStepId++,
        step_number: index + 1,
        title: step.title || `Step ${index + 1}`,
        description: step.description || null,
        tips: step.tips || null,
        warnings: step.warnings || null,
        media: step.media || []
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.procedures.push(newProcedure);
    writeDB(data);
    return newProcedure.id;
  },

  updateProcedure: (id, procedureData) => {
    const data = readDB();
    const index = data.procedures.findIndex(p => p.id === parseInt(id));

    if (index === -1) return false;

    data.procedures[index] = {
      ...data.procedures[index],
      name: procedureData.name,
      category: procedureData.category || null,
      description: procedureData.description || null,
      indications: procedureData.indications || null,
      contraindications: procedureData.contraindications || null,
      thumbnail_url: procedureData.thumbnail_url || null,
      steps: (procedureData.steps || []).map((step, idx) => ({
        id: data.nextStepId++,
        step_number: idx + 1,
        title: step.title || `Step ${idx + 1}`,
        description: step.description || null,
        tips: step.tips || null,
        warnings: step.warnings || null,
        media: step.media || []
      })),
      updated_at: new Date().toISOString()
    };

    writeDB(data);
    return true;
  },

  deleteProcedure: (id) => {
    const data = readDB();
    const initialLength = data.procedures.length;
    data.procedures = data.procedures.filter(p => p.id !== parseInt(id));
    if (data.procedures.length === initialLength) return false;
    writeDB(data);
    return true;
  },

  getCategories: () => {
    const data = readDB();
    const categories = [...new Set(
      data.procedures.map(p => p.category).filter(c => c !== null)
    )];
    return categories.sort();
  },

  // ==================== USERS ====================

  getUserByUsername: (username) => {
    const data = readDB();
    return data.users.find(u => u.username === username);
  },

  getUserByEmail: (email) => {
    const data = readDB();
    return data.users.find(u => u.email === email);
  },

  getUserById: (id) => {
    const data = readDB();
    return data.users.find(u => u.id === parseInt(id));
  },

  createUser: (userData) => {
    const data = readDB();
    const newUser = {
      id: data.nextUserId++,
      username: userData.username,
      email: userData.email,
      passwordHash: userData.passwordHash,
      displayName: userData.displayName || userData.username,
      role: userData.role || 'resident',
      specialization: userData.specialization || 'neurosurgery',
      created_at: new Date().toISOString()
    };
    data.users.push(newUser);
    writeDB(data);
    return newUser.id;
  },

  // ==================== CASE LOGS ====================

  getCaseLogs: (userId) => {
    const data = readDB();
    return data.caseLogs
      .filter(l => l.userId === parseInt(userId))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },

  getCaseLog: (id, userId) => {
    const data = readDB();
    return data.caseLogs.find(l => l.id === parseInt(id) && l.userId === parseInt(userId));
  },

  createCaseLog: (logData) => {
    const data = readDB();
    const newLog = {
      id: data.nextCaseLogId++,
      userId: parseInt(logData.userId),
      procedureId: logData.procedureId ? parseInt(logData.procedureId) : null,
      procedureName: logData.procedureName,
      date: logData.date,
      role: logData.role || 'observer',
      supervisor: logData.supervisor || null,
      hospital: logData.hospital || null,
      patientAge: logData.patientAge || null,
      patientSex: logData.patientSex || null,
      diagnosis: logData.diagnosis || null,
      complications: logData.complications || null,
      outcome: logData.outcome || null,
      notes: logData.notes || null,
      duration_minutes: logData.duration_minutes ? parseInt(logData.duration_minutes) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.caseLogs.push(newLog);
    writeDB(data);
    return newLog.id;
  },

  updateCaseLog: (id, userId, logData) => {
    const data = readDB();
    const index = data.caseLogs.findIndex(l => l.id === parseInt(id) && l.userId === parseInt(userId));
    if (index === -1) return false;

    data.caseLogs[index] = {
      ...data.caseLogs[index],
      procedureId: logData.procedureId ? parseInt(logData.procedureId) : data.caseLogs[index].procedureId,
      procedureName: logData.procedureName || data.caseLogs[index].procedureName,
      date: logData.date || data.caseLogs[index].date,
      role: logData.role || data.caseLogs[index].role,
      supervisor: logData.supervisor !== undefined ? logData.supervisor : data.caseLogs[index].supervisor,
      hospital: logData.hospital !== undefined ? logData.hospital : data.caseLogs[index].hospital,
      patientAge: logData.patientAge !== undefined ? logData.patientAge : data.caseLogs[index].patientAge,
      patientSex: logData.patientSex !== undefined ? logData.patientSex : data.caseLogs[index].patientSex,
      diagnosis: logData.diagnosis !== undefined ? logData.diagnosis : data.caseLogs[index].diagnosis,
      complications: logData.complications !== undefined ? logData.complications : data.caseLogs[index].complications,
      outcome: logData.outcome !== undefined ? logData.outcome : data.caseLogs[index].outcome,
      notes: logData.notes !== undefined ? logData.notes : data.caseLogs[index].notes,
      duration_minutes: logData.duration_minutes !== undefined ? logData.duration_minutes : data.caseLogs[index].duration_minutes,
      updated_at: new Date().toISOString()
    };

    writeDB(data);
    return true;
  },

  deleteCaseLog: (id, userId) => {
    const data = readDB();
    const initialLength = data.caseLogs.length;
    data.caseLogs = data.caseLogs.filter(l => !(l.id === parseInt(id) && l.userId === parseInt(userId)));
    if (data.caseLogs.length === initialLength) return false;
    writeDB(data);
    return true;
  }
};

module.exports = db;
