// State
let procedures = [];
let currentProcedure = null;
let currentStepIndex = 0;
let editingId = null;

// DOM Elements
const proceduresList = document.getElementById('proceduresList');
const stepViewer = document.getElementById('stepViewer');
const procedureModal = document.getElementById('procedureModal');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadProcedures();
  loadCategories();

  // Search with debounce
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadProcedures, 300);
  });

  categoryFilter.addEventListener('change', loadProcedures);
});

// ============== API Functions ==============

async function loadProcedures() {
  const search = searchInput.value.trim();
  const category = categoryFilter.value;

  let url = '/api/procedures?';
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (category) url += `category=${encodeURIComponent(category)}`;

  try {
    const response = await fetch(url);
    procedures = await response.json();
    renderProcedures();
  } catch (error) {
    console.error('Error loading procedures:', error);
    proceduresList.innerHTML = '<p class="loading">Error loading procedures</p>';
  }
}

async function loadCategories() {
  try {
    const response = await fetch('/api/categories');
    const categories = await response.json();

    const datalist = document.getElementById('categoryList');
    datalist.innerHTML = categories.map(c => `<option value="${c}">`).join('');

    // Also update filter dropdown
    categoryFilter.innerHTML = '<option value="">All Categories</option>' +
      categories.map(c => `<option value="${c}">${c}</option>`).join('');
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

async function loadProcedure(id) {
  try {
    const response = await fetch(`/api/procedures/${id}`);
    currentProcedure = await response.json();
    currentStepIndex = 0;
    showStepViewer();
  } catch (error) {
    console.error('Error loading procedure:', error);
  }
}

async function saveProcedure(event) {
  event.preventDefault();

  const procedureData = {
    name: document.getElementById('name').value,
    category: document.getElementById('category').value || null,
    description: document.getElementById('description').value || null,
    indications: document.getElementById('indications').value || null,
    contraindications: document.getElementById('contraindications').value || null,
    steps: getStepsFromForm()
  };

  try {
    const url = editingId ? `/api/procedures/${editingId}` : '/api/procedures';
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(procedureData)
    });

    if (response.ok) {
      closeModal();
      loadProcedures();
      loadCategories();
    } else {
      const error = await response.json();
      alert(error.error || 'Error saving procedure');
    }
  } catch (error) {
    console.error('Error saving procedure:', error);
    alert('Error saving procedure');
  }
}

async function deleteProcedure(id, event) {
  event.stopPropagation();

  if (!confirm('Are you sure you want to delete this procedure?')) return;

  try {
    const response = await fetch(`/api/procedures/${id}`, { method: 'DELETE' });
    if (response.ok) {
      loadProcedures();
      loadCategories();
    }
  } catch (error) {
    console.error('Error deleting procedure:', error);
  }
}

// ============== Render Functions ==============

function renderProcedures() {
  if (procedures.length === 0) {
    proceduresList.innerHTML = `
      <div class="empty-state">
        <h3>No procedures found</h3>
        <p>Add your first procedure to get started!</p>
      </div>
    `;
    return;
  }

  proceduresList.innerHTML = procedures.map(proc => `
    <div class="procedure-card" onclick="loadProcedure(${proc.id})">
      <h3>${escapeHtml(proc.name)}</h3>
      ${proc.category ? `<span class="category">${escapeHtml(proc.category)}</span>` : ''}
      ${proc.description ? `<p class="description">${escapeHtml(proc.description)}</p>` : ''}
      <div class="card-actions">
        <button class="btn btn-secondary" onclick="editProcedure(${proc.id}, event)">Edit</button>
        <button class="btn btn-danger" onclick="deleteProcedure(${proc.id}, event)">Delete</button>
      </div>
    </div>
  `).join('');
}

function showStepViewer() {
  proceduresList.classList.add('hidden');
  stepViewer.classList.remove('hidden');

  document.getElementById('procedureTitle').textContent = currentProcedure.name;

  // Procedure info
  let infoHtml = '';
  if (currentProcedure.description) {
    infoHtml += `<p><strong>Description:</strong> ${escapeHtml(currentProcedure.description)}</p>`;
  }
  if (currentProcedure.indications) {
    infoHtml += `<p><strong>Indications:</strong> ${escapeHtml(currentProcedure.indications)}</p>`;
  }
  if (currentProcedure.contraindications) {
    infoHtml += `<p><strong>Contraindications:</strong> ${escapeHtml(currentProcedure.contraindications)}</p>`;
  }
  document.getElementById('procedureInfo').innerHTML = infoHtml || '<p>No additional information available.</p>';

  renderCurrentStep();
}

