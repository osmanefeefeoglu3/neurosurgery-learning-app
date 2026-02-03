// ============================================================
// Neurosurgery Learning App - Frontend Application
// ============================================================

// ==================== STATE VARIABLES ====================
let procedures = [];
let currentProcedure = null;
let currentStepIndex = 0;
let editingId = null;
let stepCounter = 0;

let currentUser = null;
let authToken = localStorage.getItem('authToken');
let authMode = 'login';

let caseLogs = [];
let editingCaseLogId = null;

let atlasRegions = [];
let currentRegion = null;
let currentSubregion = null;

let currentView = 'procedures';

// ==================== DOM REFERENCES ====================
const proceduresList = document.getElementById('proceduresList');
const stepViewer = document.getElementById('stepViewer');
const procedureModal = document.getElementById('procedureModal');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication state
  checkAuth();

  // Load initial data
  loadProcedures();
  loadCategories();

  // Search with 300ms debounce
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadProcedures, 300);
  });

  // Category filter
  categoryFilter.addEventListener('change', loadProcedures);

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.log('Service Worker registration failed:', err));
  }

  // Set today's date as default for case log date
  const clDateInput = document.getElementById('clDate');
  if (clDateInput) {
    clDateInput.value = new Date().toISOString().split('T')[0];
  }
});

// ==================== NAVIGATION ====================

function switchView(view) {
  currentView = view;

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Show selected view
  const viewEl = document.getElementById(view + 'View');
  if (viewEl) {
    viewEl.classList.add('active');
  }

  // Update nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });

  // Load data for active view
  if (view === 'procedures') {
    loadProcedures();
  } else if (view === 'caselogs') {
    if (currentUser) {
      loadCaseLogs();
      loadCaseLogStats();
    } else {
      const caselogList = document.getElementById('caselogList');
      if (caselogList) {
        caselogList.innerHTML = '<p class="empty-state">Please login to view your case logs.</p>';
      }
    }
  } else if (view === 'atlas') {
    loadAtlasRegions();
  }
}

// ==================== AUTH FUNCTIONS ====================

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = 'Bearer ' + authToken;
  }
  return headers;
}

function openAuthModal(mode) {
  authMode = mode || 'login';
  const modal = document.getElementById('authModal');
  const title = document.getElementById('authModalTitle');
  const submitBtn = document.getElementById('authSubmitBtn');
  const displayNameGroup = document.getElementById('displayNameGroup');
  const emailGroup = document.getElementById('emailGroup');
  const roleGroup = document.getElementById('roleGroup');
  const switchText = document.getElementById('authSwitchText');
  const errorEl = document.getElementById('authError');

  // Reset form
  document.getElementById('authForm').reset();
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  if (authMode === 'register') {
    title.textContent = 'Register';
    submitBtn.textContent = 'Register';
    displayNameGroup.style.display = 'block';
    emailGroup.style.display = 'block';
    roleGroup.style.display = 'block';
    switchText.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode(event)">Login</a>';
  } else {
    title.textContent = 'Login';
    submitBtn.textContent = 'Login';
    displayNameGroup.style.display = 'none';
    emailGroup.style.display = 'none';
    roleGroup.style.display = 'none';
    switchText.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode(event)">Register</a>';
  }

  modal.classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
  document.getElementById('authError').classList.add('hidden');
  document.getElementById('authForm').reset();
}

function toggleAuthMode(event) {
  if (event) event.preventDefault();
  authMode = authMode === 'login' ? 'register' : 'login';
  closeAuthModal();
  openAuthModal(authMode);
}

async function handleAuth(event) {
  event.preventDefault();

  const errorEl = document.getElementById('authError');
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value;

  if (!username || !password) {
    errorEl.textContent = 'Username and password are required.';
    errorEl.classList.remove('hidden');
    return;
  }

  const body = { username, password };

  if (authMode === 'register') {
    const displayName = document.getElementById('authDisplayName').value.trim();
    const email = document.getElementById('authEmail').value.trim();
    const role = document.getElementById('authRole').value;
    if (displayName) body.displayName = displayName;
    if (email) body.email = email;
    if (role) body.role = role;
  }

  const url = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      errorEl.textContent = data.error || 'Authentication failed.';
      errorEl.classList.remove('hidden');
      return;
    }

    // Store token and user
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', authToken);

    closeAuthModal();
    updateAuthUI();
    showToast('Welcome, ' + (currentUser.displayName || currentUser.username) + '!', 'success');

    // Reload current view data
    if (currentView === 'caselogs') {
      loadCaseLogs();
      loadCaseLogStats();
    }
  } catch (error) {
    console.error('Auth error:', error);
    errorEl.textContent = 'Network error. Please try again.';
    errorEl.classList.remove('hidden');
  }
}

