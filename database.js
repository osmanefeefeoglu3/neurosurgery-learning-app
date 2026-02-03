const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

// Initialize with empty data if file doesn't exist
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      procedures: [],
      nextProcedureId: 1,
      nextStepId: 1
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  }
}

function readDB() {
  initDB();
  const data = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(data);
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Database operations
const db = {
  // Get all procedures with optional filtering
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

  // Get single procedure by ID
  getProcedure: (id) => {
    const data = readDB();
    return data.procedures.find(p => p.id === parseInt(id));
  },

  // Create new procedure
  createProcedure: (procedureData) => {
    const data = readDB();
    const newProcedure = {
      id: data.nextProcedureId++,
      name: procedureData.name,
      category: procedureData.category || null,
      description: procedureData.description || null,
      indications: procedureData.indications || null,
      contraindications: procedureData.contraindications || null,
      steps: (procedureData.steps || []).map((step, index) => ({
        id: data.nextStepId++,
        step_number: index + 1,
        title: step.title || `Step ${index + 1}`,
        description: step.description || null,
        tips: step.tips || null,
        warnings: step.warnings || null
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.procedures.push(newProcedure);
    writeDB(data);
    return newProcedure.id;
  },

  // Update procedure
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
      steps: (procedureData.steps || []).map((step, idx) => ({
        id: data.nextStepId++,
        step_number: idx + 1,
        title: step.title || `Step ${idx + 1}`,
        description: step.description || null,
        tips: step.tips || null,
        warnings: step.warnings || null
      })),
      updated_at: new Date().toISOString()
    };

    writeDB(data);
    return true;
  },

  // Delete procedure
  deleteProcedure: (id) => {
    const data = readDB();
    const initialLength = data.procedures.length;
    data.procedures = data.procedures.filter(p => p.id !== parseInt(id));

    if (data.procedures.length === initialLength) return false;

    writeDB(data);
    return true;
  },

  // Get all unique categories
  getCategories: () => {
    const data = readDB();
    const categories = [...new Set(
      data.procedures
        .map(p => p.category)
        .filter(c => c !== null)
    )];
    return categories.sort();
  }
};

module.exports = db;