function renderCurrentStep() {
  const steps = currentProcedure.steps || [];

  if (steps.length === 0) {
    document.getElementById('stepContent').innerHTML = '<p>No steps have been added for this procedure yet.</p>';
    document.getElementById('stepIndicator').textContent = 'No steps';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('prevStep').disabled = true;
    document.getElementById('nextStep').disabled = true;
    return;
  }

  const step = steps[currentStepIndex];

  document.getElementById('stepIndicator').textContent = `Step ${currentStepIndex + 1} of ${steps.length}`;
  document.getElementById('stepTitle').textContent = step.title;
  document.getElementById('stepDescription').textContent = step.description || '';
  document.getElementById('stepTips').textContent = step.tips || '';
  document.getElementById('stepWarnings').textContent = step.warnings || '';

  // Update progress
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  document.getElementById('progressBar').style.width = `${progress}%`;

  // Update navigation buttons
  document.getElementById('prevStep').disabled = currentStepIndex === 0;
  document.getElementById('nextStep').disabled = currentStepIndex === steps.length - 1;
}

function closeStepViewer() {
  stepViewer.classList.add('hidden');
  proceduresList.classList.remove('hidden');
  currentProcedure = null;
  currentStepIndex = 0;
}

function prevStep() {
  if (currentStepIndex > 0) {
    currentStepIndex--;
    renderCurrentStep();
  }
}

function nextStep() {
  if (currentProcedure.steps && currentStepIndex < currentProcedure.steps.length - 1) {
    currentStepIndex++;
    renderCurrentStep();
  }
}

// ============== Modal Functions ==============

function openAddModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add New Procedure';
  document.getElementById('procedureForm').reset();
  document.getElementById('stepsContainer').innerHTML = '';
  addStepField(); // Add one empty step
  procedureModal.classList.remove('hidden');
}

async function editProcedure(id, event) {
  event.stopPropagation();

  try {
    const response = await fetch(`/api/procedures/${id}`);
    const proc = await response.json();

    editingId = id;
    document.getElementById('modalTitle').textContent = 'Edit Procedure';
    document.getElementById('procedureId').value = id;
    document.getElementById('name').value = proc.name || '';
    document.getElementById('category').value = proc.category || '';
    document.getElementById('description').value = proc.description || '';
    document.getElementById('indications').value = proc.indications || '';
    document.getElementById('contraindications').value = proc.contraindications || '';

    // Populate steps
    document.getElementById('stepsContainer').innerHTML = '';
    if (proc.steps && proc.steps.length > 0) {
      proc.steps.forEach(step => addStepField(step));
    } else {
      addStepField();
    }

    procedureModal.classList.remove('hidden');
  } catch (error) {
    console.error('Error loading procedure for edit:', error);
  }
}

function closeModal() {
  procedureModal.classList.add('hidden');
  editingId = null;
}

// ============== Step Form Functions ==============

let stepCounter = 0;

function addStepField(data = {}) {
  stepCounter++;
  const container = document.getElementById('stepsContainer');

  const stepHtml = `
    <div class="step-field" data-step="${stepCounter}">
      <button type="button" class="remove-step" onclick="removeStepField(${stepCounter})">&times;</button>
      <div class="step-number">Step ${container.children.length + 1}</div>
      <input type="text" placeholder="Step title" class="step-title" value="${escapeHtml(data.title || '')}" />
      <textarea placeholder="Step description" class="step-description" rows="2">${escapeHtml(data.description || '')}</textarea>
      <input type="text" placeholder="Tips (optional)" class="step-tips" value="${escapeHtml(data.tips || '')}" />
      <input type="text" placeholder="Warnings (optional)" class="step-warnings" value="${escapeHtml(data.warnings || '')}" />
    </div>
  `;

  container.insertAdjacentHTML('beforeend', stepHtml);
  renumberSteps();
}

function removeStepField(id) {
  const field = document.querySelector(`.step-field[data-step="${id}"]`);
  if (field) {
    field.remove();
    renumberSteps();
  }
}

function renumberSteps() {
  const steps = document.querySelectorAll('.step-field');
  steps.forEach((step, index) => {
    step.querySelector('.step-number').textContent = `Step ${index + 1}`;
  });
}

function getStepsFromForm() {
  const steps = [];
  document.querySelectorAll('.step-field').forEach(field => {
    const title = field.querySelector('.step-title').value.trim();
    if (title) {
      steps.push({
        title,
        description: field.querySelector('.step-description').value.trim(),
        tips: field.querySelector('.step-tips').value.trim(),
        warnings: field.querySelector('.step-warnings').value.trim()
      });
    }
  });
  return steps;
}

// ============== Utility Functions ==============

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modal on outside click
procedureModal.addEventListener('click', (e) => {
  if (e.target === procedureModal) {
    closeModal();
  }
});

// Keyboard navigation for steps
document.addEventListener('keydown', (e) => {
  if (!stepViewer.classList.contains('hidden')) {
    if (e.key === 'ArrowLeft') prevStep();
    if (e.key === 'ArrowRight') nextStep();
    if (e.key === 'Escape') closeStepViewer();
  }
  if (!procedureModal.classList.contains('hidden') && e.key === 'Escape') {
    closeModal();
  }
});