async function checkAuth() {
  if (!authToken) {
    currentUser = null;
    updateAuthUI();
    return;
  }

  try {
    const response = await fetch('/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });

    if (response.ok) {
      const data = await response.json();
      currentUser = data.user || data;
      updateAuthUI();
    } else {
      // Token is invalid or expired
      authToken = null;
      currentUser = null;
      localStorage.removeItem('authToken');
      updateAuthUI();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    // Keep token for offline use but mark user as unknown
    updateAuthUI();
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  updateAuthUI();
  showToast('Logged out successfully.', 'success');

  if (currentView === 'caselogs') {
    switchView('procedures');
  }
}

function updateAuthUI() {
  const authArea = document.getElementById('authArea');

  if (currentUser) {
    const displayName = currentUser.displayName || currentUser.username || 'User';
    authArea.innerHTML = `
      <span class="user-info">Logged in as <strong>${escapeHtml(displayName)}</strong></span>
      <button class="btn btn-outline" onclick="logout()">Logout</button>
    `;
  } else {
    authArea.innerHTML = `
      <button class="btn btn-outline" onclick="openAuthModal('login')">Login</button>
      <button class="btn btn-outline" onclick="openAuthModal('register')">Register</button>
    `;
  }

  // Show/hide auth-required elements
  document.querySelectorAll('.auth-required').forEach(el => {
    if (currentUser) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

// ==================== PROCEDURES ====================

async function loadProcedures() {
  const search = searchInput.value.trim();
  const category = categoryFilter.value;

  let url = '/api/procedures?';
  if (search) url += 'search=' + encodeURIComponent(search) + '&';
  if (category) url += 'category=' + encodeURIComponent(category);

  try {
    const response = await fetch(url);
    procedures = await response.json();
    renderProcedures();
  } catch (error) {
    console.error('Error loading procedures:', error);
    proceduresList.innerHTML = '<p class="loading">Error loading procedures. Please try again.</p>';
  }
}

async function loadCategories() {
  try {
    const response = await fetch('/api/categories');
    const categories = await response.json();

    // Update datalist for procedure form
    const datalist = document.getElementById('categoryList');
    if (datalist) {
      datalist.innerHTML = categories.map(c => '<option value="' + escapeHtml(c) + '">').join('');
    }

    // Update filter dropdown
    categoryFilter.innerHTML = '<option value="">All Categories</option>' +
      categories.map(c => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

function renderProcedures() {
  if (procedures.length === 0) {
    proceduresList.innerHTML = '<div class="empty-state"><h3>No procedures found</h3><p>Add your first procedure to get started!</p></div>';
    return;
  }

  proceduresList.innerHTML = procedures.map(function(proc) {
    const thumbnailHtml = proc.thumbnail_url
      ? '<div class="card-thumbnail"><img src="' + escapeHtml(proc.thumbnail_url) + '" alt="' + escapeHtml(proc.name) + '" onerror="this.parentElement.style.display=\'none\'" /></div>'
      : '';

    const categoryHtml = proc.category
      ? '<span class="category">' + escapeHtml(proc.category) + '</span>'
      : '';

    const descHtml = proc.description
      ? '<p class="description">' + escapeHtml(proc.description) + '</p>'
      : '';

    const stepsCount = proc.steps ? proc.steps.length : 0;

    const actionsHtml = currentUser
      ? '<div class="card-actions">' +
          '<button class="btn btn-secondary" onclick="editProcedure(' + proc.id + ', event)">Edit</button>' +
          '<button class="btn btn-danger" onclick="deleteProcedure(' + proc.id + ', event)">Delete</button>' +
        '</div>'
      : '';

    return '<div class="procedure-card" onclick="loadProcedure(' + proc.id + ')">' +
      thumbnailHtml +
      '<h3>' + escapeHtml(proc.name) + '</h3>' +
      categoryHtml +
      descHtml +
      '<span class="step-count">' + stepsCount + ' steps</span>' +
      actionsHtml +
    '</div>';
  }).join('');
}

async function loadProcedure(id) {
  try {
    const response = await fetch('/api/procedures/' + id);
    if (!response.ok) {
      showToast('Error loading procedure.', 'error');
      return;
    }
    currentProcedure = await response.json();
    currentStepIndex = 0;
    showStepViewer();
  } catch (error) {
    console.error('Error loading procedure:', error);
    showToast('Error loading procedure.', 'error');
  }
}

function showStepViewer() {
  proceduresList.classList.add('hidden');
  document.querySelector('.search-bar').classList.add('hidden');
  stepViewer.classList.remove('hidden');

  document.getElementById('procedureTitle').textContent = currentProcedure.name;

  // Procedure info
  let infoHtml = '';
  if (currentProcedure.description) {
    infoHtml += '<p><strong>Description:</strong> ' + escapeHtml(currentProcedure.description) + '</p>';
  }
  if (currentProcedure.indications) {
    infoHtml += '<p><strong>Indications:</strong> ' + escapeHtml(currentProcedure.indications) + '</p>';
  }
  if (currentProcedure.contraindications) {
    infoHtml += '<p><strong>Contraindications:</strong> ' + escapeHtml(currentProcedure.contraindications) + '</p>';
  }
  document.getElementById('procedureInfo').innerHTML = infoHtml || '<p>No additional information available.</p>';

  renderCurrentStep();
}

function closeStepViewer() {
  stepViewer.classList.add('hidden');
  proceduresList.classList.remove('hidden');
  document.querySelector('.search-bar').classList.remove('hidden');
  currentProcedure = null;
  currentStepIndex = 0;
}

function renderCurrentStep() {
  const steps = currentProcedure.steps || [];

  if (steps.length === 0) {
    document.getElementById('stepContent').innerHTML = '<p>No steps have been added for this procedure yet.</p>';
    document.getElementById('stepIndicator').textContent = 'No steps';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('prevStep').disabled = true;
    document.getElementById('nextStep').disabled = true;
    document.getElementById('stepMedia').innerHTML = '';
    return;
  }

  const step = steps[currentStepIndex];

  document.getElementById('stepIndicator').textContent = 'Step ' + (currentStepIndex + 1) + ' of ' + steps.length;
  document.getElementById('stepTitle').textContent = step.title || '';
  document.getElementById('stepDescription').textContent = step.description || '';

  // Render tips
  const tipsEl = document.getElementById('stepTips');
  tipsEl.textContent = step.tips || '';

  // Render warnings
  const warningsEl = document.getElementById('stepWarnings');
  warningsEl.textContent = step.warnings || '';

  // Render media
  const mediaEl = document.getElementById('stepMedia');
  if (step.media && step.media.length > 0) {
    mediaEl.innerHTML = step.media.map(function(m) {
      if (m.type === 'video') {
        return '<div class="step-media-item">' +
          '<video controls preload="metadata" src="' + escapeHtml(m.url) + '"></video>' +
          (m.caption ? '<p class="media-caption">' + escapeHtml(m.caption) + '</p>' : '') +
        '</div>';
      } else {
        // Default to image
        return '<div class="step-media-item">' +
          '<img src="' + escapeHtml(m.url) + '" alt="' + escapeHtml(m.caption || 'Step image') + '" onclick="window.open(this.src, \'_blank\')" />' +
          (m.caption ? '<p class="media-caption">' + escapeHtml(m.caption) + '</p>' : '') +
        '</div>';
      }
    }).join('');
  } else {
    mediaEl.innerHTML = '';
  }

  // Update progress
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  document.getElementById('progressBar').style.width = progress + '%';

  // Update navigation buttons
  document.getElementById('prevStep').disabled = currentStepIndex === 0;
  document.getElementById('nextStep').disabled = currentStepIndex === steps.length - 1;
}

function prevStep() {
  if (currentStepIndex > 0) {
    currentStepIndex--;
    renderCurrentStep();
  }
}

function nextStep() {
  if (currentProcedure && currentProcedure.steps && currentStepIndex < currentProcedure.steps.length - 1) {
    currentStepIndex++;
    renderCurrentStep();
  }
}

// ==================== PROCEDURE MODAL ====================

function openAddModal() {
  if (!currentUser) {
    showToast('Please login first.', 'error');
    return;
  }

  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add New Procedure';
  document.getElementById('procedureForm').reset();
  document.getElementById('procedureId').value = '';
  document.getElementById('stepsContainer').innerHTML = '';
  stepCounter = 0;
  addStepField();
  procedureModal.classList.remove('hidden');
}

function closeModal() {
  procedureModal.classList.add('hidden');
  editingId = null;
}

async function editProcedure(id, event) {
  if (event) event.stopPropagation();

  if (!currentUser) {
    showToast('Please login first.', 'error');
    return;
  }

  try {
    const response = await fetch('/api/procedures/' + id);
    if (!response.ok) {
      showToast('Error loading procedure.', 'error');
      return;
    }
    const proc = await response.json();

    editingId = id;
    document.getElementById('modalTitle').textContent = 'Edit Procedure';
    document.getElementById('procedureId').value = id;
    document.getElementById('name').value = proc.name || '';
    document.getElementById('category').value = proc.category || '';
    document.getElementById('thumbnail_url').value = proc.thumbnail_url || '';
    document.getElementById('description').value = proc.description || '';
    document.getElementById('indications').value = proc.indications || '';
    document.getElementById('contraindications').value = proc.contraindications || '';

    // Populate steps
    document.getElementById('stepsContainer').innerHTML = '';
    stepCounter = 0;
    if (proc.steps && proc.steps.length > 0) {
      proc.steps.forEach(function(step) { addStepField(step); });
    } else {
      addStepField();
    }

    procedureModal.classList.remove('hidden');
  } catch (error) {
    console.error('Error loading procedure for edit:', error);
    showToast('Error loading procedure for editing.', 'error');
  }
}

async function saveProcedure(event) {
  event.preventDefault();

  if (!currentUser) {
    showToast('Please login first.', 'error');
    return;
  }

  const procedureData = {
    name: document.getElementById('name').value.trim(),
    category: document.getElementById('category').value.trim() || null,
    thumbnail_url: document.getElementById('thumbnail_url').value.trim() || null,
    description: document.getElementById('description').value.trim() || null,
    indications: document.getElementById('indications').value.trim() || null,
    contraindications: document.getElementById('contraindications').value.trim() || null,
    steps: getStepsFromForm()
  };

  if (!procedureData.name) {
    showToast('Procedure name is required.', 'error');
    return;
  }

  try {
    const url = editingId ? '/api/procedures/' + editingId : '/api/procedures';
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: authHeaders(),
      body: JSON.stringify(procedureData)
    });

    if (response.status === 401) {
      showToast('Please login first.', 'error');
      return;
    }

    if (response.ok) {
      closeModal();
      loadProcedures();
      loadCategories();
      showToast(editingId ? 'Procedure updated successfully.' : 'Procedure added successfully.', 'success');
    } else {
      const errorData = await response.json();
      showToast(errorData.error || 'Error saving procedure.', 'error');
    }
  } catch (error) {
    console.error('Error saving procedure:', error);
    showToast('Error saving procedure.', 'error');
  }
}

async function deleteProcedure(id, event) {
  if (event) event.stopPropagation();

  if (!currentUser) {
    showToast('Please login first.', 'error');
    return;
  }

  if (!confirm('Are you sure you want to delete this procedure?')) return;

  try {
    const response = await fetch('/api/procedures/' + id, {
      method: 'DELETE',
      headers: authHeaders()
    });

    if (response.status === 401) {
      showToast('Please login first.', 'error');
      return;
    }

    if (response.ok) {
      loadProcedures();
      loadCategories();
      showToast('Procedure deleted.', 'success');
    } else {
      const errorData = await response.json();
      showToast(errorData.error || 'Error deleting procedure.', 'error');
    }
  } catch (error) {
    console.error('Error deleting procedure:', error);
    showToast('Error deleting procedure.', 'error');
  }
}

// ==================== STEP FORM WITH MEDIA ====================

function addStepField(data) {
  if (!data) data = {};
  stepCounter++;
  const container = document.getElementById('stepsContainer');
  const stepId = stepCounter;
  const stepNum = container.children.length + 1;

  // Build media HTML if data has media
  let mediaHtml = '';
  if (data.media && data.media.length > 0) {
    data.media.forEach(function(m, idx) {
      mediaHtml += buildMediaFieldHtml(stepId, idx, m);
    });
  }

  const stepHtml = '<div class="step-field" data-step="' + stepId + '">' +
    '<button type="button" class="remove-step" onclick="removeStepField(' + stepId + ')">&times;</button>' +
    '<div class="step-number">Step ' + stepNum + '</div>' +
    '<input type="text" placeholder="Step title" class="step-title" value="' + escapeHtml(data.title || '') + '" />' +
    '<textarea placeholder="Step description" class="step-description" rows="2">' + escapeHtml(data.description || '') + '</textarea>' +
    '<input type="text" placeholder="Tips (optional)" class="step-tips-input" value="' + escapeHtml(data.tips || '') + '" />' +
    '<input type="text" placeholder="Warnings (optional)" class="step-warnings-input" value="' + escapeHtml(data.warnings || '') + '" />' +
    '<div class="step-media-fields" data-step-media="' + stepId + '">' + mediaHtml + '</div>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="addMediaField(' + stepId + ')">+ Add Media</button>' +
  '</div>';

  container.insertAdjacentHTML('beforeend', stepHtml);
  renumberSteps();
}

function buildMediaFieldHtml(stepId, index, data) {
  if (!data) data = {};
  const typeSelect =
    '<select class="media-type">' +
      '<option value="image"' + (data.type === 'image' || !data.type ? ' selected' : '') + '>Image</option>' +
      '<option value="video"' + (data.type === 'video' ? ' selected' : '') + '>Video</option>' +
    '</select>';

  return '<div class="media-field-entry">' +
    typeSelect +
    '<input type="url" class="media-url" placeholder="Media URL" value="' + escapeHtml(data.url || '') + '" />' +
    '<input type="text" class="media-caption" placeholder="Caption (optional)" value="' + escapeHtml(data.caption || '') + '" />' +
    '<button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">Remove</button>' +
  '</div>';
}

function addMediaField(stepId) {
  const container = document.querySelector('[data-step-media="' + stepId + '"]');
  if (!container) return;
  const html = buildMediaFieldHtml(stepId, container.children.length, {});
  container.insertAdjacentHTML('beforeend', html);
}

function removeStepField(id) {
  const field = document.querySelector('.step-field[data-step="' + id + '"]');
  if (field) {
    field.remove();
    renumberSteps();
  }
}

function renumberSteps() {
  const steps = document.querySelectorAll('.step-field');
  steps.forEach(function(step, index) {
    var numEl = step.querySelector('.step-number');
    if (numEl) numEl.textContent = 'Step ' + (index + 1);
  });
}

function getStepsFromForm() {
  var steps = [];
  document.querySelectorAll('.step-field').forEach(function(field) {
    var title = field.querySelector('.step-title').value.trim();
    if (title) {
      // Collect media for this step
      var media = [];
      var mediaEntries = field.querySelectorAll('.media-field-entry');
      mediaEntries.forEach(function(entry) {
        var url = entry.querySelector('.media-url').value.trim();
        if (url) {
          media.push({
            type: entry.querySelector('.media-type').value,
            url: url,
            caption: entry.querySelector('.media-caption').value.trim()
          });
        }
      });

      steps.push({
        title: title,
        description: field.querySelector('.step-description').value.trim(),
        tips: field.querySelector('.step-tips-input').value.trim(),
        warnings: field.querySelector('.step-warnings-input').value.trim(),
        media: media
      });
    }
  });
  return steps;
}

// ==================== CASE LOGS ====================

async function loadCaseLogs() {
  if (!currentUser) {
    const caselogList = document.getElementById('caselogList');
    if (caselogList) {
      caselogList.innerHTML = '<p class="empty-state">Please login to view your case logs.</p>';
    }
    return;
  }

  try {
    const response = await fetch('/api/caselogs', {
      headers: authHeaders()
    });

    if (response.status === 401) {
      showToast('Please login first.', 'error');
      return;
    }

    if (response.ok) {
      caseLogs = await response.json();
      renderCaseLogs();
      populateProcedureNameList();
    } else {
      showToast('Error loading case logs.', 'error');
    }
  } catch (error) {
    console.error('Error loading case logs:', error);
    showToast('Error loading case logs.', 'error');
  }
}

async function loadCaseLogStats() {
  if (!currentUser) return;

  try {
    const response = await fetch('/api/caselogs/stats', {
      headers: authHeaders()
    });

    if (response.ok) {
      const stats = await response.json();
      document.getElementById('statTotal').textContent = stats.totalCases || 0;
      document.getElementById('statHours').textContent = stats.totalHours || 0;
      document.getElementById('statPrimary').textContent = stats.asPrimary || 0;
      document.getElementById('statAssistant').textContent = stats.asAssistant || 0;
    }
  } catch (error) {
    console.error('Error loading case log stats:', error);
  }
}

function getRoleBadgeClass(role) {
  switch (role) {
    case 'observer': return 'badge-gray';
    case 'assistant': return 'badge-green';
    case 'primary_surgeon': return 'badge-blue';
    case 'teaching': return 'badge-purple';
    default: return 'badge-gray';
  }
}

function formatRoleLabel(role) {
  switch (role) {
    case 'observer': return 'Observer';
    case 'assistant': return 'Assistant';
    case 'primary_surgeon': return 'Primary Surgeon';
    case 'teaching': return 'Teaching';
    default: return role || 'N/A';
  }
}

function renderCaseLogs() {
  var caselogList = document.getElementById('caselogList');
  if (!caselogList) return;

  // Apply search filter
  var searchVal = document.getElementById('caselogSearch') ? document.getElementById('caselogSearch').value.trim().toLowerCase() : '';
  var filtered = caseLogs;
  if (searchVal) {
    filtered = caseLogs.filter(function(cl) {
      return (cl.procedureName && cl.procedureName.toLowerCase().includes(searchVal)) ||
             (cl.diagnosis && cl.diagnosis.toLowerCase().includes(searchVal)) ||
             (cl.hospital && cl.hospital.toLowerCase().includes(searchVal)) ||
             (cl.supervisor && cl.supervisor.toLowerCase().includes(searchVal)) ||
             (cl.notes && cl.notes.toLowerCase().includes(searchVal));
    });
  }

  if (filtered.length === 0) {
    caselogList.innerHTML = '<div class="empty-state"><h3>No case logs found</h3><p>Log your first surgical case to start tracking.</p></div>';
    return;
  }

  caselogList.innerHTML = filtered.map(function(cl) {
    var badgeClass = getRoleBadgeClass(cl.role);
    var roleLabel = formatRoleLabel(cl.role);
    var dateStr = cl.date ? new Date(cl.date).toLocaleDateString() : '';
    var durationStr = cl.duration ? cl.duration + ' min' : '';

    return '<div class="caselog-card">' +
      '<div class="caselog-card-header">' +
        '<h3>' + escapeHtml(cl.procedureName || 'Unnamed Procedure') + '</h3>' +
        '<span class="role-badge ' + badgeClass + '">' + roleLabel + '</span>' +
      '</div>' +
      '<div class="caselog-card-body">' +
        (dateStr ? '<span class="caselog-meta"><strong>Date:</strong> ' + dateStr + '</span>' : '') +
        (durationStr ? '<span class="caselog-meta"><strong>Duration:</strong> ' + durationStr + '</span>' : '') +
        (cl.hospital ? '<span class="caselog-meta"><strong>Hospital:</strong> ' + escapeHtml(cl.hospital) + '</span>' : '') +
        (cl.supervisor ? '<span class="caselog-meta"><strong>Supervisor:</strong> ' + escapeHtml(cl.supervisor) + '</span>' : '') +
        (cl.diagnosis ? '<span class="caselog-meta"><strong>Diagnosis:</strong> ' + escapeHtml(cl.diagnosis) + '</span>' : '') +
        (cl.outcome ? '<span class="caselog-meta"><strong>Outcome:</strong> ' + escapeHtml(cl.outcome) + '</span>' : '') +
        (cl.complications ? '<span class="caselog-meta"><strong>Complications:</strong> ' + escapeHtml(cl.complications) + '</span>' : '') +
        (cl.patientAge ? '<span class="caselog-meta"><strong>Patient:</strong> ' + cl.patientAge + ' y/o' + (cl.patientSex ? ' ' + cl.patientSex : '') + '</span>' : '') +
        (cl.notes ? '<p class="caselog-notes">' + escapeHtml(cl.notes) + '</p>' : '') +
      '</div>' +
      '<div class="caselog-card-actions">' +
        '<button class="btn btn-secondary btn-sm" onclick="editCaseLog(\'' + cl.id + '\')">Edit</button>' +
        '<button class="btn btn-danger btn-sm" onclick="deleteCaseLog(\'' + cl.id + '\')">Delete</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function populateProcedureNameList() {
  var datalist = document.getElementById('procedureNameList');
  if (!datalist) return;
  datalist.innerHTML = procedures.map(function(p) {
    return '<option value="' + escapeHtml(p.name) + '">';
  }).join('');
}

function openCaseLogModal() {
  if (!currentUser) {
    showToast('Please login first.', 'error');
    return;
  }

  editingCaseLogId = null;
  document.getElementById('caseLogModalTitle').textContent = 'Log New Case';
  document.getElementById('caseLogForm').reset();
  document.getElementById('caseLogId').value = '';
  document.getElementById('clProcedureId').value = '';

  // Set today's date
  document.getElementById('clDate').value = new Date().toISOString().split('T')[0];

  // Populate procedure name suggestions
  populateProcedureNameList();

  document.getElementById('caseLogModal').classList.remove('hidden');
}

function closeCaseLogModal() {
  document.getElementById('caseLogModal').classList.add('hidden');
  editingCaseLogId = null;
}

function openCaseLogFromProcedure() {
  if (!currentUser) {
    showToast('Please login first.', 'error');
    return;
  }

  openCaseLogModal();

  // Pre-fill from current procedure
  if (currentProcedure) {
    document.getElementById('clProcedureName').value = currentProcedure.name || '';
    document.getElementById('clProcedureId').value = currentProcedure.id || '';
  }
}

async function editCaseLog(id) {
  if (!currentUser) {
    showToast('Please login first.', 'error');
    return;
  }

  var cl = caseLogs.find(function(c) { return String(c.id) === String(id); });
  if (!cl) {
    showToast('Case log not found.', 'error');
    return;
  }

  editingCaseLogId = id;
  document.getElementById('caseLogModalTitle').textContent = 'Edit Case Log';
  document.getElementById('caseLogId').value = id;
  document.getElementById('clProcedureName').value = cl.procedureName || '';
  document.getElementById('clProcedureId').value = cl.procedureId || '';
  document.getElementById('clDate').value = cl.date ? cl.date.split('T')[0] : '';
  document.getElementById('clRole').value = cl.role || 'observer';
  document.getElementById('clDuration').value = cl.duration || '';
  document.getElementById('clSupervisor').value = cl.supervisor || '';
  document.getElementById('clHospital').value = cl.hospital || '';
  document.getElementById('clPatientAge').value = cl.patientAge || '';
  document.getElementById('clPatientSex').value = cl.patientSex || '';
  document.getElementById('clDiagnosis').value = cl.diagnosis || '';
  document.getElementById('clOutcome').value = cl.outcome || '';
  document.getElementById('clComplications').value = cl.complications || '';
  document.getElementById('clNotes').value = cl.notes || '';

  populateProcedureNameList();
  document.getElementById('caseLogModal').classList.remove('hidden');
}

async function saveCaseLog(event) {
  event.preventDefault();

  if (!currentUser) {
    showToast('Please login first.', 'error');
    return;
  }

  var caseLogData = {
    procedureName: document.getElementById('clProcedureName').value.trim(),
    procedureId: document.getElementById('clProcedureId').value.trim() || null,
    date: document.getElementById('clDate').value,
    role: document.getElementById('clRole').value,
    duration: parseInt(document.getElementById('clDuration').value) || null,
    supervisor: document.getElementById('clSupervisor').value.trim() || null,
    hospital: document.getElementById('clHospital').value.trim() || null,
    patientAge: parseInt(document.getElementById('clPatientAge').value) || null,
    patientSex: document.getElementById('clPatientSex').value || null,
    diagnosis: document.getElementById('clDiagnosis').value.trim() || null,
    outcome: document.getElementById('clOutcome').value.trim() || null,
    complications: document.getElementById('clComplications').value.trim() || null,
    notes: document.getElementById('clNotes').value.trim() || null
  };

  if (!caseLogData.procedureName) {
    showToast('Procedure name is required.', 'error');
    return;
  }

  if (!caseLogData.date) {
    showToast('Date is required.', 'error');
    return;
  }

  try {
    var url = editingCaseLogId ? '/api/caselogs/' + editingCaseLogId : '/api/caselogs';
    var method = editingCaseLogId ? 'PUT' : 'POST';

    var response = await fetch(url, {
      method: method,
      headers: authHeaders(),
      body: JSON.stringify(caseLogData)
    });

    if (response.status === 401) {
      showToast('Please login first.', 'error');
      return;
    }

    if (response.ok) {
      closeCaseLogModal();
      loadCaseLogs();
      loadCaseLogStats();
      showToast(editingCaseLogId ? 'Case log updated.' : 'Case log saved.', 'success');
    } else {
      var errorData = await response.json();
      showToast(errorData.error || 'Error saving case log.', 'error');
    }
  } catch (error) {
    console.error('Error saving case log:', error);
    showToast('Error saving case log.', 'error');
  }
}

async function deleteCaseLog(id) {
  if (!currentUser) {
    showToast('Please login first.', 'error');
    return;
  }

  if (!confirm('Are you sure you want to delete this case log?')) return;

  try {
    var response = await fetch('/api/caselogs/' + id, {
      method: 'DELETE',
      headers: authHeaders()
    });

    if (response.status === 401) {
      showToast('Please login first.', 'error');
      return;
    }

    if (response.ok) {
      loadCaseLogs();
      loadCaseLogStats();
      showToast('Case log deleted.', 'success');
    } else {
      var errorData = await response.json();
      showToast(errorData.error || 'Error deleting case log.', 'error');
    }
  } catch (error) {
    console.error('Error deleting case log:', error);
    showToast('Error deleting case log.', 'error');
  }
}

// Case log search handler (with debounce)
(function() {
  var caselogSearchInput = document.getElementById('caselogSearch');
  if (caselogSearchInput) {
    var caselogSearchTimeout;
    caselogSearchInput.addEventListener('input', function() {
      clearTimeout(caselogSearchTimeout);
      caselogSearchTimeout = setTimeout(renderCaseLogs, 300);
    });
  }
})();

// ==================== ANATOMY ATLAS ====================

async function loadAtlasRegions() {
  try {
    var response = await fetch('/api/atlas/regions');
    if (response.ok) {
      atlasRegions = await response.json();
      renderAtlasRegions();
    } else {
      document.getElementById('atlasRegionList').innerHTML = '<p class="loading">Error loading atlas regions.</p>';
    }
  } catch (error) {
    console.error('Error loading atlas regions:', error);
    document.getElementById('atlasRegionList').innerHTML = '<p class="loading">Error loading atlas regions.</p>';
  }
}

function renderAtlasRegions() {
  var regionList = document.getElementById('atlasRegionList');
  if (!regionList) return;

  if (!atlasRegions || atlasRegions.length === 0) {
    regionList.innerHTML = '<p class="empty-state">No anatomy regions available.</p>';
    return;
  }

  regionList.innerHTML = atlasRegions.map(function(region) {
    var subregionsHtml = '';
    if (region.subregions && region.subregions.length > 0) {
      subregionsHtml = '<ul class="atlas-subregion-list hidden" id="subregions-' + region.id + '">' +
        region.subregions.map(function(sub) {
          return '<li class="atlas-subregion-item" onclick="loadSubregion(\'' + region.id + '\', \'' + sub.id + '\')">' +
            escapeHtml(sub.name) +
          '</li>';
        }).join('') +
      '</ul>';
    }

    return '<div class="atlas-region-group">' +
      '<div class="atlas-region-header" onclick="toggleAtlasRegion(\'' + region.id + '\')">' +
        '<span class="atlas-region-toggle" id="toggle-' + region.id + '">&#9654;</span> ' +
        escapeHtml(region.name) +
      '</div>' +
      subregionsHtml +
    '</div>';
  }).join('');
}

function toggleAtlasRegion(regionId) {
  var subList = document.getElementById('subregions-' + regionId);
  var toggle = document.getElementById('toggle-' + regionId);
  if (subList) {
    var isHidden = subList.classList.contains('hidden');
    subList.classList.toggle('hidden');
    if (toggle) {
      toggle.innerHTML = isHidden ? '&#9660;' : '&#9654;';
    }
  }
}

async function loadSubregion(regionId, subregionId) {
  currentRegion = regionId;
  currentSubregion = subregionId;

  // Highlight active subregion
  document.querySelectorAll('.atlas-subregion-item').forEach(function(el) {
    el.classList.remove('active');
  });
  // Find and highlight the clicked item
  var allSubs = document.querySelectorAll('.atlas-subregion-item');
  allSubs.forEach(function(el) {
    if (el.onclick && el.textContent) {
      // Re-apply active state via attribute
    }
  });

  try {
    var response = await fetch('/api/atlas/regions/' + regionId + '/' + subregionId);
    if (response.ok) {
      var data = await response.json();
      renderAtlasDetail(data);
    } else {
      document.getElementById('atlasDetail').innerHTML = '<p class="loading">Error loading anatomy data.</p>';
    }
  } catch (error) {
    console.error('Error loading subregion:', error);
    document.getElementById('atlasDetail').innerHTML = '<p class="loading">Error loading anatomy data.</p>';
  }
}

function renderAtlasDetail(data) {
  var detail = document.getElementById('atlasDetail');
  if (!detail) return;

  var html = '<div class="atlas-detail-content">';

  // Title
  html += '<h2>' + escapeHtml(data.name || 'Anatomy Region') + '</h2>';

  // Description
  if (data.description) {
    html += '<div class="atlas-description"><p>' + escapeHtml(data.description) + '</p></div>';
  }

  // Key structures
  if (data.keyStructures && data.keyStructures.length > 0) {
    html += '<div class="atlas-section"><h3>Key Structures</h3><div class="atlas-tags">';
    data.keyStructures.forEach(function(struct) {
      html += '<span class="atlas-tag">' + escapeHtml(struct) + '</span>';
    });
    html += '</div></div>';
  }

  // Clinical relevance
  if (data.clinicalRelevance) {
    html += '<div class="atlas-section"><h3>Clinical Relevance</h3><p>' + escapeHtml(data.clinicalRelevance) + '</p></div>';
  }

  // Images
  if (data.images && data.images.length > 0) {
    html += '<div class="atlas-section"><h3>Images</h3><div class="atlas-images">';
    data.images.forEach(function(img) {
      html += '<div class="atlas-image-item">' +
        '<img src="' + escapeHtml(img.url) + '" alt="' + escapeHtml(img.label || '') + '" onclick="window.open(this.src, \'_blank\')" />' +
        (img.label ? '<p class="atlas-image-label">' + escapeHtml(img.label) + '</p>' : '') +
      '</div>';
    });
    html += '</div></div>';
  }

  // Related procedures
  if (data.relatedProcedures && data.relatedProcedures.length > 0) {
    html += '<div class="atlas-section"><h3>Related Procedures</h3><ul class="atlas-related">';
    data.relatedProcedures.forEach(function(proc) {
      if (proc.id) {
        html += '<li><a href="#" onclick="switchView(\'procedures\'); loadProcedure(' + proc.id + '); return false;">' + escapeHtml(proc.name) + '</a></li>';
      } else {
        html += '<li>' + escapeHtml(proc.name || proc) + '</li>';
      }
    });
    html += '</ul></div>';
  }

  html += '</div>';
  detail.innerHTML = html;
}

// Atlas search with debounce
var atlasSearchTimeout;
function searchAtlas() {
  clearTimeout(atlasSearchTimeout);
  atlasSearchTimeout = setTimeout(performAtlasSearch, 300);
}

async function performAtlasSearch() {
  var searchInput = document.getElementById('atlasSearch');
  var resultsContainer = document.getElementById('atlasSearchResults');
  if (!searchInput || !resultsContainer) return;

  var query = searchInput.value.trim();
  if (!query) {
    resultsContainer.classList.add('hidden');
    resultsContainer.innerHTML = '';
    return;
  }

  try {
    var response = await fetch('/api/atlas/search?q=' + encodeURIComponent(query));
    if (response.ok) {
      var results = await response.json();
      renderAtlasSearchResults(results);
    } else {
      resultsContainer.innerHTML = '<p class="loading">Search failed.</p>';
      resultsContainer.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error searching atlas:', error);
    resultsContainer.innerHTML = '<p class="loading">Search error.</p>';
    resultsContainer.classList.remove('hidden');
  }
}

function renderAtlasSearchResults(results) {
  var resultsContainer = document.getElementById('atlasSearchResults');
  if (!resultsContainer) return;

  if (!results || results.length === 0) {
    resultsContainer.innerHTML = '<p class="atlas-search-empty">No results found.</p>';
    resultsContainer.classList.remove('hidden');
    return;
  }

  resultsContainer.innerHTML = results.map(function(r) {
    return '<div class="atlas-search-item" onclick="loadSubregion(\'' + escapeHtml(r.regionId) + '\', \'' + escapeHtml(r.subregionId || r.id) + '\')">' +
      '<strong>' + escapeHtml(r.name) + '</strong>' +
      (r.regionName ? '<span class="atlas-search-region">' + escapeHtml(r.regionName) + '</span>' : '') +
    '</div>';
  }).join('');

  resultsContainer.classList.remove('hidden');
}

// ==================== UTILITY FUNCTIONS ====================

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function showToast(message, type) {
  var toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = 'toast';
  if (type === 'error') {
    toast.classList.add('toast-error');
  } else {
    toast.classList.add('toast-success');
  }
  toast.classList.remove('hidden');

  // Auto-hide after 3 seconds
  clearTimeout(toast._hideTimeout);
  toast._hideTimeout = setTimeout(function() {
    toast.classList.add('hidden');
  }, 3000);
}

// ==================== EVENT LISTENERS ====================

// Close modals on outside click
procedureModal.addEventListener('click', function(e) {
  if (e.target === procedureModal) {
    closeModal();
  }
});

document.getElementById('authModal').addEventListener('click', function(e) {
  if (e.target === document.getElementById('authModal')) {
    closeAuthModal();
  }
});

document.getElementById('caseLogModal').addEventListener('click', function(e) {
  if (e.target === document.getElementById('caseLogModal')) {
    closeCaseLogModal();
  }
});

// Keyboard navigation
document.addEventListener('keydown', function(e) {
  // Arrow keys for step navigation
  if (!stepViewer.classList.contains('hidden')) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevStep();
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextStep();
    }
    if (e.key === 'Escape') {
      closeStepViewer();
      return;
    }
  }

  // Escape to close modals
  if (e.key === 'Escape') {
    if (!procedureModal.classList.contains('hidden')) {
      closeModal();
    }
    if (!document.getElementById('authModal').classList.contains('hidden')) {
      closeAuthModal();
    }
    if (!document.getElementById('caseLogModal').classList.contains('hidden')) {
      closeCaseLogModal();
    }
  }
});
